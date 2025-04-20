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
const INVESTOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY; // 使用operator作为投资者

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
  
  if (balance < minBalance) {
    const neededAmount = minBalance.sub(balance);
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
    
    // 计算实际获得的代币数量
    const tokensReceived = newTokenBalance - initialTokenBalance;
    log.info(`实际获得代币: ${ethers.formatUnits(tokensReceived, state.tokenDecimals)} ${state.tokenSymbol}`);
    
    if (tokensReceived > 0n) {
      log.success(`初始购买成功！投资者获得了 ${ethers.formatUnits(tokensReceived, state.tokenDecimals)} ${state.tokenSymbol}`);
      return true;
    } else {
      log.error(`初始购买可能失败，代币余额未增加`);
      return false;
    }
  } catch (error) {
    log.error(`投资者初始购买代币失败: ${error.message}`);
    return false;
  }
}

// 创建卖单
async function createSellOrder() {
  log.step(5, '创建卖单');
  
  try {
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.adminWallet);
    const propertyTokenContract = state.propertyToken;
    
    // 检查管理员代币余额
    const adminAddress = await state.adminWallet.getAddress();
    const adminBalance = await propertyTokenContract.balanceOf(adminAddress);
    log.balance(`管理员 ${state.tokenSymbol}`, ethers.formatUnits(adminBalance, state.tokenDecimals));
    
    // 设置卖出数量 - 100个代币
    const sellAmount = ethers.parseUnits("100", state.tokenDecimals);
    // 设置价格 - 1 USDT/个
    const price = ethers.parseUnits("1", 18);
    
    log.info(`创建卖单信息:`);
    log.info(`- 代币: ${state.tokenSymbol}`);
    log.info(`- 数量: ${ethers.formatUnits(sellAmount, state.tokenDecimals)}`);
    log.info(`- 价格: ${ethers.formatUnits(price)} USDT/个`);
    
    // 授权TradingManager使用代币
    const approveTx = await propertyTokenContract.approve(TRADING_MANAGER_ADDRESS, sellAmount);
    await approveTx.wait();
    
    // 创建卖单
    const createSellOrderTx = await tradingManagerContract.createSellOrder(
      state.propertyTokenAddress,
      sellAmount,
      price
    );
    
    const receipt = await createSellOrderTx.wait();
    
    // 从事件中获取卖单ID
    const sellOrderCreatedEvent = receipt.logs.find(log => {
      try {
        const parsedLog = tradingManagerContract.interface.parseLog(log);
        return parsedLog && parsedLog.name === 'OrderCreated';
      } catch {
        return false;
      }
    });
    
    if (sellOrderCreatedEvent) {
      const parsedEvent = tradingManagerContract.interface.parseLog(sellOrderCreatedEvent);
      state.sellOrderId = parsedEvent.args.orderId;
      log.info(`卖单创建成功，订单ID: ${state.sellOrderId}`);
    } else {
      const userOrders = await tradingManagerContract.getUserOrders(adminAddress);
      if (userOrders && userOrders.length > 0) {
        state.sellOrderId = userOrders[userOrders.length - 1];
        log.info(`获取到最新订单ID: ${state.sellOrderId}`);
      } else {
        log.error(`无法获取订单ID，创建卖单可能失败`);
        return false;
      }
    }
    
    log.success('卖单创建成功');
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
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.investorWallet);
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.investorWallet);
    const propertyTokenContract = state.propertyToken;
    
    // 检查投资者代币余额
    const investorAddress = await state.investorWallet.getAddress();
    const initialTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者初始 ${state.tokenSymbol}`, ethers.formatUnits(initialTokenBalance, state.tokenDecimals));
    
    // 获取卖单详情
    const sellOrderInfo = await tradingManagerContract.getOrderInfo(state.sellOrderId);
    
    // 购买固定100个代币
    const purchaseAmount = ethers.parseUnits("100", state.tokenDecimals);
    const price = sellOrderInfo.price;
    
    // 计算总成本
    const totalCost = (purchaseAmount * price) / (10n ** BigInt(state.tokenDecimals));
    
    log.info(`购买信息:`);
    log.info(`- 卖单ID: ${state.sellOrderId}`);
    log.info(`- 购买数量: ${ethers.formatUnits(purchaseAmount, state.tokenDecimals)} ${state.tokenSymbol}`);
    log.info(`- 单价: ${ethers.formatUnits(price)} USDT/个`);
    log.info(`- 总成本: ${ethers.formatUnits(totalCost, await usdtContract.decimals())} USDT`);
    
    // 确保投资者有足够的USDT
    await ensureTokenBalance(usdtContract, state.adminWallet, investorAddress, totalCost * 12n / 10n, await usdtContract.decimals());
    
    // 授权TradingManager使用USDT
    const approveTx = await usdtContract.approve(TRADING_MANAGER_ADDRESS, totalCost);
    await approveTx.wait();
    
    // 创建买单
    const createBuyOrderTx = await tradingManagerContract.createBuyOrder(
      sellOrderInfo.token,
      purchaseAmount,
      price
    );
    
    await createBuyOrderTx.wait();
    
    // 等待交易完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查投资者新的代币余额
    const newTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者新 ${state.tokenSymbol}`, ethers.formatUnits(newTokenBalance, state.tokenDecimals));
    
    // 计算实际获得的代币数量
    const tokensReceived = newTokenBalance - initialTokenBalance;
    log.info(`实际获得代币: ${ethers.formatUnits(tokensReceived, state.tokenDecimals)} ${state.tokenSymbol}`);
    
    if (tokensReceived > 0n) {
      log.success(`交易成功！投资者获得了 ${ethers.formatUnits(tokensReceived, state.tokenDecimals)} ${state.tokenSymbol}`);
      return true;
    } else {
      log.error(`交易可能失败，代币余额未增加`);
      return false;
    }
  } catch (error) {
    log.error(`投资者购买代币失败: ${error.message}`);
    return false;
  }
}

// 创建收益分配
async function createDistribution() {
  log.step(7, '创建收益分配');
  
  try {
    const rewardManagerContract = await getContract('RewardManager', REWARD_MANAGER_ADDRESS, state.adminWallet);
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.adminWallet);
    
    // 设置分配金额 - 1000 USDT
    const distributionAmount = ethers.parseUnits('1000', await usdtContract.decimals());
    
    log.info(`创建收益分配信息:`);
    log.info(`- 房产ID: ${state.propertyId}`);
    log.info(`- 分配金额: ${ethers.formatUnits(distributionAmount, await usdtContract.decimals())} USDT`);
    log.info(`- 分配描述: 2023年第4季度房产租金收益`);
    
    // 确保管理员有足够的USDT
    const adminAddress = await state.adminWallet.getAddress();
    await ensureTokenBalance(usdtContract, state.adminWallet, adminAddress, distributionAmount * 12n / 10n, await usdtContract.decimals());
    
    // 授权RewardManager使用USDT
    const approveTx = await usdtContract.approve(REWARD_MANAGER_ADDRESS, distributionAmount);
    await approveTx.wait();
    
    // 创建分配
    const createDistributionTx = await rewardManagerContract.createDistribution(
      state.propertyId,
      distributionAmount,
      USDT_ADDRESS,
      '2023年第4季度房产租金收益'
    );
    
    const receipt = await createDistributionTx.wait();
    
    // 从事件中获取分配ID
    const distributionCreatedEvent = receipt.logs.find(log => {
      try {
        const parsedLog = rewardManagerContract.interface.parseLog(log);
        return parsedLog && parsedLog.name === 'DistributionCreated';
      } catch {
        return false;
      }
    });
    
    if (distributionCreatedEvent) {
      const parsedEvent = rewardManagerContract.interface.parseLog(distributionCreatedEvent);
      state.distributionId = parsedEvent.args.distributionId;
      log.info(`分配创建成功，分配ID: ${state.distributionId}`);
    } else {
      const distributions = await rewardManagerContract.getDistributionsForProperty(state.propertyId);
      if (distributions && distributions.length > 0) {
        state.distributionId = distributions[distributions.length - 1];
        log.info(`获取到最新分配ID: ${state.distributionId}`);
      } else {
        log.error(`无法获取分配ID，创建分配可能失败`);
        return false;
      }
    }
    
    // 激活分配
    const activateDistributionTx = await rewardManagerContract.activateDistribution(state.distributionId);
    await activateDistributionTx.wait();
    
    log.success('收益分配创建并激活成功');
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
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.investorWallet);
    
    // 获取分配详情
    const distributionInfo = await rewardManagerContract.getDistributionInfo(state.distributionId);
    
    log.info(`分配信息:`);
    log.info(`- ID: ${distributionInfo.id}`);
    log.info(`- 房产ID: ${distributionInfo.propertyId}`);
    log.info(`- 金额: ${ethers.formatUnits(distributionInfo.amount)}`);
    log.info(`- 状态: ${distributionInfo.status}`);
    log.info(`- 描述: ${distributionInfo.description}`);
    
    // 估算投资者可获得的收益
    const investorAddress = await state.investorWallet.getAddress();
    const estimatedReward = await rewardManagerContract.estimateReward(state.distributionId, investorAddress);
    
    log.info(`预估收益: ${ethers.formatUnits(estimatedReward)} USDT`);
    
    if (estimatedReward == 0n) {
      log.warn(`投资者没有可领取的收益`);
      return true;
    }
    
    // 检查投资者当前USDT余额
    const initialUsdtBalance = await usdtContract.balanceOf(investorAddress);
    log.balance('投资者初始 USDT', ethers.formatUnits(initialUsdtBalance, await usdtContract.decimals()));
    
    // 领取收益
    const claimTx = await rewardManagerContract.claimReward(state.distributionId);
    await claimTx.wait();
    
    // 检查投资者新的USDT余额
    const newUsdtBalance = await usdtContract.balanceOf(investorAddress);
    log.balance('投资者新 USDT', ethers.formatUnits(newUsdtBalance, await usdtContract.decimals()));
    
    // 计算实际收到的收益
    const actualReward = newUsdtBalance - initialUsdtBalance;
    log.info(`实际收到收益: ${ethers.formatUnits(actualReward, await usdtContract.decimals())} USDT`);
    
    log.success('收益领取完成');
    return true;
  } catch (error) {
    log.error(`投资者领取收益失败: ${error.message}`);
    return false;
  }
}

// 投资者出售房产代币
async function investorSellToken() {
  log.step(9, '投资者出售房产代币');
  
  try {
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.investorWallet);
    const propertyTokenContract = state.propertyToken;
    
    // 检查投资者代币余额
    const investorAddress = await state.investorWallet.getAddress();
    const tokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者 ${state.tokenSymbol}`, ethers.formatUnits(tokenBalance, state.tokenDecimals));
    
    if (tokenBalance == 0n) {
      log.warn(`投资者没有房产代币，无法创建卖单`);
      return true;
    }
    
    // 卖出所有代币
    const sellAmount = tokenBalance;
    // 价格比买入价高10%
    const sellPrice = ethers.parseUnits('110', 18);
    
    log.info(`创建卖单信息:`);
    log.info(`- 代币: ${state.tokenSymbol}`);
    log.info(`- 数量: ${ethers.formatUnits(sellAmount, state.tokenDecimals)}`);
    log.info(`- 价格: ${ethers.formatUnits(sellPrice)} USDT/个`);
    
    // 授权TradingManager使用代币
    const approveTx = await propertyTokenContract.approve(TRADING_MANAGER_ADDRESS, sellAmount);
    await approveTx.wait();
    
    // 创建卖单
    const createSellOrderTx = await tradingManagerContract.createSellOrder(
      state.propertyTokenAddress,
      sellAmount,
      sellPrice
    );
    
    await createSellOrderTx.wait();
    
    log.success('卖单创建成功');
    return true;
  } catch (error) {
    log.error(`投资者创建卖单失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  try {
    log.info('========== 开始执行房产代币化流程 ==========');
    
    // 执行各个步骤
    const steps = [
      initializeSystem,
      registerProperty,
      updatePropertyStatus,
      initialInvestorBuy,
      createSellOrder,
      investorBuyPropertyToken,
      createDistribution,
      investorClaimReward,
      investorSellToken
    ];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const success = await step();
      
      if (!success) {
        log.error(`步骤 ${i + 1} 执行失败，终止流程`);
        return;
      }
    }
    
    log.info('========== 房产代币化流程执行完成 ==========');
  } catch (error) {
    log.error(`执行过程中发生错误: ${error.message}`);
  }
}

// 运行主函数
main().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
}); 