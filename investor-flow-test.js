const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 日本房产代币化系统完整流程测试脚本
 * 
 * 流程说明:
 * 1. 系统初始化
 * 2. 注册房产
 * 3. 更新房产状态为可交易
 * 4. 创建卖单
 * 5. 投资者购买房产代币
 * 6. 创建收益分配
 * 7. 投资者领取收益
 * 8. 投资者出售房产代币
 */

// 配置和常量
const RPC_URL = process.env.TESTNET_RPC_URL || 'http://localhost:8545';

// 私钥配置
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const MANAGER_PRIVATE_KEY = process.env.MANAGER_PRIVATE_KEY;
const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;
const INVESTOR_PRIVATE_KEY = process.env.INVESTOR_PRIVATE_KEY; // 使用独立的投资者私钥

// 合约地址
const USDT_ADDRESS = process.env.CONTRACT_TESTTOKEN_ADDRESS;
const REAL_ESTATE_FACADE_ADDRESS = process.env.CONTRACT_REALESTATEFACADE_ADDRESS;
const PROPERTY_MANAGER_ADDRESS = process.env.CONTRACT_PROPERTYMANAGER_ADDRESS;
const TRADING_MANAGER_ADDRESS = process.env.CONTRACT_TRADINGMANAGER_ADDRESS;
const REWARD_MANAGER_ADDRESS = process.env.CONTRACT_REWARDMANAGER_ADDRESS;
const SYSTEM_ADDRESS = process.env.CONTRACT_REALESTATESYSTEM_ADDRESS;
const PROPERTY_TOKEN_ADDRESS = process.env.CONTRACT_PROPERTYTOKEN_ADDRESS;

// 测试数据
const TEST_PROPERTY_ID = `PROP-${Date.now()}`;
const TEST_PROPERTY_NAME = "东京银座高级公寓";
const TEST_PROPERTY_SYMBOL = "TKO";
const TEST_PROPERTY_COUNTRY = "Japan";
const TEST_PROPERTY_METADATA_URI = "ipfs://QmTestPropertyMetadata";
const TEST_PROPERTY_INITIAL_VALUATION = ethers.parseUnits("1000000", 18); // 100万 USDT
const TEST_PROPERTY_TOKEN_PRICE = ethers.parseUnits("1", 18); // 每个代币 1 USDT
const TEST_PROPERTY_INITIAL_SUPPLY = ethers.parseUnits("1000000", 18); // 100万 个代币

// 日志工具
const log = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  balance: (token, amount) => console.log(`[BALANCE] ${token}: ${amount}`),
  step: (step, message) => console.log(`[STEP ${step}] ${message}`)
};

// 全局状态
const state = {
  provider: null,
  adminWallet: null,
  managerWallet: null,
  operatorWallet: null,
  investorWallet: null,
  propertyId: TEST_PROPERTY_ID,
  propertyTokenAddress: null,
  propertyToken: null,
  tokenSymbol: null,
  tokenName: null,
  tokenDecimals: 18,
  sellOrderId: null,
  buyOrderId: null,
  distributionId: null
};

// 从artifacts加载ABI
function loadAbiFromArtifacts(contractName) {
  try {
    const artifactPath = path.join(__dirname, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
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

    return new ethers.Contract(address, abi, wallet);
  } catch (error) {
    log.error(`创建 ${contractName} 合约实例失败: ${error.message}`);
    return null;
  }
}

// 确保账户有足够的ETH
async function ensureEthBalance(fromWallet, toAddress, minBalance = ethers.parseEther("0.1")) {
  const balance = await state.provider.getBalance(toAddress);
  const formattedMinBalance = typeof minBalance === 'string' ? ethers.parseEther(minBalance) : minBalance;
  
  if (balance < formattedMinBalance) {
    const neededAmount = formattedMinBalance - balance;
    log.info(`转账 ${ethers.formatEther(neededAmount)} ETH 到 ${toAddress}`);
    
    const tx = await fromWallet.sendTransaction({
      to: toAddress,
      value: neededAmount
    });
    await tx.wait();
    
    const newBalance = await state.provider.getBalance(toAddress);
    log.balance('ETH', ethers.formatEther(newBalance));
    return true;
  }
  return false;
}

// 确保账户有足够的代币
async function ensureTokenBalance(tokenContract, fromWallet, toAddress, minBalance, decimals = 18) {
  const balance = await tokenContract.balanceOf(toAddress);
  const formattedMinBalance = typeof minBalance === 'string' ? ethers.parseUnits(minBalance, decimals) : minBalance;
  
  if (balance < formattedMinBalance) {
    const neededAmount = formattedMinBalance - balance;
    const tokenSymbol = await tokenContract.symbol();
    
    log.info(`转账 ${ethers.formatUnits(neededAmount, decimals)} ${tokenSymbol} 到 ${toAddress}`);
    
    const tx = await tokenContract.connect(fromWallet).transfer(toAddress, neededAmount);
    await tx.wait();
    
    const newBalance = await tokenContract.balanceOf(toAddress);
    log.balance(tokenSymbol, ethers.formatUnits(newBalance, decimals));
    return true;
  }
  return false;
}

// 系统初始化
async function initializeSystem() {
  log.step(1, '系统初始化');
  
  try {
    // 连接到区块链网络
    state.provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await state.provider.getNetwork();
    log.info(`已连接到网络: ${network.name} (chainId: ${network.chainId})`);
    
    // 设置各角色钱包
    state.adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, state.provider);
    state.managerWallet = new ethers.Wallet(MANAGER_PRIVATE_KEY, state.provider);
    state.operatorWallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, state.provider);
    state.investorWallet = new ethers.Wallet(INVESTOR_PRIVATE_KEY, state.provider);
    
    // 打印地址信息
    const adminAddress = await state.adminWallet.getAddress();
    const managerAddress = await state.managerWallet.getAddress();
    const operatorAddress = await state.operatorWallet.getAddress();
    const investorAddress = await state.investorWallet.getAddress();
    
    log.info(`管理员地址: ${adminAddress}`);
    log.info(`经理地址: ${managerAddress}`);
    log.info(`操作员地址: ${operatorAddress}`);
    log.info(`投资者地址: ${investorAddress}`);
    
    // 确保各角色有足够的ETH
    await ensureEthBalance(state.adminWallet, managerAddress, ethers.parseEther("0.5"));
    await ensureEthBalance(state.adminWallet, operatorAddress, ethers.parseEther("0.5"));
    
    return true;
  } catch (error) {
    log.error(`系统初始化失败: ${error.message}`);
    return false;
  }
}

// 注册房产
async function registerProperty() {
  log.step(2, '注册房产');
  
  try {
    const facadeContract = await getContract('RealEstateFacade', REAL_ESTATE_FACADE_ADDRESS, state.adminWallet);
    
    log.info(`注册房产信息:`);
    log.info(`- ID: ${state.propertyId}`);
    log.info(`- 名称: ${TEST_PROPERTY_NAME}`);
    log.info(`- 符号: ${TEST_PROPERTY_SYMBOL}`);
    log.info(`- 国家: ${TEST_PROPERTY_COUNTRY}`);
    log.info(`- 初始供应量: ${ethers.formatUnits(TEST_PROPERTY_INITIAL_SUPPLY)}`);
    log.info(`- 初始估值: ${ethers.formatUnits(TEST_PROPERTY_INITIAL_VALUATION)} USDT`);
    log.info(`- 代币单价: ${ethers.formatUnits(TEST_PROPERTY_TOKEN_PRICE)} USDT`);
    
    const registerTx = await facadeContract.registerPropertyAndCreateToken(
      state.propertyId,
      TEST_PROPERTY_COUNTRY,
      TEST_PROPERTY_METADATA_URI,
      TEST_PROPERTY_INITIAL_SUPPLY,
      TEST_PROPERTY_NAME,
      TEST_PROPERTY_SYMBOL
    );
    
    const receipt = await registerTx.wait();
    
    state.propertyTokenAddress = await facadeContract.getPropertyTokenAddress(state.propertyId);
    log.info(`通过查询获取到代币地址: ${state.propertyTokenAddress}`);
    
    // 获取代币信息
    const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.adminWallet);
    state.propertyToken = propertyTokenContract;
    state.tokenSymbol = await propertyTokenContract.symbol();
    state.tokenName = await propertyTokenContract.name();
    state.tokenDecimals = await propertyTokenContract.decimals();
    
    log.info(`房产代币信息: ${state.tokenName} (${state.tokenSymbol})`);
    
    return true;
  } catch (error) {
    log.error(`房产注册失败: ${error.message}`);
    return false;
  }
}

// 更新房产状态
async function updatePropertyStatus() {
  log.step(3, '更新房产状态');
  
  try {
    const facadeContract = await getContract('RealEstateFacade', REAL_ESTATE_FACADE_ADDRESS, state.adminWallet);
    
    // 更新房产状态为可交易
    const updateStatusTx = await facadeContract.updatePropertyStatus(
      state.propertyId,
      2 // 2 表示可交易状态
    );
    
    await updateStatusTx.wait();
    
    log.success('房产状态更新成功');
    return true;
  } catch (error) {
    log.error(`更新房产状态失败: ${error.message}`);
    return false;
  }
}

// 投资者初始购买房产代币
async function initialInvestorBuy() {
  log.step(4, '投资者初始购买房产代币');
  
  try {
    const propertyManagerContract = await getContract('PropertyManager', PROPERTY_MANAGER_ADDRESS, state.investorWallet);
    const propertyTokenContract = state.propertyToken;
    const investorAddress = await state.investorWallet.getAddress();
    
    // 检查投资者 native token 余额
    const investorNativeBalance = await state.provider.getBalance(investorAddress);
    const minNativeBalance = ethers.parseEther("0.5");
    
    log.balance('投资者 native token', ethers.formatEther(investorNativeBalance));
    
    // 如果余额不足，从管理员钱包转账
    if (investorNativeBalance < minNativeBalance) {
      log.info(`投资者 native token 余额不足，从管理员钱包转账...`);
      await ensureEthBalance(state.adminWallet, investorAddress, minNativeBalance);
      
      // 再次检查余额
      const newBalance = await state.provider.getBalance(investorAddress);
      log.balance('投资者新 native token', ethers.formatEther(newBalance));
    }
    
    // 检查投资者初始代币余额
    const initialTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者初始 ${state.tokenSymbol}`, ethers.formatUnits(initialTokenBalance, state.tokenDecimals));
    
    // 设置购买数量 - 100个代币
    const purchaseAmount = ethers.parseUnits("100", state.tokenDecimals);
    
    log.info(`初始购买信息:`);
    log.info(`- 房产ID: ${state.propertyId}`);
    log.info(`- 代币: ${state.tokenSymbol}`);
    log.info(`- 数量: ${ethers.formatUnits(purchaseAmount, state.tokenDecimals)}`);
    
    // 执行初始购买
    const initialBuyTx = await propertyManagerContract.initialBuyPropertyToken(
      state.propertyId,
      purchaseAmount
    );
    
    await initialBuyTx.wait();
    
    // 检查投资者新的代币余额
    const newTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者新 ${state.tokenSymbol}`, ethers.formatUnits(newTokenBalance, state.tokenDecimals));
    
    return true;
  } catch (error) {
    log.error(`投资者初始购买失败: ${error.message}`);
    return false;
  }
}

// 创建卖单
async function createSellOrder() {
  log.step(5, '创建卖单');
  
  try {
    const facadeContract = await getContract('RealEstateFacade', REAL_ESTATE_FACADE_ADDRESS, state.adminWallet);
    
    // 创建卖单
    const sellOrderId = await facadeContract.createSellOrder(
      state.propertyId,
      state.propertyTokenAddress,
      TEST_PROPERTY_TOKEN_PRICE,
      TEST_PROPERTY_INITIAL_SUPPLY
    );
    
    state.sellOrderId = sellOrderId;
    log.info(`卖单创建成功，ID: ${sellOrderId}`);
    
    return true;
  } catch (error) {
    log.error(`创建卖单失败: ${error.message}`);
    return false;
  }
}

// 投资者购买房产代币
async function investorBuyPropertyToken() {
  log.step(6, '投资者购买房产代币');
  
  try {
    const propertyManagerContract = await getContract('PropertyManager', PROPERTY_MANAGER_ADDRESS, state.investorWallet);
    const propertyTokenContract = state.propertyToken;
    const investorAddress = await state.investorWallet.getAddress();
    
    // 检查投资者 native token 余额
    const investorNativeBalance = await state.provider.getBalance(investorAddress);
    const minNativeBalance = ethers.parseEther("0.5");
    
    log.balance('投资者 native token', ethers.formatEther(investorNativeBalance));
    
    // 如果余额不足，从管理员钱包转账
    if (investorNativeBalance < minNativeBalance) {
      log.info(`投资者 native token 余额不足，从管理员钱包转账...`);
      await ensureEthBalance(state.adminWallet, investorAddress, minNativeBalance);
      
      // 再次检查余额
      const newBalance = await state.provider.getBalance(investorAddress);
      log.balance('投资者新 native token', ethers.formatEther(newBalance));
    }
    
    // 检查投资者代币余额
    const tokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者 ${state.tokenSymbol}`, ethers.formatUnits(tokenBalance, state.tokenDecimals));
    
    // 设置购买数量 - 100个代币
    const purchaseAmount = ethers.parseUnits("100", state.tokenDecimals);
    
    log.info(`购买信息:`);
    log.info(`- 房产ID: ${state.propertyId}`);
    log.info(`- 代币: ${state.tokenSymbol}`);
    log.info(`- 数量: ${ethers.formatUnits(purchaseAmount, state.tokenDecimals)}`);
    
    // 执行购买
    const buyTx = await propertyManagerContract.buyPropertyToken(
      state.propertyId,
      purchaseAmount
    );
    
    await buyTx.wait();
    
    // 检查投资者新的代币余额
    const newTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者新 ${state.tokenSymbol}`, ethers.formatUnits(newTokenBalance, state.tokenDecimals));
    
    return true;
  } catch (error) {
    log.error(`投资者购买失败: ${error.message}`);
    return false;
  }
}

// 创建收益分配
async function createDistribution() {
  log.step(7, '创建收益分配');
  
  try {
    const rewardManagerContract = await getContract('RewardManager', REWARD_MANAGER_ADDRESS, state.adminWallet);
    
    // 创建收益分配
    const distributionId = await rewardManagerContract.createDistribution(
      state.propertyId,
      state.propertyTokenAddress,
      TEST_PROPERTY_INITIAL_VALUATION
    );
    
    state.distributionId = distributionId;
    log.info(`收益分配创建成功，ID: ${distributionId}`);
    
    return true;
  } catch (error) {
    log.error(`创建收益分配失败: ${error.message}`);
    return false;
  }
}

// 投资者领取收益
async function investorClaimReward() {
  log.step(8, '投资者领取收益');
  
  try {
    const rewardManagerContract = await getContract('RewardManager', REWARD_MANAGER_ADDRESS, state.investorWallet);
    
    // 领取收益
    const claimTx = await rewardManagerContract.claimReward(
      state.distributionId
    );
    
    await claimTx.wait();
    
    log.success('收益领取成功');
    return true;
  } catch (error) {
    log.error(`投资者领取收益失败: ${error.message}`);
    return false;
  }
}

// 投资者出售房产代币
async function investorSellPropertyToken() {
  log.step(9, '投资者出售房产代币');
  
  try {
    const facadeContract = await getContract('RealEstateFacade', REAL_ESTATE_FACADE_ADDRESS, state.adminWallet);
    
    // 出售房产代币
    const sellTx = await facadeContract.sellPropertyToken(
      state.propertyId,
      state.propertyTokenAddress,
      TEST_PROPERTY_TOKEN_PRICE,
      TEST_PROPERTY_INITIAL_SUPPLY
    );
    
    await sellTx.wait();
    
    log.success('房产代币出售成功');
    return true;
  } catch (error) {
    log.error(`投资者出售房产代币失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  try {
    log.info('开始执行房产代币化流程测试...');
    
    // 1. 系统初始化
    if (!await initializeSystem()) {
      log.error('系统初始化失败，退出测试');
      return;
    }
    
    // 2. 注册房产
    if (!await registerProperty()) {
      log.error('房产注册失败，退出测试');
      return;
    }
    
    // 3. 更新房产状态为可交易
    if (!await updatePropertyStatus()) {
      log.error('更新房产状态失败，退出测试');
      return;
    }

    // 4. 投资者初始购买房产代币
    if (!await initialInvestorBuy()) {
      log.error('更新房产状态失败，退出测试');
      return;
    }
    
    // 5. 创建卖单
    if (!await createSellOrder()) {
      log.error('创建卖单失败，退出测试');
      return;
    }
    
    // 6. 投资者购买房产代币
    if (!await investorBuyPropertyToken()) {
      log.error('投资者购买房产代币失败，退出测试');
      return;
    }
    
    // 7. 创建收益分配
    if (!await createDistribution()) {
      log.error('创建收益分配失败，退出测试');
      return;
    }
    
    // 8. 投资者领取收益
    if (!await investorClaimReward()) {
      log.error('投资者领取收益失败，退出测试');
      return;
    }
    
    // 9. 投资者出售房产代币
    if (!await investorSellPropertyToken()) {
      log.error('投资者出售房产代币失败，退出测试');
      return;
    }
    
    log.success('房产代币化流程测试完成！');
  } catch (error) {
    log.error(`测试过程中发生错误: ${error.message}`);
  }
}

// 执行主函数
main().catch(error => {
  log.error(`主函数执行失败: ${error.message}`);
});