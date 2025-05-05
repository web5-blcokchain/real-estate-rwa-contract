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

// 添加 MerkleProofUpgradeable 合约地址
const MERKLE_PROOF_ADDRESS = process.env.CONTRACT_MERKLEPROOF_ADDRESS;

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

// 确保账户有足够的ETH
async function ensureEthBalance(fromWallet, toAddress, minBalance = ethers.parseEther("0.1")) {
  const balance = await state.provider.getBalance(toAddress);
  const formattedMinBalance = typeof minBalance === 'string' ? ethers.parseEther(minBalance) : minBalance;
  
  if (balance < formattedMinBalance) {
    const neededAmount = formattedMinBalance - balance;
    log.info(`转账 ${ethers.formatEther(neededAmount)} ETH 到 ${toAddress}`);
    
    const tx = await fromWallet.sendTransaction({
      to: toAddress,
      value: formattedMinBalance
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
  log.info(INVESTOR_PRIVATE_KEY)
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

    // 设置冷却期为1秒
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.adminWallet);
    log.info('设置交易冷却期为1秒...');
    const setCooldownTx = await tradingManagerContract.setCooldownPeriod(1);
    await setCooldownTx.wait();
    const cooldownPeriod = await tradingManagerContract.cooldownPeriod();
    log.info(`当前冷却期: ${cooldownPeriod.toString()} 秒`);
    
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
    const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.investorWallet);
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
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.investorWallet);
    const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.investorWallet);
    
    // 创建卖单参数
    const tokenAmount = ethers.parseUnits("2", 18); // 2 个代币，需要18位精度
    const tokenPrice = BigInt(3); // 3 USDT 每个代币
    
    log.info("创建卖单参数:");
    log.info(`- 代币地址: ${state.propertyTokenAddress}`);
    log.info(`- 房产ID: ${state.propertyId}`);
    log.info(`- 数量: ${ethers.formatUnits(tokenAmount, 18)} 个代币`);
    log.info(`- 价格: ${tokenPrice} USDT/代币`);
    
    // 检查操作者代币余额
    const operatorTokenBalance = await propertyTokenContract.balanceOf(state.investorWallet.address);
    log.info(`操作者代币余额: ${ethers.formatUnits(operatorTokenBalance, 18)} 个代币`);
    
    // 检查当前代币授权额度
    const currentTokenAllowance = await propertyTokenContract.allowance(
      state.investorWallet.address,
      TRADING_MANAGER_ADDRESS
    );
    
    log.info(`当前代币授权额度: ${ethers.formatUnits(currentTokenAllowance, 18)}`);
    
    // 如果代币授权额度不足，进行授权
    if (currentTokenAllowance < tokenAmount) {
      log.info(`授权代币... 授权数量: ${ethers.formatUnits(tokenAmount, 18)}`);
      const tokenApproveTx = await propertyTokenContract.approve(
        TRADING_MANAGER_ADDRESS,
        tokenAmount
      );
      const receipt = await tokenApproveTx.wait();
      log.info(`代币授权交易已确认，区块号: ${receipt.blockNumber}`);
      
      // 再次检查授权额度
      const newAllowance = await propertyTokenContract.allowance(
        state.investorWallet.address,
        TRADING_MANAGER_ADDRESS
      );
      log.info(`新的代币授权额度: ${ethers.formatUnits(newAllowance, 18)}`);
      
      if (newAllowance < tokenAmount) {
        throw new Error(`代币授权失败，当前授权额度 ${ethers.formatUnits(newAllowance, 18)} 小于需要的 ${ethers.formatUnits(tokenAmount, 18)}`);
      }
    } else {
      log.info("代币授权额度充足，无需重新授权");
    }
    
    // 创建卖单前检查余额
    const beforeTokenBalance = await propertyTokenContract.balanceOf(state.investorWallet.address);
    log.info("\n创建卖单前余额:");
    log.info(`- 代币余额: ${ethers.formatUnits(beforeTokenBalance, 18)} 个代币`);
    
    // 创建卖单
    log.info("\n发送交易...");
    const tx = await tradingManagerContract.createSellOrder(
        state.propertyTokenAddress,
        state.propertyId,
        tokenAmount,
        tokenPrice
    );
    
    log.info(`交易已发送，等待确认... 交易哈希: ${tx.hash}`);
    const receipt = await tx.wait();
    log.info(`交易已确认，区块号: ${receipt.blockNumber}`);
    
    // 获取并保存卖单ID
    const orderIds = await tradingManagerContract.getUserOrders(state.investorWallet.address);
    state.sellOrderId = orderIds[orderIds.length - 1];
    log.info(`卖单创建成功，订单ID: ${state.sellOrderId}`);
    
    // 创建卖单后检查余额
    const afterTokenBalance = await propertyTokenContract.balanceOf(state.investorWallet.address);
    log.info("\n创建卖单后余额:");
    log.info(`- 代币余额: ${ethers.formatUnits(afterTokenBalance, 18)} 个代币`);
    
    // 计算余额变化
    const tokenChange = beforeTokenBalance - afterTokenBalance;
    log.info("\n余额变化:");
    log.info(`- 代币变化: ${ethers.formatUnits(tokenChange, 18)} 个代币`);
    
    // 输出成功信息
    log.success("卖单创建成功!");
    
    return true;
  } catch (error) {
    log.error(`创建卖单失败: ${error.message}`);
    if (error.reason) {
      log.error(`错误原因: ${error.reason}`);
    }
    if (error.data) {
      log.error(`错误数据: ${error.data}`);
    }
    if (error.transaction) {
      log.error(`交易内容:`, error.transaction);
    }
    return false;
  }
}

// 投资者购市场挂单的买房产代币
async function  createBuyOrder() {
  log.step(6, '投资者购买房产代币');
  
  try {
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.investorWallet);
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.investorWallet);
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
    
    // 设置购买参数
    const purchaseAmount = ethers.parseUnits("1", 18); // 购买1个代币
    const tokenPrice = BigInt(3); // 3 USDT 每个代币
    const requiredUsdt = purchaseAmount * tokenPrice;
    
    log.info(`购买信息:`);
    log.info(`- 房产ID: ${state.propertyId}`);
    log.info(`- 代币: ${state.tokenSymbol}`);
    log.info(`- 数量: ${ethers.formatUnits(purchaseAmount, 18)}`);
    log.info(`- 价格: ${tokenPrice} USDT/代币`);
    log.info(`- 需要 USDT: ${ethers.formatUnits(requiredUsdt, 18)} USDT`);
    
    // 检查 USDT 余额
    const usdtBalance = await usdtContract.balanceOf(investorAddress);
    log.info(`USDT 余额: ${ethers.formatUnits(usdtBalance, 18)} USDT`);
    
    // 如果 USDT 余额不足，从管理员钱包转账
    if (usdtBalance < requiredUsdt) {
      log.info(`USDT 余额不足，从管理员钱包转账...`);
      const adminUsdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.adminWallet);
      const transferAmount = ethers.parseUnits("100", 18); // 转账 100 USDT
      
      const transferTx = await adminUsdtContract.transfer(
        investorAddress,
        transferAmount
      );
      await transferTx.wait();
      
      const newBalance = await usdtContract.balanceOf(investorAddress);
      log.info(`转账完成，新 USDT 余额: ${ethers.formatUnits(newBalance, 18)} USDT`);
    }
    
    // 检查 USDT 授权额度
    const currentUsdtAllowance = await usdtContract.allowance(
      investorAddress,
      TRADING_MANAGER_ADDRESS
    );
    
    log.info(`当前 USDT 授权额度: ${ethers.formatUnits(currentUsdtAllowance, 18)}`);
    
    // 如果 USDT 授权额度不足，进行授权
    if (currentUsdtAllowance < requiredUsdt) {
      log.info(`授权 USDT... 授权数量: ${ethers.formatUnits(requiredUsdt, 18)}`);
      const usdtApproveTx = await usdtContract.approve(
        TRADING_MANAGER_ADDRESS,
        requiredUsdt
      );
      const receipt = await usdtApproveTx.wait();
      log.info(`USDT 授权交易已确认，区块号: ${receipt.blockNumber}`);
      
      // 再次检查授权额度
      const newAllowance = await usdtContract.allowance(
        investorAddress,
        TRADING_MANAGER_ADDRESS
      );
      log.info(`新的 USDT 授权额度: ${ethers.formatUnits(newAllowance, 18)}`);
      
      if (newAllowance < requiredUsdt) {
        throw new Error(`USDT 授权失败，当前授权额度 ${ethers.formatUnits(newAllowance, 18)} 小于需要的 ${ethers.formatUnits(requiredUsdt, 18)}`);
      }
    } else {
      log.info("USDT 授权额度充足，无需重新授权");
    }
    
    // 创建买单前检查余额
    const beforeUsdtBalance = await usdtContract.balanceOf(investorAddress);
    const beforeTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.info("\n创建买单前余额:");
    log.info(`- USDT 余额: ${ethers.formatUnits(beforeUsdtBalance, 18)} USDT`);
    log.info(`- 代币余额: ${ethers.formatUnits(beforeTokenBalance, 18)} 个代币`);
    
    // 创建买单
    log.info("\n发送交易...");
    const buyTx = await tradingManagerContract.createBuyOrder(
        state.propertyTokenAddress,
        state.propertyId,
        purchaseAmount,
        tokenPrice
    );
    
    await buyTx.wait();
    
    // 获取并保存买单ID
    const orderIds = await tradingManagerContract.getUserOrders(state.investorWallet.address);
    state.buyOrderId = orderIds[orderIds.length - 1];
    log.info(`买单创建成功，订单ID: ${state.buyOrderId}`);
    
    // 创建买单后检查余额
    const afterUsdtBalance = await usdtContract.balanceOf(investorAddress);
    const afterTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.info("\n创建买单后余额:");
    log.info(`- USDT 余额: ${ethers.formatUnits(afterUsdtBalance, 18)} USDT`);
    log.info(`- 代币余额: ${ethers.formatUnits(afterTokenBalance, 18)} 个代币`);
    
    // 计算余额变化
    const usdtChange = beforeUsdtBalance - afterUsdtBalance;
    const tokenChange = afterTokenBalance - beforeTokenBalance;
    log.info("\n余额变化:");
    log.info(`- USDT 变化: ${ethers.formatUnits(usdtChange, 18)} USDT`);
    log.info(`- 代币变化: ${ethers.formatUnits(tokenChange, 18)} 个代币`);
    
    return true;
  } catch (error) {
    log.error(`投资者购买房产代币失败: ${error.message}`);
    return false;
  }
}

/**
 * @dev 购买卖单
 */
async function buyOrder(orderId) {
    try {
        log.step(5, '执行买单');
        
        const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.investorWallet);
        const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.investorWallet);
        const investorAddress = await state.investorWallet.getAddress();
        
        // 获取卖单信息
        const order = await tradingManagerContract.getOrder(orderId);
        log.info(`卖单信息:
            - 卖家: ${order.seller}
            - 代币: ${order.token}
            - 数量: ${ethers.formatUnits(order.amount, state.tokenDecimals)}
            - 价格: ${ethers.formatUnits(order.price, 18)} USDT
            - 是否活跃: ${order.active}
        `);

        // 计算需要的USDT数量
        const requiredUsdt = order.amount * order.price;
        log.info(`需要的USDT数量: ${ethers.formatUnits(requiredUsdt, 18)}`);
        
        // 检查USDT余额
        const usdtBalance = await usdtContract.balanceOf(investorAddress);
        log.info(`当前USDT余额: ${ethers.formatUnits(usdtBalance, 18)}`);
        
        if (usdtBalance < requiredUsdt) {
            // 如果余额不足，从管理员转账更多的USDT
            log.info(`USDT余额不足，从管理员转账更多USDT...`);
            const adminUsdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.adminWallet);
            const transferAmount = requiredUsdt * BigInt(2); // 转账两倍所需金额
            
            const transferTx = await adminUsdtContract.transfer(investorAddress, transferAmount);
            await transferTx.wait();
            
            const newBalance = await usdtContract.balanceOf(investorAddress);
            log.info(`转账完成，新USDT余额: ${ethers.formatUnits(newBalance, 18)}`);
        }
        
        // 检查USDT授权额度
        const currentAllowance = await usdtContract.allowance(investorAddress, TRADING_MANAGER_ADDRESS);
        log.info(`当前USDT授权额度: ${ethers.formatUnits(currentAllowance, 18)}`);
        
        // 如果授权额度不足，进行授权
        if (currentAllowance < requiredUsdt) {
            log.info(`USDT授权额度不足，正在授权...`);
            // 授权一个非常大的额度，避免后续交易再次授权
            const approveAmount = requiredUsdt * BigInt(10); // 授权10倍所需金额
            
            // 先清零授权
            log.info(`清零当前授权...`);
            const resetTx = await usdtContract.approve(TRADING_MANAGER_ADDRESS, 0);
            await resetTx.wait();
            
            // 设置新的授权额度
            log.info(`设置新的授权额度: ${ethers.formatUnits(approveAmount, 18)} USDT`);
            const approveTx = await usdtContract.approve(TRADING_MANAGER_ADDRESS, approveAmount);
            await approveTx.wait();
            
            // 再次检查授权额度
            const newAllowance = await usdtContract.allowance(investorAddress, TRADING_MANAGER_ADDRESS);
            log.info(`新的USDT授权额度: ${ethers.formatUnits(newAllowance, 18)}`);
            
            if (newAllowance < requiredUsdt) {
                throw new Error(`USDT授权失败，当前授权额度 ${ethers.formatUnits(newAllowance, 18)} 小于需要的 ${ethers.formatUnits(requiredUsdt, 18)}`);
            }
        }

        // 等待冷却时间（1秒）
        log.info('等待订单冷却时间（1秒）...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        log.info('冷却时间结束，可以继续操作');

        // 执行买单
        log.info(`准备执行买单，订单ID: ${orderId}`);
        const tx = await tradingManagerContract.buyOrder(orderId);
        log.info(`买单交易已发送，等待确认...`);
        const receipt = await tx.wait();
        log.info(`买单执行成功，交易哈希: ${receipt.hash}`);

        // 获取最新的订单信息
        const updatedOrder = await tradingManagerContract.getOrder(orderId);
        log.info(`交易完成后订单信息:
            - 买家: ${investorAddress}
            - 卖家: ${updatedOrder.seller}
            - 代币: ${updatedOrder.token}
            - 数量: ${ethers.formatUnits(updatedOrder.amount, state.tokenDecimals)}
            - 价格: ${ethers.formatUnits(updatedOrder.price, 18)} USDT
            - 是否活跃: ${updatedOrder.active}
        `);

        return true;
    } catch (error) {
        log.error(`执行买单失败: ${error.message}`);
        if (error.reason) {
            log.error(`错误原因: ${error.reason}`);
        }
        if (error.data) {
            log.error(`错误数据: ${error.data}`);
        }
        return false;
    }
}

/**
 * @dev 出售给买单
 */
async function sellOrder(orderId) {
    try {
        log.step(8, '执行卖单');
        
        const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.investorWallet);
        const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.investorWallet);
        const investorAddress = await state.investorWallet.getAddress();
        
        // 获取买单信息
        const order = await tradingManagerContract.getOrder(orderId);
        log.info(`买单信息:
            - 买家: ${order.buyer}
            - 代币: ${order.token}
            - 数量: ${ethers.formatUnits(order.amount, state.tokenDecimals)}
            - 价格: ${ethers.formatUnits(order.price, 18)} USDT
            - 是否活跃: ${order.active}
        `);

        // 检查代币余额
        const tokenBalance = await propertyTokenContract.balanceOf(investorAddress);
        log.info(`当前代币余额: ${ethers.formatUnits(tokenBalance, state.tokenDecimals)}`);
        
        if (tokenBalance < order.amount) {
            // 如果余额不足，尝试从管理员获取更多代币
            log.info(`代币余额不足，尝试从管理员获取更多代币...`);
            const adminPropertyToken = await getContract('PropertyToken', state.propertyTokenAddress, state.adminWallet);
            const transferAmount = order.amount * BigInt(2); // 转账两倍所需金额
            
            // 检查管理员余额
            const adminBalance = await adminPropertyToken.balanceOf(state.adminWallet.address);
            log.info(`管理员代币余额: ${ethers.formatUnits(adminBalance, state.tokenDecimals)}`);
            
            if (adminBalance >= transferAmount) {
                const transferTx = await adminPropertyToken.transfer(investorAddress, transferAmount);
                await transferTx.wait();
                log.info(`已从管理员转账 ${ethers.formatUnits(transferAmount, state.tokenDecimals)} 代币到投资者账户`);
            } else {
                throw new Error(`管理员代币余额不足，无法转账给投资者`);
            }
            
            // 再次检查投资者余额
            const newBalance = await propertyTokenContract.balanceOf(investorAddress);
            log.info(`转账后投资者代币余额: ${ethers.formatUnits(newBalance, state.tokenDecimals)}`);
            
            if (newBalance < order.amount) {
                throw new Error(`转账后余额仍然不足，需要 ${ethers.formatUnits(order.amount, state.tokenDecimals)}，实际有 ${ethers.formatUnits(newBalance, state.tokenDecimals)}`);
            }
        }
        
        // 检查代币授权额度
        const currentAllowance = await propertyTokenContract.allowance(investorAddress, TRADING_MANAGER_ADDRESS);
        log.info(`当前代币授权额度: ${ethers.formatUnits(currentAllowance, state.tokenDecimals)}`);
        
        // 如果授权额度不足，进行授权
        if (currentAllowance < order.amount) {
            log.info(`代币授权额度不足，正在授权...`);
            // 授权一个更大的额度，避免频繁授权
            const approveAmount = order.amount * BigInt(2);
            
            // 先清零授权
            log.info(`清零当前授权...`);
            const resetTx = await propertyTokenContract.approve(TRADING_MANAGER_ADDRESS, 0);
            await resetTx.wait();
            
            // 设置新的授权额度
            log.info(`设置新的授权额度: ${ethers.formatUnits(approveAmount, state.tokenDecimals)} 代币`);
            const approveTx = await propertyTokenContract.approve(TRADING_MANAGER_ADDRESS, approveAmount);
            await approveTx.wait();
            
            // 再次检查授权额度
            const newAllowance = await propertyTokenContract.allowance(investorAddress, TRADING_MANAGER_ADDRESS);
            log.info(`新的代币授权额度: ${ethers.formatUnits(newAllowance, state.tokenDecimals)}`);
            
            if (newAllowance < order.amount) {
                throw new Error(`代币授权失败，当前授权额度 ${ethers.formatUnits(newAllowance, state.tokenDecimals)} 小于需要的 ${ethers.formatUnits(order.amount, state.tokenDecimals)}`);
            }
        }

        // 等待冷却时间（1秒）
        log.info('等待订单冷却时间（1秒）...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        log.info('冷却时间结束，可以继续操作');

        // 执行卖单
        log.info(`准备执行卖单，订单ID: ${orderId}`);
        const tx = await tradingManagerContract.sellOrder(orderId);
        log.info(`卖单交易已发送，等待确认...`);
        const receipt = await tx.wait();
        log.info(`卖单执行成功，交易哈希: ${receipt.hash}`);

        // 获取最新的订单信息
        const updatedOrder = await tradingManagerContract.getOrder(orderId);
        log.info(`交易完成后订单信息:
            - 买家: ${updatedOrder.buyer}
            - 卖家: ${investorAddress}
            - 代币: ${updatedOrder.token}
            - 数量: ${ethers.formatUnits(updatedOrder.amount, state.tokenDecimals)}
            - 价格: ${ethers.formatUnits(updatedOrder.price, 18)} USDT
            - 是否活跃: ${updatedOrder.active}
        `);

        return true;
    } catch (error) {
        log.error(`执行卖单失败: ${error.message}`);
        if (error.reason) {
            log.error(`错误原因: ${error.reason}`);
        }
        if (error.data) {
            log.error(`错误数据: ${error.data}`);
        }
        return false;
    }
}

// 创建收益分配
async function createDistribution() {
  log.step(8, '创建收益分配');
  
  try {
    const rewardManagerContract = await getContract('RewardManager', REWARD_MANAGER_ADDRESS, state.adminWallet);
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.adminWallet);
    const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.adminWallet);
    
    // 获取当前时间戳
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // 设置分配金额为1000 USDT
    const distributionAmount = ethers.parseUnits("1000", 18); // 1000 USDT
    
    log.info(`创建收益分配信息:`);
    log.info(`- 房产ID: ${state.propertyId}`);
    log.info(`- 分配金额: ${ethers.formatUnits(distributionAmount, 18)} USDT`);
    log.info(`- 时间戳: ${currentTimestamp}`);
    
    // 检查管理员USDT余额
    const adminUsdtBalance = await usdtContract.balanceOf(state.adminWallet.address);
    log.info(`管理员地址: ${state.adminWallet.address}`);

    log.info(`管理员USDT余额: ${adminUsdtBalance}`);
    if (adminUsdtBalance < distributionAmount) {
        throw new Error(`管理员USDT余额不足，需要 ${ethers.formatUnits(distributionAmount, 18)}，实际有 ${ethers.formatUnits(adminUsdtBalance, 18)}`);
    }
    
    // 检查USDT授权额度
    const currentAllowance = await usdtContract.allowance(state.adminWallet.address, REWARD_MANAGER_ADDRESS);
    log.info(`当前USDT授权额度: ${ethers.formatUnits(currentAllowance, 18)}`);
    
    // 如果授权额度不足，进行授权
    if (currentAllowance < distributionAmount) {
        log.info(`USDT授权额度不足，正在授权...`);
        // 先清零授权
        const resetTx = await usdtContract.approve(REWARD_MANAGER_ADDRESS, 0);
        await resetTx.wait();
        
        // 设置新的授权额度
        const approveAmount = distributionAmount * BigInt(2); // 授权两倍所需金额
        const approveTx = await usdtContract.approve(REWARD_MANAGER_ADDRESS, approveAmount);
        await approveTx.wait();
        
        const newAllowance = await usdtContract.allowance(state.adminWallet.address, REWARD_MANAGER_ADDRESS);
        log.info(`新的USDT授权额度: ${ethers.formatUnits(newAllowance, 18)}`);
        
        if (newAllowance < distributionAmount) {
            throw new Error(`USDT授权失败，当前授权额度 ${ethers.formatUnits(newAllowance, 18)} 小于需要的 ${ethers.formatUnits(distributionAmount, 18)}`);
        }
    }

        // 添加USDT到支持的稳定币列表
    log.info(`添加USDT到支持的稳定币列表...`);
    try {
        const addTx = await rewardManagerContract.addSupportedStablecoin(USDT_ADDRESS);
        await addTx.wait();
        log.info(`USDT已添加到支持的稳定币列表中`);
    } catch (error) {
        // 如果已经添加过，忽略错误
        if (!error.message.includes("already supported")) {
            throw error;
        }
        log.info(`USDT已经在支持的稳定币列表中`);
    }
    
    // 获取投资者余额和总供应量
    const investorBalance = await propertyTokenContract.balanceOf(state.investorWallet.address);
    const totalSupply = await propertyTokenContract.totalSupply();
    
    // 计算投资者的可领取金额
    const eligibleAmount = (distributionAmount * BigInt(investorBalance.toString())) / BigInt(totalSupply.toString());
    
    // 创建默克尔树数据
    const merkleData = {
        address: state.investorWallet.address,
        totalEligible: eligibleAmount
    };
    
    // 创建默克尔树并获取根
    const merkleTree = new MerkleTree([merkleData]);
    const merkleRoot = merkleTree.getRoot();
    log.info(`生成的默克尔根: ${merkleRoot}`);
    
    // 生成默克尔证明
    const merkleProof = merkleTree.getProof(merkleData);
    console.log('[INFO] 生成的默克尔证明:', merkleProof);

    // 准备调用参数
    const params = {
      propertyId: state.propertyId,
      amount: distributionAmount,
      stablecoinAddress: USDT_ADDRESS,
      merkleRoot: merkleRoot,
      distributionType: 0, // 0 = Dividend
      endTime: currentTimestamp + 86400, // 24小时后过期
      description: "Test distribution"
    };

    log.info(`调用参数:`, params);

    // 创建收益分配
    try {
      const createTx = await rewardManagerContract.createDistribution(
        params.propertyId,
        params.amount,
        params.stablecoinAddress,
        params.merkleRoot,
        params.distributionType,
        params.endTime,
        params.description,
        { gasLimit: 500000 }
      );

      log.info(`收益分配交易已发送，等待确认...`);
      const receipt = await createTx.wait();
      log.info(`收益分配交易已确认，区块号: ${receipt.blockNumber}`);

      // 从事件中获取分配ID
      const event = receipt.logs.find(log => log.fragment && log.fragment.name === 'DistributionCreated');
      if (event) {
          state.distributionId = event.args.distributionId;
          log.info(`收益分配创建成功，ID: ${state.distributionId}`);
      } else {
          // 如果找不到事件，尝试获取最新的分配ID
          const distributionCount = await rewardManagerContract.getDistributionCount(state.propertyId);
          state.distributionId = distributionCount - BigInt(1);
          log.info(`通过计数获取分配ID: ${state.distributionId}`);
      }

      // 更新分配状态为Active
      log.info(`更新分配状态为Active...`);
      const updateStatusTx = await rewardManagerContract.updateDistributionStatus(
        state.distributionId,
        1 // 1 = Active
      );
      await updateStatusTx.wait();
      log.info(`分配状态已更新为Active`);

    } catch (txError) {
      log.error(`交易执行失败: ${txError.message}`);
      if (txError.reason) {
          log.error(`错误原因: ${txError.reason}`);
      }
      if (txError.data) {
          log.error(`错误数据: ${txError.data}`);
      }
      if (txError.transaction) {
          log.error(`交易内容:`, txError.transaction);
      }
      throw txError;
    }


    return true;
  } catch (error) {
    log.error(`创建收益分配失败: ${error.message}`);
    if (error.reason) {
        log.error(`错误原因: ${error.reason}`);
    }
    if (error.data) {
        log.error(`错误数据: ${error.data}`);
    }
    if (error.transaction) {
        log.error(`交易内容:`, error.transaction);
    }
    return false;
  }
}

// 添加 MerkleTree 辅助类
class MerkleTree {
    constructor(elements) {
        this.elements = elements;
        this.leaves = elements.map(element => this.hashLeaf(element));
        this.layers = this.buildLayers(this.leaves);
    }

    hashLeaf(element) {
        // Match the contract's leaf format exactly using solidityPacked
        return ethers.keccak256(
            ethers.solidityPacked(
                ['address', 'uint256'],
                [element.address, element.totalEligible]
            )
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
        // Sort the pair to ensure consistent ordering
        const [first, second] = [left, right].sort();
        return ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ['bytes32', 'bytes32'],
                [first, second]
            )
        );
    }

    getRoot() {
        return this.layers[this.layers.length - 1][0];
    }

    getProof(element) {
        const leaf = this.hashLeaf(element);
        const index = this.leaves.indexOf(leaf);
        if (index === -1) throw new Error('Element not found in tree');

        // 如果只有一个叶子节点，返回空数组
        if (this.leaves.length === 1) {
            return [];
        }

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

// 修改 investorClaimReward 函数
async function investorClaimReward(distributionId) {
    try {
        console.log('\n[INFO] 开始领取收益...');

        // Grant OPERATOR_ROLE to investor
        const systemContract = await getContract('RealEstateSystem', SYSTEM_ADDRESS, state.adminWallet);
        const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('OPERATOR_ROLE'));
        await systemContract.grantRole(OPERATOR_ROLE, state.investorWallet.address);
        console.log('[INFO] 已授予投资者 OPERATOR_ROLE 权限');

        // Connect to investor's wallet
        const rewardManager = await getContract('RewardManager', REWARD_MANAGER_ADDRESS, state.investorWallet);
        const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.investorWallet);


        // 获取分配信息
        console.log('[INFO] 获取分配信息...');
        const distribution = await rewardManager.getDistribution(distributionId);
        console.log('[INFO] 分配信息:', distribution);

        // 检查分配是否存在
        if (!distribution) {
            throw new Error(`分配ID ${distributionId} 不存在`);
        }

        // 获取代币余额和总供应量
        const investorBalance = await propertyTokenContract.balanceOf(state.investorWallet.address);
        const totalSupply = await propertyTokenContract.totalSupply();

        console.log('[INFO] 代币信息:');
        console.log(`- 投资者余额: ${ethers.formatUnits(investorBalance, 18)}`);
        console.log(`- 总供应量: ${ethers.formatUnits(totalSupply, 18)}`);

        // 计算可领取金额（按比例）
        const totalAmount = BigInt(distribution[8].toString());
        const eligibleAmount = (totalAmount * BigInt(investorBalance.toString())) / BigInt(totalSupply.toString());
        console.log('[INFO] 可领取金额:', ethers.formatUnits(eligibleAmount, 18));

        // 创建默克尔树数据
        const merkleData = {
            address: state.investorWallet.address,
            totalEligible: eligibleAmount
        };

        // 创建默克尔树
        const merkleTree = new MerkleTree([merkleData]);
        const merkleRoot = merkleTree.getRoot();
        console.log('[INFO] 生成的默克尔根:', merkleRoot);
        console.log('[INFO] 合约中的默克尔根:', distribution[9]);

        // 生成默克尔证明
        const merkleProof = merkleTree.getProof(merkleData);
        console.log('[INFO] 生成的默克尔证明:', merkleProof);


            // 领取前的余额
            const usdtContract1 = await getContract('SimpleERC20', USDT_ADDRESS, state.investorWallet);
            const balance1 = await usdtContract1.balanceOf(state.investorWallet.address);
            console.log('[INFO] 投资者领取前USDT余额:', ethers.formatUnits(balance1, 18));

        // 验证默克尔证明
        console.log('[INFO] 开始合约验证默克尔证明...');
        const isValidOnChain = await rewardManager.verifyMerkleProof(
            distributionId,
            state.investorWallet.address,
            eligibleAmount,
            merkleProof
        );
        console.log('[INFO] 合约验证结果:', isValidOnChain);

        if (!isValidOnChain) {
            throw new Error('合约验证默克尔证明失败');
        }

        // 调用领取函数
        console.log('[INFO] 调用领取函数...');
        const tx = await rewardManager.withdraw(
            distributionId,
            state.investorWallet.address,
            eligibleAmount,
            totalAmount,
            merkleProof
        );
        
        const receipt = await tx.wait();
        console.log('[INFO] 领取交易成功:', receipt.hash);
        
        // 获取领取后的余额
        const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.investorWallet);
        const balance = await usdtContract.balanceOf(state.investorWallet.address);
        console.log('[INFO] 投资者USDT余额:', ethers.formatUnits(balance, 18));
        
    } catch (error) {
        console.error('[ERROR] 投资者领取收益失败:', error);
        if (error.reason) {
            console.error('错误原因:', error.reason);
        }
        if (error.data) {
            console.error('错误数据:', error.data);
        }
        throw error;
    }
}

// 修改测试流程
async function testFlow() {
  try {
    // 初始化系统
    await initializeSystem();
    log.success('系统初始化成功');

    // 注册房产
    await registerProperty();
    log.success('房产注册成功');

    // 更新房产状态
    await updatePropertyStatus();
    log.success('房产状态更新成功');

    // 投资者初始购买房产代币
    await initialInvestorBuy();
    log.success('投资者初始购买房产代币成功');

    // 创建卖单
    await createSellOrder();
    log.success('卖单创建成功');

    // 投资者创建买单
    await createBuyOrder();
    log.success('买单创建成功');

    // 购买卖单
    await buyOrder(state.sellOrderId);  // 使用卖单ID来购买
    log.success('购买卖单成功');

    // 出售给买单
    await sellOrder(state.buyOrderId);  // 使用买单ID来出售
    log.success('出售给买单成功');

    // 创建收益分配
    await createDistribution();
    log.success('收益分配创建成功');

    // 投资者领取收益
    await investorClaimReward(state.distributionId);
    log.success('收益领取成功');

    return true;
  } catch (error) {
    log.error(`测试流程失败: ${error.message}`);
    return false;
  }
}

// 运行测试流程
async function runTest() {
  try {
    await testFlow();
    log.success('测试流程完成');
    } catch (error) {
    log.error(`运行测试流程失败: ${error.message}`);
  }
}

// 运行测试流程
runTest();