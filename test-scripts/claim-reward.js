const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 配置参数
const WALLET_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PROPERTY_TOKEN_ADDRESS = "0xb7E2f5cd15710101d88aB12C5826c8668c0Cb9d0";
const REWARD_MANAGER_ADDRESS = process.env.CONTRACT_REWARDMANAGER_ADDRESS;
const USDT_ADDRESS = process.env.CONTRACT_TESTTOKEN_ADDRESS;
const DISTRIBUTION_ID = 5;
const MERKLE_ROOT = "0x45390d6827f4aa8fd9df820ffe5dc082a0e6cd03b65d583814923c3745e3ab59";
const PRIVATE_KEY = process.env.INVESTOR_PRIVATE_KEY; // 钱包私钥

// 加载 ABI
function loadAbiFromArtifacts(contractName) {
  try {
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactContent);
    return artifact.abi;
  } catch (error) {
    console.error(`[ERROR] 加载 ${contractName} ABI失败: ${error.message}`);
    return null;
  }
}

// MerkleTree 辅助类
class MerkleTree {
  constructor(elements) {
    this.elements = elements;
    this.leaves = elements.map(element => this.hashLeaf(element));
    this.layers = this.buildLayers(this.leaves);
  }
  hashLeaf(element) {
    return ethers.keccak256(
      ethers.solidityPacked(['address', 'uint256'], [element.address, element.totalEligible])
    );
  }
  buildLayers(elements) {
    const layers = [elements];
    while (layers[layers.length - 1].length > 1) {
      const layer = [];
      for (let i = 0; i < layers[layers.length - 1].length; i += 2) {
        const left = layers[layers.length - 1][i];
        const right = i + 1 < layers[layers.length - 1].length ? layers[layers.length - 1][i + 1] : left;
        layer.push(this.hashPair(left, right));
      }
      layers.push(layer);
    }
    return layers;
  }
  hashPair(left, right) {
    const [first, second] = [left, right].sort();
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [first, second])
    );
  }
  getRoot() {
    return this.layers[this.layers.length - 1][0];
  }
  getProof(element) {
    const leaf = this.hashLeaf(element);
    const index = this.leaves.indexOf(leaf);
    if (index === -1) throw new Error('Element not found in tree');
    if (this.leaves.length === 1) return [];
    const proof = [];
    let currentIndex = index;
    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      if (siblingIndex < layer.length) {
        proof.push(layer[siblingIndex]);
      }
      currentIndex = Math.floor(currentIndex / 2);
    }
    return proof;
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL || 'http://localhost:8545');
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // 加载 ABI
  const propertyTokenAbi = loadAbiFromArtifacts('PropertyToken');
  const rewardManagerAbi = loadAbiFromArtifacts('RewardManager');
  if (!propertyTokenAbi || !rewardManagerAbi) {
    console.error('[ERROR] ABI 加载失败');
    return;
  }

  const propertyToken = new ethers.Contract(PROPERTY_TOKEN_ADDRESS, propertyTokenAbi, wallet);
  const rewardManager = new ethers.Contract(REWARD_MANAGER_ADDRESS, rewardManagerAbi, wallet);

  // 查询余额和总供应量
  const balance = await propertyToken.balanceOf(WALLET_ADDRESS);
  const totalSupply = await propertyToken.totalSupply();
  const decimals = await propertyToken.decimals();

  // 查询分配信息
  const distribution = await rewardManager.getDistribution(DISTRIBUTION_ID);
  const totalAmount = distribution[8]; // 分配总金额

  // 计算可领取金额
  const eligibleAmount = (BigInt(totalAmount.toString()) * BigInt(balance.toString())) / BigInt(totalSupply.toString());

  // 构造 MerkleTree
  const merkleData = { address: WALLET_ADDRESS, totalEligible: eligibleAmount };
  const merkleTree = new MerkleTree([merkleData]);
  const merkleRoot = merkleTree.getRoot();
  const merkleProof = merkleTree.getProof(merkleData);

  console.log(`[INFO] 钱包: ${WALLET_ADDRESS}`);
  console.log(`[INFO] 资产合约: ${PROPERTY_TOKEN_ADDRESS}`);
  console.log(`[INFO] 分配ID: ${DISTRIBUTION_ID}`);
  console.log(`[INFO] 资产余额: ${ethers.formatUnits(balance, decimals)}`);
  console.log(`[INFO] 总供应量: ${ethers.formatUnits(totalSupply, decimals)}`);
  console.log(`[INFO] 分配总金额: ${ethers.formatUnits(totalAmount, 18)}`);
  console.log(`[INFO] 可领取金额: ${ethers.formatUnits(eligibleAmount, 18)}`);
  console.log(`[INFO] 生成的默克尔根: ${merkleRoot}`);
  console.log(`[INFO] 目标默克尔根: ${MERKLE_ROOT}`);
  console.log(`[INFO] Merkle Proof:`, merkleProof);

  // 验证 proof
  const isValid = await rewardManager.verifyMerkleProof(
    DISTRIBUTION_ID,
    WALLET_ADDRESS,
    eligibleAmount,
    merkleProof
  );
  console.log(`[INFO] 合约验证 proof 结果: ${isValid}`);

  if (!isValid) {
    console.error('[ERROR] Merkle proof 验证失败，无法领取');
    return;
  }

  // 查询领取前 USDT 余额
  const usdtAbi = loadAbiFromArtifacts('SimpleERC20');
  const usdt = new ethers.Contract(USDT_ADDRESS, usdtAbi, wallet);
  const before = await usdt.balanceOf(WALLET_ADDRESS);
  console.log(`[INFO] 领取前 USDT 余额: ${ethers.formatUnits(before, 18)}`);

  // 调用领取
  const tx = await rewardManager.withdraw(
    DISTRIBUTION_ID,
    WALLET_ADDRESS,
    eligibleAmount,
    totalAmount,
    merkleProof
  );
  await tx.wait();
  console.log(`[SUCCESS] 领取收益成功，交易哈希: ${tx.hash}`);

  // 查询领取后 USDT 余额
  const after = await usdt.balanceOf(WALLET_ADDRESS);
  console.log(`[INFO] 领取后 USDT 余额: ${ethers.formatUnits(after, 18)}`);
}

main().catch(err => {
  console.error('[ERROR]', err);
});
