const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 配置参数
const WALLET_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PROPERTY_TOKEN_ADDRESS = "0xf18aC912d78E8760ddc8C323c23e77aCbd87DE44";
const REWARD_MANAGER_ADDRESS = process.env.CONTRACT_REWARDMANAGER_ADDRESS;
const USDT_ADDRESS = process.env.CONTRACT_TESTTOKEN_ADDRESS;
const DISTRIBUTION_ID = 19;
const MERKLE_ROOT = "0x19a850aa63586500ed823d9fa21e95fe11ce7c3deb94244996bfa7df08983cdf";
const PRIVATE_KEY = process.env.INVESTOR_PRIVATE_KEY; // 钱包私钥
const SYSTEM_ADDRESS = process.env.CONTRACT_REALESTATESYSTEM_ADDRESS;
const PROPERTY_MANAGER_ADDRESS = process.env.CONTRACT_PROPERTYMANAGER_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;



// 日志工具
const log = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  balance: (token, amount) => console.log(`[BALANCE] ${token}: ${amount}`),
  step: (step, message) => console.log(`[STEP ${step}] ${message}`)
};

// 加载 ABI
function loadAbiFromArtifacts(contractName) {
  try {
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactContent);
    return artifact.abi;
  } catch (error) {
    log.error(`加载 ${contractName} ABI失败: ${error.message}`);
    return null;
  }
}

// 获取合约实例
async function getContract(contractName, address, wallet) {
  try {
    if (!address) {
      log.error(`${contractName} 地址未设置`);
      return null;
    }

    const abi = loadAbiFromArtifacts(contractName);
    if (!abi) {
      log.error(`${contractName} ABI未找到`);
      return null;
    }

    // 在本地测试网络上，直接使用合约地址
    const contract = new ethers.Contract(address, abi, wallet);
    
    // 验证合约是否有效
    try {
      await contract.getAddress();
      return contract;
    } catch (error) {
      log.error(`合约 ${contractName} 地址无效: ${error.message}`);
      return null;
    }
  } catch (error) {
    log.error(`创建 ${contractName} 合约实例失败: ${error.message}`);
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

/**
 * 购买房产代币
 * @param {string} propertyId - 房产ID
 * @param {string} propertyTokenAddress - 房产代币地址
 * @param {number} amount - 购买数量（整数）
 */
async function buyPropertyToken(propertyId, propertyTokenAddress, amount = 1) {
  try {
    log.info('开始购买房产代币...');
    const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL || 'http://localhost:8545');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // 检查钱包地址
    log.info(`使用钱包地址: ${wallet.address}`);
    
    // 获取合约实例
    const propertyManagerContract = await getContract('PropertyManager', PROPERTY_MANAGER_ADDRESS, wallet);
    const propertyTokenContract = await getContract('PropertyToken', propertyTokenAddress, wallet);
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, wallet);
    
    if (!propertyManagerContract || !propertyTokenContract || !usdtContract) {
      throw new Error('获取合约实例失败');
    }
    
    // 验证合约地址
    log.info(`PropertyManager合约地址: ${await propertyManagerContract.getAddress()}`);
    log.info(`PropertyToken合约地址: ${await propertyTokenContract.getAddress()}`);
    
    // 获取代币信息
    const decimals = await propertyTokenContract.decimals();
    const symbol = await propertyTokenContract.symbol();
    const name = await propertyTokenContract.name();
    
    log.info('代币信息:');
    log.info(`- 名称: ${name}`);
    log.info(`- 符号: ${symbol}`);
    log.info(`- 精度: ${decimals}`);
    
    // 检查投资者余额
    const balance = await propertyTokenContract.balanceOf(wallet.address);
    log.info(`当前代币余额: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    
    // 检查USDT余额和授权
    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    const propertyManagerAddress = await propertyManagerContract.getAddress();
    const usdtAllowance = await usdtContract.allowance(wallet.address, propertyManagerAddress);
    
    log.info(`USDT余额: ${ethers.formatUnits(usdtBalance, 18)}`);
    log.info(`USDT授权额度: ${ethers.formatUnits(usdtAllowance, 18)}`);
    
    // 如果授权额度不足，进行授权
    if (usdtAllowance < ethers.parseUnits("1000", 18)) { // 授权1000 USDT
      log.info('USDT授权额度不足，开始授权...');
      const approveTx = await usdtContract.approve(
        propertyManagerAddress,
        ethers.parseUnits("1000", 18)
      );
      log.info(`授权交易已发送，等待确认...`);
      log.info(`授权交易哈希: ${approveTx.hash}`);
      await approveTx.wait();
      log.info('USDT授权成功');
    }
    
    // 设置购买数量
    const purchaseAmount = BigInt(amount); // 直接使用整数
    
    log.info(`购买信息:`);
    log.info(`- 房产ID: ${propertyId}`);
    log.info(`- 代币: ${symbol}`);
    log.info(`- 数量: ${purchaseAmount}`);
    
    // 执行购买
    log.info('发送购买交易...');
    const tx = await propertyManagerContract.initialBuyPropertyToken(
      propertyId,
      purchaseAmount
    );
    
    log.info(`购买交易已发送，等待确认...`);
    log.info(`交易哈希: ${tx.hash}`);
    
    const receipt = await tx.wait();
    log.info(`购买交易已确认，区块号: ${receipt.blockNumber}`);
    
    // 检查交易状态
    if (receipt.status === 0) {
      throw new Error('交易执行失败');
    }
    
    // 检查新的代币余额
    const newBalance = await propertyTokenContract.balanceOf(wallet.address);
    log.info(`购买后代币余额: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
    
    if (newBalance <= balance) {
      log.error('警告：购买后余额未增加');
      // 检查交易日志
      const logs = receipt.logs;
      log.info(`交易日志数量: ${logs.length}`);
      for (const logEntry of logs) {
        log.info(`日志主题: ${logEntry.topics[0]}`);
      }
    }
    
    return true;
  } catch (error) {
    log.error(`购买房产代币失败: ${error.message}`);
    if (error.reason) {
      log.error(`错误原因: ${error.reason}`);
    }
    if (error.data) {
      log.error(`错误数据: ${error.data}`);
    }
    return false;
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL || 'http://localhost:8545');
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);


  const adminWallet =new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  // 加载 ABI
  const propertyTokenAbi = loadAbiFromArtifacts('PropertyToken');
  const rewardManagerAbi = loadAbiFromArtifacts('RewardManager');

  if (!propertyTokenAbi || !rewardManagerAbi ) {
    log.error('ABI 加载失败');
    return;
  }

  // 获取合约实例
  const propertyToken = new ethers.Contract(PROPERTY_TOKEN_ADDRESS, propertyTokenAbi, wallet);
  const rewardManager = new ethers.Contract(REWARD_MANAGER_ADDRESS, rewardManagerAbi, wallet);

  // 查询余额和总供应量
  const balance = await propertyToken.balanceOf(wallet.address);
  const totalSupply = await propertyToken.totalSupply();
  const decimals = await propertyToken.decimals();

  // 查询分配信息
  const distribution = await rewardManager.getDistribution(DISTRIBUTION_ID);
  console.log('[INFO] 分配信息:', distribution);
  log.info('分配信息:');
  log.info(`- 分配ID: ${DISTRIBUTION_ID}`);
  log.info(`- 状态: ${distribution[0]}`);
  log.info(`- 创建者: ${distribution[1]}`);
  log.info(`- 房产ID: ${distribution[2]}`);
  log.info(`- 代币地址: ${distribution[3]}`);
  log.info(`- 分配类型: ${distribution[4]}`);
  log.info(`- 结束: ${new Date(Number(distribution[5]) * 1000).toLocaleString()}`);
  log.info(`- 描述: ${distribution[7]}`);
  log.info(`- 总金额: ${ethers.formatUnits(distribution[8], 18)} USDT`);
  log.info(`- 默克尔根: ${distribution[9]}`);

  const totalAmount = BigInt(distribution[8].toString());
  const eligibleAmount = (totalAmount * BigInt(balance.toString())) / BigInt(totalSupply.toString());

  log.info('代币信息:');
  log.info(`- 资产余额: ${ethers.formatUnits(balance, decimals)}`);
  log.info(`- 总供应量: ${ethers.formatUnits(totalSupply, decimals)}`);
  log.info(`- 可领取金额: ${ethers.formatUnits(eligibleAmount, 18)} USDT`);

  // 构造 MerkleTree
  const merkleData = { address: wallet.address, totalEligible: eligibleAmount };
  const merkleTree = new MerkleTree([merkleData]);
  const merkleRoot = merkleTree.getRoot();
  const merkleProof = merkleTree.getProof(merkleData);

  log.info('验证信息:');
  log.info(`- 钱包地址: ${wallet.address}`);
  log.info(`- 资产合约: ${PROPERTY_TOKEN_ADDRESS}`);
  log.info(`- 生成的默克尔根: ${merkleRoot}`);
  log.info(`- 目标默克尔根: ${MERKLE_ROOT}`);
  log.info(`- Merkle Proof: ${merkleProof}`);

  // 验证 proof
  const isValid = await rewardManager.verifyMerkleProof(
    DISTRIBUTION_ID,
    wallet.address,
    eligibleAmount,
    merkleProof
  );
  log.info(`合约验证 proof 结果: ${isValid}`);

  if (!isValid) {
    log.error('Merkle proof 验证失败，无法领取');
    return;
  }

  // 查询领取前 USDT 余额
  const usdtAbi = loadAbiFromArtifacts('SimpleERC20');
  const usdt = new ethers.Contract(USDT_ADDRESS, usdtAbi, wallet);
  const before = await usdt.balanceOf(wallet.address);
  log.info(`领取前 USDT 余额: ${ethers.formatUnits(before, 18)}`);

  // 在调用 withdraw 前添加
  const systemContract = await getContract('RealEstateSystem', SYSTEM_ADDRESS, adminWallet);
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('OPERATOR_ROLE'));
  await systemContract.grantRole(OPERATOR_ROLE, wallet.address);

  // 调用领取
  log.info('开始领取收益...');
  const tx = await rewardManager.withdraw(
    DISTRIBUTION_ID,
    wallet.address,
    eligibleAmount,
    totalAmount,
    merkleProof
  );
  
  log.info(`领取交易已发送，等待确认...`);
  log.info(`交易哈希: ${tx.hash}`);
  
  const receipt = await tx.wait();
  log.info(`领取交易已确认，区块号: ${receipt.blockNumber}`);

  // 检查交易状态
  if (receipt.status === 0) {
    throw new Error('交易执行失败');
  }

  // 查询领取后 USDT 余额
  const after = await usdt.balanceOf(wallet.address);
  log.info(`领取后 USDT 余额: ${ethers.formatUnits(after, 18)}`);
  log.info(`领取金额: ${ethers.formatUnits(after - before, 18)} USDT`);

  // 检查余额是否增加
  if (after <= before) {
    log.error('警告：领取后余额未增加');
    // 检查交易日志
    const logs = receipt.logs;
    log.info(`交易日志数量: ${logs.length}`);
    for (const logEntry of logs) {
      log.info(`日志主题: ${logEntry.topics[0]}`);
    }
  }
}

main().catch(err => {
  console.error('[ERROR]', err)
});