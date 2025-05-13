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
const RPC_URL = process.env.TESTNET_RPC_URL1 || 'http://localhost:8545';
console.log('\n=== 网络配置信息 ===');
console.log(`RPC URL: ${RPC_URL}`);
console.log('===================\n');

// 私钥配置
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const MANAGER_PRIVATE_KEY = process.env.MANAGER_PRIVATE_KEY; 
const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;

// 添加测试账号配置
const TEST_ACCOUNTS = {
    seller: {
        privateKey: process.env.SELLER_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // 测试账号1
        name: '卖家'
    },
    buyer: {
        privateKey: process.env.BUYER_PRIVATE_KEY || '0x7c8526d5c2e3d85242d78d0543dae9c98bfd1ab9018c7a79f95c324dd2d80293', // 测试账号2
        name: '买家'
    }
};

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
const TEST_PROPERTY_TOKEN_PRICE = 1; // 每个代币 1 USDT（整数）
const TEST_PROPERTY_INITIAL_SUPPLY = 1000000; // 100万 个代币（整数）

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
  sellerWallet: null,  // 添加卖家钱包
  buyerWallet: null,   // 添加买家钱包
  propertyId: TEST_PROPERTY_ID,
  propertyTokenAddress: null,
  propertyToken: null,
  tokenSymbol: null,
  tokenName: null,
  tokenDecimals: 0, // PropertyToken 份额为整数
  usdtDecimals: 18, // USDT 精度，将从合约中获取
  sellOrderId: null,  // 添加卖单ID
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

    // 创建合约实例并连接到钱包
    const contract = new ethers.Contract(address, abi, wallet);
    
    // 验证合约是否有效
    try {
      // 在本地网络上跳过 ENS 检查
      const network = await wallet.provider.getNetwork();
      if (network.chainId === 31337n) {
        return contract;
      }
      
      const contractAddress = await contract.getAddress();
      if (contractAddress.toLowerCase() !== address.toLowerCase()) {
        log.error(`合约地址不匹配: ${contractAddress} != ${address}`);
        return null;
      }
      return contract;
  } catch (error) {
      // 如果是 ENS 错误，在本地网络上忽略
      if (error.code === 'UNSUPPORTED_OPERATION' && error.info?.network?.chainId === '31337') {
        return contract;
      }
      log.error(`合约 ${contractName} 地址无效: ${error.message}`);
      return null;
    }
  } catch (error) {
    log.error(`创建 ${contractName} 合约实例失败: ${error.message}`);
    return null;
  }
}

// 等待交易确认
async function waitForTransaction(tx) {
    try {
        const receipt = await tx.wait();
        console.log(`[INFO] 交易已确认，区块号: ${receipt.blockNumber}`);
        return receipt;
    } catch (error) {
        console.error(`[ERROR] 交易确认失败: ${error.message}`);
        throw error;
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
    await waitForTransaction(tx);
    
    // 等待交易完全确认
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    await waitForTransaction(tx);
    
    // 等待交易完全确认
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newBalance = await tokenContract.balanceOf(toAddress);
    log.balance(tokenSymbol, ethers.formatUnits(newBalance, decimals));
    return true;
  }
  return false;
}

// 添加余额检查函数
async function checkBalances(description) {
    console.log(`\n=== ${description} ===`);
    
    // 检查 ETH 余额
    const adminEthBalance = ethers.formatEther(await state.provider.getBalance(state.adminWallet.address));
    const sellerEthBalance = ethers.formatEther(await state.provider.getBalance(state.sellerWallet.address));
    const buyerEthBalance = ethers.formatEther(await state.provider.getBalance(state.buyerWallet.address));
    
    console.log('ETH Balances:');
    console.log(`Admin: ${adminEthBalance} ETH`);
    console.log(`Seller: ${sellerEthBalance} ETH`);
    console.log(`Buyer: ${buyerEthBalance} ETH`);
    
    // 检查 USDT 余额
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.adminWallet);
    if (!usdtContract) {
        console.log('USDT contract not found');
        return;
    }
    
    // 获取 USDT 精度
    const usdtDecimals = await usdtContract.decimals();
    
    const adminUsdtBalance = await usdtContract.balanceOf(state.adminWallet.address);
    const sellerUsdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.sellerWallet);
    const buyerUsdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.buyerWallet);
    
    if (!sellerUsdtContract || !buyerUsdtContract) {
        console.log('Failed to get USDT contracts for seller or buyer');
        return;
    }
    
    const sellerUsdtBalance = await sellerUsdtContract.balanceOf(state.sellerWallet.address);
    const buyerUsdtBalance = await buyerUsdtContract.balanceOf(state.buyerWallet.address);
    
    console.log('\nUSDT Balances:');
    console.log(`Admin: ${ethers.formatUnits(adminUsdtBalance, usdtDecimals)} USDT`);
    console.log(`Seller: ${ethers.formatUnits(sellerUsdtBalance, usdtDecimals)} USDT`);
    console.log(`Buyer: ${ethers.formatUnits(buyerUsdtBalance, usdtDecimals)} USDT`);
    
    // 检查房产代币余额
    if (state.propertyTokenAddress) {
        const propertyToken = await getContract('PropertyToken', state.propertyTokenAddress, state.sellerWallet);
        if (!propertyToken) {
            console.log('Property token contract not found');
            return;
        }
        
        const tokenDecimals = await propertyToken.decimals();
        const adminTokenBalance = await propertyToken.balanceOf(state.adminWallet.address);
        const sellerTokenBalance = await propertyToken.balanceOf(state.sellerWallet.address);
        const buyerTokenBalance = await propertyToken.balanceOf(state.buyerWallet.address);
        
        console.log('\nProperty Token Balances:');
        console.log(`Admin: ${ethers.formatUnits(adminTokenBalance, tokenDecimals)} tokens`);
        console.log(`Seller: ${ethers.formatUnits(sellerTokenBalance, tokenDecimals)} tokens`);
        console.log(`Buyer: ${ethers.formatUnits(buyerTokenBalance, tokenDecimals)} tokens`);
    }
    console.log('===================\n');
}

// 系统初始化
async function initializeSystem() {
  log.step(1, '系统初始化');
  try {
    // 连接到区块链网络
    state.provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await state.provider.getNetwork();
    log.info(`已连接到网络: ${network.name} (chainId: ${network.chainId})`);
    log.info(`RPC URL: ${RPC_URL}`);
    
    // 设置各角色钱包
    state.adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, state.provider);
    state.managerWallet = new ethers.Wallet(MANAGER_PRIVATE_KEY, state.provider);
    state.operatorWallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, state.provider);
    
    // 设置测试账号钱包
    state.sellerWallet = new ethers.Wallet(TEST_ACCOUNTS.seller.privateKey, state.provider);
    state.buyerWallet = new ethers.Wallet(TEST_ACCOUNTS.buyer.privateKey, state.provider);
    
    // 打印地址信息
    const adminAddress = await state.adminWallet.getAddress();
    const managerAddress = await state.managerWallet.getAddress();
    const operatorAddress = await state.operatorWallet.getAddress();
    const sellerAddress = await state.sellerWallet.getAddress();
    const buyerAddress = await state.buyerWallet.getAddress();
    
    log.info(`管理员地址: ${adminAddress}`);
    log.info(`经理地址: ${managerAddress}`);
    log.info(`操作员地址: ${operatorAddress}`);
    log.info(`卖家地址: ${sellerAddress}`);
    log.info(`买家地址: ${buyerAddress}`);
    
    // 确保各角色有足够的ETH
    log.info('确保各角色有足够的ETH...');
    await ensureEthBalance(state.adminWallet, managerAddress, ethers.parseEther("0.5"));
    await ensureEthBalance(state.adminWallet, operatorAddress, ethers.parseEther("0.5"));
    await ensureEthBalance(state.adminWallet, sellerAddress, ethers.parseEther("0.5"));
    await ensureEthBalance(state.adminWallet, buyerAddress, ethers.parseEther("0.5"));
    
    // 确保买家和卖家有足够的USDT
    log.info('确保买家和卖家有足够的USDT...');
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.adminWallet);
    if (!usdtContract) {
        throw new Error('Failed to get USDT contract');
    }
    
    // 获取 USDT 精度
    state.usdtDecimals = await usdtContract.decimals();
    log.info(`USDT 精度: ${state.usdtDecimals}`);
    
    const adminUsdtBalance = await usdtContract.balanceOf(adminAddress);
    log.info(`管理员USDT余额: ${ethers.formatUnits(adminUsdtBalance, state.usdtDecimals)} USDT`);
    
    // 给卖家转账USDT - 修改为更合理的数量
    const sellerUsdtAmount = ethers.parseUnits("1000", state.usdtDecimals); // 1000 USDT
    const sellerUsdtBalance = await usdtContract.balanceOf(sellerAddress);
    if (sellerUsdtBalance < sellerUsdtAmount) {
        log.info(`给卖家转账 ${ethers.formatUnits(sellerUsdtAmount, state.usdtDecimals)} USDT...`);
        const transferTx = await usdtContract.transfer(sellerAddress, sellerUsdtAmount);
        await waitForTransaction(transferTx);
        
        // 等待交易完全确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newBalance = await usdtContract.balanceOf(sellerAddress);
        log.info(`卖家新USDT余额: ${ethers.formatUnits(newBalance, state.usdtDecimals)} USDT`);
    } else {
        log.info(`卖家已有足够的USDT: ${ethers.formatUnits(sellerUsdtBalance, state.usdtDecimals)} USDT`);
    }
    
    // 给买家转账USDT - 修改为更合理的数量
    const buyerUsdtAmount = ethers.parseUnits("1000", state.usdtDecimals); // 1000 USDT
    const buyerUsdtBalance = await usdtContract.balanceOf(buyerAddress);
    if (buyerUsdtBalance < buyerUsdtAmount) {
        log.info(`给买家转账 ${ethers.formatUnits(buyerUsdtAmount, state.usdtDecimals)} USDT...`);
        const transferTx = await usdtContract.transfer(buyerAddress, buyerUsdtAmount);
        await waitForTransaction(transferTx);
        
        // 等待交易完全确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newBalance = await usdtContract.balanceOf(buyerAddress);
        log.info(`买家新USDT余额: ${ethers.formatUnits(newBalance, state.usdtDecimals)} USDT`);
    } else {
        log.info(`买家已有足够的USDT: ${ethers.formatUnits(buyerUsdtBalance, state.usdtDecimals)} USDT`);
    }

    // 设置冷却期为1秒
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.adminWallet);
    if (!tradingManagerContract) {
        throw new Error('Failed to get TradingManager contract');
    }
    
    log.info('设置交易冷却期为1秒...');
    const setCooldownTx = await tradingManagerContract.setCooldownPeriod(1);
    await waitForTransaction(setCooldownTx);
    
    // 等待交易完全确认
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const cooldownPeriod = await tradingManagerContract.cooldownPeriod();
    log.info(`当前冷却期: ${cooldownPeriod.toString()} 秒`);
    
    await checkBalances("After System Initialization");
    
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
    log.info(`- 初始供应量: ${TEST_PROPERTY_INITIAL_SUPPLY}`);
    log.info(`- 初始估值: ${ethers.formatUnits(TEST_PROPERTY_INITIAL_VALUATION)} USDT`);
    log.info(`- 代币单价: ${TEST_PROPERTY_TOKEN_PRICE} USDT`);
    
    // 检查房产是否已存在
    try {
        const existingToken = await facadeContract.getPropertyTokenAddress(state.propertyId);
        if (existingToken !== ethers.ZeroAddress) {
            log.info(`房产已存在，使用现有代币地址: ${existingToken}`);
            state.propertyTokenAddress = existingToken;
            return true;
        }
    } catch (error) {
        log.info(`房产不存在，继续注册流程`);
    }
    
    // 注册房产
    const registerTx = await facadeContract.registerPropertyAndCreateToken(
      state.propertyId,
      TEST_PROPERTY_COUNTRY,
      TEST_PROPERTY_METADATA_URI,
      TEST_PROPERTY_INITIAL_SUPPLY,
      TEST_PROPERTY_NAME,
      TEST_PROPERTY_SYMBOL,
      { gasLimit: 5000000 }  // 增加 gas 限制
    );
    
    log.info('等待交易确认...');
    const receipt = await waitForTransaction(registerTx);
    
    // 验证交易是否成功
    if (receipt.status !== 1) {
        throw new Error('房产注册交易失败');
    }
    
    // 获取代币地址
    state.propertyTokenAddress = await facadeContract.getPropertyTokenAddress(state.propertyId);
    if (!state.propertyTokenAddress || state.propertyTokenAddress === ethers.ZeroAddress) {
        throw new Error('获取代币地址失败');
    }
    log.info(`获取到代币地址: ${state.propertyTokenAddress}`);
    
    // 获取代币信息
    const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.sellerWallet);
    if (!propertyTokenContract) {
        throw new Error('创建代币合约实例失败');
    }
    
    state.propertyToken = propertyTokenContract;
    state.tokenSymbol = await propertyTokenContract.symbol();
    state.tokenName = await propertyTokenContract.name();
    state.tokenDecimals = await propertyTokenContract.decimals();
    
    log.info(`房产代币信息: ${state.tokenName} (${state.tokenSymbol})`);
    log.info(`代币精度: ${state.tokenDecimals}`);
    
    // 验证代币总供应量
    const totalSupply = await propertyTokenContract.totalSupply();
    log.info(`代币总供应量: ${totalSupply.toString()}`);
    
    if (totalSupply.toString() !== TEST_PROPERTY_INITIAL_SUPPLY.toString()) {
        throw new Error(`代币总供应量不匹配，期望 ${TEST_PROPERTY_INITIAL_SUPPLY}，实际 ${totalSupply}`);
    }
    
    await checkBalances("After Property Registration");
    return true;
  } catch (error) {
    log.error(`房产注册失败: ${error.message}`);
    if (error.reason) {
        log.error(`错误原因: ${error.reason}`);
    }
    if (error.data) {
        log.error(`错误数据: ${error.data}`);
    }
    return false;
  }
}

// 更新房产状态
async function updatePropertyStatus() {
  log.step(3, '更新房产状态');
  
  try {
    const facadeContract = await getContract('RealEstateFacade', REAL_ESTATE_FACADE_ADDRESS, state.adminWallet);
    
    // 验证房产是否存在
    const propertyToken = await facadeContract.getPropertyTokenAddress(state.propertyId);
    if (!propertyToken || propertyToken === ethers.ZeroAddress) {
        throw new Error('房产不存在，请先注册房产');
    }
    
    // 获取当前状态
    const currentStatus = await facadeContract.getPropertyStatus(state.propertyId);
    log.info(`当前房产状态: ${currentStatus}`);
    
    // 如果已经是可交易状态，则不需要更新
    if (currentStatus === 2) {
        log.info('房产已经是可交易状态，无需更新');
        return true;
    }
    
    // 更新房产状态为可交易
      const updateStatusTx = await facadeContract.updatePropertyStatus(
      state.propertyId,
      2, // 2 表示可交易状态
      { gasLimit: 500000 }  // 添加 gas 限制
    );
    
    log.info('等待交易确认...');
    const receipt = await waitForTransaction(updateStatusTx);
    
    // 验证交易是否成功
    if (receipt.status !== 1) {
        throw new Error('更新房产状态交易失败');
    }
    
    // 验证状态是否更新成功
    const newStatus = await facadeContract.getPropertyStatus(state.propertyId);
    if (newStatus !== 2) {
        throw new Error(`状态更新失败，期望状态 2，实际状态 ${newStatus}`);
    }
    
    log.success('房产状态更新成功');
    await checkBalances("After Status Update");
      return true;
  } catch (error) {
    log.error(`更新房产状态失败: ${error.message}`);
    if (error.reason) {
        log.error(`错误原因: ${error.reason}`);
    }
    if (error.data) {
        log.error(`错误数据: ${error.data}`);
    }
      return false;
  }
}

// 卖家初始购买房产代币
async function initialInvestorBuy() {
  log.step(4, '卖家初始购买房产代币');
  
  try {
    const propertyManagerContract = await getContract('PropertyManager', PROPERTY_MANAGER_ADDRESS, state.sellerWallet);
    const propertyTokenContract = state.propertyToken;
    const sellerAddress = await state.sellerWallet.getAddress();
    
    // 检查卖家 native token 余额
    const sellerNativeBalance = await state.provider.getBalance(sellerAddress);
    const minNativeBalance = ethers.parseEther("0.5");
    
    log.balance('卖家 native token', ethers.formatEther(sellerNativeBalance));
    
    // 如果余额不足，从管理员钱包转账
    if (sellerNativeBalance < minNativeBalance) {
      log.info(`卖家 native token 余额不足，从管理员钱包转账...`);
      await ensureEthBalance(state.adminWallet, sellerAddress, minNativeBalance);
      
      // 再次检查余额
      const newBalance = await state.provider.getBalance(sellerAddress);
      log.balance('卖家新 native token', ethers.formatEther(newBalance));
    }
    
    // 检查卖家初始代币余额
    const initialTokenBalance = await propertyTokenContract.balanceOf(sellerAddress);
    log.balance(`卖家初始 ${state.tokenSymbol}`, initialTokenBalance.toString());
    
    // 设置购买数量 - 100个代币（整数）
    const purchaseAmount = 100n;
    
    log.info(`初始购买信息:`);
    log.info(`- 房产ID: ${state.propertyId}`);
    log.info(`- 代币: ${state.tokenSymbol}`);
    log.info(`- 数量: ${purchaseAmount.toString()}`);
    
    // 检查并授权 USDT
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.sellerWallet);
    if (!usdtContract) {
        throw new Error('Failed to get USDT contract');
    }
    
    const usdtBalance = await usdtContract.balanceOf(sellerAddress);
    const usdtAllowance = await usdtContract.allowance(sellerAddress, PROPERTY_MANAGER_ADDRESS);
    
    log.info(`卖家USDT余额: ${ethers.formatUnits(usdtBalance, state.usdtDecimals)} USDT (原始值: ${usdtBalance})`);
    log.info(`USDT授权额度: ${ethers.formatUnits(usdtAllowance, state.usdtDecimals)} USDT (原始值: ${usdtAllowance})`);
    
    // 计算需要的USDT金额（考虑代币精度）
    const requiredUsdtAmount = purchaseAmount * (10n ** BigInt(state.usdtDecimals));
    log.info(`需要的USDT金额: ${ethers.formatUnits(requiredUsdtAmount, state.usdtDecimals)} USDT (原始值: ${requiredUsdtAmount})`);
    
    if (usdtAllowance < requiredUsdtAmount) {
        log.info(`授权USDT给PropertyManager...`);
        // 先清零授权
        const resetTx = await usdtContract.approve(PROPERTY_MANAGER_ADDRESS, 0);
        await waitForTransaction(resetTx);
        
        // 设置新的授权额度
        const approveTx = await usdtContract.approve(PROPERTY_MANAGER_ADDRESS, requiredUsdtAmount);
        await waitForTransaction(approveTx);
        
        // 等待交易完全确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newAllowance = await usdtContract.allowance(sellerAddress, PROPERTY_MANAGER_ADDRESS);
        log.info(`新的USDT授权额度: ${ethers.formatUnits(newAllowance, state.usdtDecimals)} USDT (原始值: ${newAllowance})`);
    }
    
    // 执行初始购买
    const initialBuyTx = await propertyManagerContract.initialBuyPropertyToken(
      state.propertyId,
      purchaseAmount,
      { gasLimit: 500000 }
            );
    
    await waitForTransaction(initialBuyTx);
    
    // 等待交易完全确认
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查卖家新的代币余额和USDT余额
    const newTokenBalance = await propertyTokenContract.balanceOf(sellerAddress);
    const newUsdtBalance = await usdtContract.balanceOf(sellerAddress);
    
    log.info(`卖家新 ${state.tokenSymbol} 余额: ${ethers.formatUnits(newTokenBalance, state.tokenDecimals)} (原始值: ${newTokenBalance})`);
    log.info(`卖家新 USDT 余额: ${ethers.formatUnits(newUsdtBalance, state.usdtDecimals)} USDT (原始值: ${newUsdtBalance})`);
    log.info(`USDT 余额变化: ${ethers.formatUnits(usdtBalance - newUsdtBalance, state.usdtDecimals)} USDT (原始值: ${usdtBalance - newUsdtBalance})`);
    
    await checkBalances("After Initial Buy");
    return true;
  } catch (error) {
    log.error(`卖家初始购买失败: ${error.message}`);
    if (error.reason) {
      log.error(`错误原因: ${error.reason}`);
    }
    return false;
  }
}

// 创建买单
async function createBuyOrder() {
    log.step(2, '创建买单');
  try {
        const buyerAddress = await state.buyerWallet.getAddress();
        const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.buyerWallet);
        if (!propertyTokenContract) {
            throw new Error('Failed to get PropertyToken contract');
        }
        
        const tokenDecimals = await propertyTokenContract.decimals();
        const amount = ethers.parseUnits("1", tokenDecimals); // 1个代币
        const price = ethers.parseUnits("10", state.usdtDecimals); // 10 USDT
        const totalAmount = amount * price / ethers.parseUnits("1", tokenDecimals);
        
        log.info(`创建买单: ${ethers.formatUnits(amount, tokenDecimals)} 个代币, 单价 ${ethers.formatUnits(price, state.usdtDecimals)} USDT`);
        log.info(`总金额: ${ethers.formatUnits(totalAmount, state.usdtDecimals)} USDT`);
        log.info(`房产ID: ${state.propertyId}`);
    
        // 检查USDT余额
        const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.buyerWallet);
        if (!usdtContract) {
            throw new Error('Failed to get USDT contract');
        }
        
        const usdtBalance = await usdtContract.balanceOf(buyerAddress);
        log.info(`买家USDT余额: ${ethers.formatUnits(usdtBalance, state.usdtDecimals)} USDT`);
        
        if (usdtBalance < totalAmount) {
            throw new Error(`USDT余额不足: 需要 ${ethers.formatUnits(totalAmount, state.usdtDecimals)} USDT, 当前余额 ${ethers.formatUnits(usdtBalance, state.usdtDecimals)} USDT`);
        }
        
        // 检查USDT授权
        const usdtAllowance = await usdtContract.allowance(buyerAddress, TRADING_MANAGER_ADDRESS);
        log.info(`USDT授权额度: ${ethers.formatUnits(usdtAllowance, state.usdtDecimals)} USDT`);
    
        if (usdtAllowance < totalAmount) {
            log.info(`授权USDT给交易管理器...`);
            const approveTx = await usdtContract.approve(TRADING_MANAGER_ADDRESS, totalAmount);
            await waitForTransaction(approveTx);
            
            // 等待交易完全确认
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const newAllowance = await usdtContract.allowance(buyerAddress, TRADING_MANAGER_ADDRESS);
            log.info(`新的USDT授权额度: ${ethers.formatUnits(newAllowance, state.usdtDecimals)} USDT`);
        }
        
        const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.buyerWallet);
        if (!tradingManagerContract) {
            throw new Error('Failed to get TradingManager contract');
      }
        
        log.info(`准备创建买单:
            - 代币地址: ${state.propertyTokenAddress}
            - 房产ID: ${state.propertyId}
            - 数量: ${ethers.formatUnits(amount, tokenDecimals)} 个代币
            - 单价: ${ethers.formatUnits(price, state.usdtDecimals)} USDT
        `);
    
        // 确保 propertyId 存在
        if (!state.propertyId) {
            throw new Error('Property ID is not set');
        }
        
        const createOrderTx = await tradingManagerContract.createBuyOrder(
        state.propertyTokenAddress,
            state.propertyId,  // 确保传递 propertyId
            amount,
            price,
            { gasLimit: 500000 }
    );
    
        log.info('等待买单创建交易确认...');
        const receipt = await waitForTransaction(createOrderTx);
        
        // 等待交易完全确认
        await new Promise(resolve => setTimeout(resolve, 2000));
    
        // 获取并保存买单ID
        log.info('获取用户订单列表...');
        const orderIds = await tradingManagerContract.getUserOrders(buyerAddress);
        log.info(`用户订单列表: ${orderIds}`);
        
        if (orderIds.length === 0) {
            throw new Error('No orders found for user');
        }
        
        state.buyOrderId = orderIds[orderIds.length - 1];
        log.info(`买单创建成功，订单ID: ${state.buyOrderId}`);
    
        // 验证订单是否存在
        const order = await tradingManagerContract.getOrder(state.buyOrderId);
        if (!order) {
            throw new Error(`Created order ${state.buyOrderId} not found`);
        }
        
        log.info(`订单验证成功:
            - 订单ID: ${order.id}
            - 买家地址: ${order.seller}
            - 代币地址: ${order.token}
            - 房产ID: ${order.propertyId}
            - 代币数量: ${ethers.formatUnits(order.amount, tokenDecimals)} 个代币
            - 单价: ${ethers.formatUnits(order.price, state.usdtDecimals)} USDT
            - 是否活跃: ${order.active ? '是' : '否'}
            - 订单类型: ${order.isSellOrder ? '卖单' : '买单'}
        `);
    
    return true;
  } catch (error) {
        log.error(`创建买单失败: ${error.message}`);
    if (error.reason) {
      log.error(`错误原因: ${error.reason}`);
    }
    if (error.data) {
      log.error(`错误数据: ${error.data}`);
    }
    return false;
  }
}

// 创建卖单
async function createSellOrder() {
  log.step(3, '创建卖单');
  try {
    const sellerAddress = await state.sellerWallet.getAddress();
    const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.sellerWallet);
    if (!propertyTokenContract) {
        throw new Error('Failed to get PropertyToken contract');
    }
    
    const tokenDecimals = await propertyTokenContract.decimals();
    const amount = ethers.parseUnits("2", tokenDecimals); // 2个代币
    const price = ethers.parseUnits("10", state.usdtDecimals); // 10 USDT
    
    log.info(`创建卖单: ${ethers.formatUnits(amount, tokenDecimals)} 个代币, 单价 ${ethers.formatUnits(price, state.usdtDecimals)} USDT`);
    
    // 检查代币余额
    const tokenBalance = await propertyTokenContract.balanceOf(sellerAddress);
    log.info(`卖家代币余额: ${ethers.formatUnits(tokenBalance, tokenDecimals)} 个代币`);
    
    if (tokenBalance < amount) {
        throw new Error(`代币余额不足: 需要 ${ethers.formatUnits(amount, tokenDecimals)} 个代币, 当前余额 ${ethers.formatUnits(tokenBalance, tokenDecimals)} 个代币`);
    }
    
    // 检查代币授权
    const tokenAllowance = await propertyTokenContract.allowance(sellerAddress, TRADING_MANAGER_ADDRESS);
    log.info(`代币授权额度: ${ethers.formatUnits(tokenAllowance, tokenDecimals)} 个代币`);
    
    if (tokenAllowance < amount) {
        log.info(`授权代币给交易管理器...`);
        const approveTx = await propertyTokenContract.approve(TRADING_MANAGER_ADDRESS, amount);
        await waitForTransaction(approveTx);
        
        // 等待交易完全确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newAllowance = await propertyTokenContract.allowance(sellerAddress, TRADING_MANAGER_ADDRESS);
        log.info(`新的代币授权额度: ${ethers.formatUnits(newAllowance, tokenDecimals)} 个代币`);
      }
    
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.sellerWallet);
    if (!tradingManagerContract) {
        throw new Error('Failed to get TradingManager contract');
    }
    
    const createOrderTx = await tradingManagerContract.createSellOrder(
        state.propertyTokenAddress,
        state.propertyId,
        amount,
        price,
        { gasLimit: 500000 }
    );
    await waitForTransaction(createOrderTx);
    
    // 获取并保存卖单ID
    const orderIds = await tradingManagerContract.getUserOrders(sellerAddress);
    state.sellOrderId = orderIds[orderIds.length - 1];
    log.info(`卖单创建成功，订单ID: ${state.sellOrderId}`);
    
    // 等待交易完全确认
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    log.error(`创建卖单失败: ${error.message}`);
    return false;
  }
}

/**
 * @dev 购买卖单
 */
async function buyOrder(orderId) {
    try {
        log.step(4, '执行买单,orderId:' + orderId);
        
        // 检查 orderId
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        log.info(`开始执行买单，订单ID: ${orderId}`);
        
        // 获取合约实例
        const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.buyerWallet);
        if (!tradingManagerContract) {
            throw new Error('Failed to get TradingManager contract');
        }
        log.info(`成功获取 TradingManager 合约实例`);
        
        // 验证合约方法是否存在
        if (typeof tradingManagerContract.buyOrder !== 'function') {
            throw new Error('buyOrder method not found in contract');
        }
        log.info(`验证 buyOrder 方法存在`);
        
        const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.buyerWallet);
        if (!usdtContract) {
            throw new Error('Failed to get USDT contract');
        }
        log.info(`成功获取 USDT 合约实例`);
        
        const buyerAddress = await state.buyerWallet.getAddress();
        log.info(`买家地址: ${buyerAddress}`);
        
        // 获取卖单信息
        log.info(`获取订单信息...`);
        const order = await tradingManagerContract.getOrder(orderId);
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }
        log.info(`成功获取订单信息`);
        
        log.info(`卖单信息:
            - 订单ID: ${order.id}
            - 卖家地址: ${order.seller}
            - 代币地址: ${order.token}
            - 房产ID: ${order.propertyId}
            - 代币数量: ${ethers.formatUnits(order.amount, state.tokenDecimals)} ${state.tokenSymbol}
            - 单价: ${ethers.formatUnits(order.price, 18)} USDT
            - 创建时间: ${new Date(Number(order.timestamp) * 1000).toLocaleString()}
            - 是否活跃: ${order.active ? '是' : '否'}
            - 订单类型: ${order.isSellOrder ? '卖单' : '买单'}
        `);

        // 计算需要的USDT数量（包含手续费）
        const usdtAmount = order.amount * order.price;
        const feeRate = await tradingManagerContract.feeRate();
        const usdtFee = (usdtAmount * feeRate) / BigInt(10000);
        const totalUsdt = usdtAmount + usdtFee;
        
        log.info(`交易详情:
            - 购买数量: ${ethers.formatUnits(order.amount, state.tokenDecimals)} ${state.tokenSymbol}
            - 单价: ${ethers.formatUnits(order.price, 18)} USDT
            - 基础金额: ${ethers.formatUnits(usdtAmount, 18)} USDT
            - 手续费率: ${Number(feeRate) / 100}%
            - 手续费: ${ethers.formatUnits(usdtFee, 18)} USDT
            - 总金额: ${ethers.formatUnits(totalUsdt, 18)} USDT
        `);
        
        // 检查USDT余额
        const usdtBalance = await usdtContract.balanceOf(buyerAddress);
        log.info(`买家USDT余额: ${ethers.formatUnits(usdtBalance, 18)} USDT`);
        
        if (usdtBalance < totalUsdt) {
            // 如果余额不足，从管理员转账更多的USDT
            log.info(`USDT余额不足，从管理员转账更多USDT...`);
            const adminUsdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.adminWallet);
            const transferAmount = totalUsdt * BigInt(2); // 转账两倍所需金额
            
            const transferTx = await adminUsdtContract.transfer(buyerAddress, transferAmount);
            await transferTx.wait();
            
            const newBalance = await usdtContract.balanceOf(buyerAddress);
            log.info(`转账完成，新USDT余额: ${ethers.formatUnits(newBalance, 18)} USDT`);
        }
        
        // 检查USDT授权额度
        const currentAllowance = await usdtContract.allowance(buyerAddress, TRADING_MANAGER_ADDRESS);
        log.info(`当前USDT授权额度: ${ethers.formatUnits(currentAllowance, 18)} USDT`);
        
        // 如果授权额度不足，进行授权
        if (currentAllowance < totalUsdt) {
            log.info(`USDT授权额度不足，正在授权...`);
            // 先清零授权
            log.info(`清零当前授权...`);
            const resetTx = await usdtContract.approve(TRADING_MANAGER_ADDRESS, 0);
            await resetTx.wait();
            
            // 设置新的授权额度（授权10倍所需金额）
            const approveAmount = totalUsdt * BigInt(10);
            log.info(`设置新的授权额度: ${ethers.formatUnits(approveAmount, 18)} USDT`);
            const approveTx = await usdtContract.approve(TRADING_MANAGER_ADDRESS, approveAmount);
            await approveTx.wait();
            
            // 再次检查授权额度
            const newAllowance = await usdtContract.allowance(buyerAddress, TRADING_MANAGER_ADDRESS);
            log.info(`新的USDT授权额度: ${ethers.formatUnits(newAllowance, 18)} USDT`);
            
            if (newAllowance < totalUsdt) {
                throw new Error(`USDT授权失败，当前授权额度 ${ethers.formatUnits(newAllowance, 18)} 小于需要的 ${ethers.formatUnits(totalUsdt, 18)}`);
            }
        }

        // 执行买单
        log.info(`准备执行买单:
            - 卖单ID: ${orderId}
            - 买家地址: ${buyerAddress}
            - 交易管理器地址: ${TRADING_MANAGER_ADDRESS}
        `);
        
        try {
            log.info(`调用 buyOrder 方法...`);
        const tx = await tradingManagerContract.buyOrder(orderId);
        log.info(`买单交易已发送，等待确认...`);
        const receipt = await waitForTransaction(tx);
        log.info(`买单执行成功，交易哈希: ${receipt.hash}`);
        } catch (txError) {
            log.error(`交易执行失败: ${txError.message}`);
            if (txError.reason) {
                log.error(`错误原因: ${txError.reason}`);
            }
            if (txError.data) {
                log.error(`错误数据: ${txError.data}`);
            }
            throw txError;
        }

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
async function sellOrder() {
    log.step(5, '执行卖单');
    try {
        // 首先检查 state.buyOrderId 是否存在
        if (!state.buyOrderId) {
            throw new Error('Buy order ID is required. Please create a buy order first.');
        }
        log.info(`准备执行卖单，使用买单ID: ${state.buyOrderId}`);
        
        const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, state.sellerWallet);
        if (!tradingManagerContract) {
            throw new Error('Failed to get TradingManager contract');
        }
        
        // 使用 getOrder 方法获取订单信息
        const order = await tradingManagerContract.getOrder(state.buyOrderId);
        if (!order) {
            throw new Error(`Order ${state.buyOrderId} not found`);
        }
        
        // 验证是否是买单
        if (order.isSellOrder) {
            throw new Error('Not a buy order');
        }
        
        // 检查代币余额和授权
        const propertyTokenContract = await getContract('PropertyToken', order.token, state.sellerWallet);
        if (!propertyTokenContract) {
            throw new Error('Failed to get PropertyToken contract');
        }
        
        const tokenDecimals = await propertyTokenContract.decimals();
        const sellerBalance = await propertyTokenContract.balanceOf(await state.sellerWallet.getAddress());
        const allowance = await propertyTokenContract.allowance(await state.sellerWallet.getAddress(), TRADING_MANAGER_ADDRESS);
        
        log.info(`执行卖单: ${ethers.formatUnits(order.amount, tokenDecimals)} 个代币, 单价 ${ethers.formatUnits(order.price, state.usdtDecimals)} USDT`);
        log.info(`卖家代币余额: ${ethers.formatUnits(sellerBalance, tokenDecimals)} 个代币`);
        log.info(`代币授权额度: ${ethers.formatUnits(allowance, tokenDecimals)} 个代币`);
        
        if (sellerBalance < order.amount) {
            throw new Error(`Insufficient token balance. Required: ${ethers.formatUnits(order.amount, tokenDecimals)}, Available: ${ethers.formatUnits(sellerBalance, tokenDecimals)}`);
        }
        
        if (allowance < order.amount) {
            log.info('授权代币给交易管理器...');
            const approveTx = await propertyTokenContract.approve(TRADING_MANAGER_ADDRESS, order.amount);
            await waitForTransaction(approveTx);
            
            // 等待交易完全确认
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const newAllowance = await propertyTokenContract.allowance(await state.sellerWallet.getAddress(), TRADING_MANAGER_ADDRESS);
            log.info(`新的代币授权额度: ${ethers.formatUnits(newAllowance, tokenDecimals)} 个代币`);
        }
        
        // 执行卖单 - 只传入买单ID
        const tx = await tradingManagerContract.sellOrder(state.buyOrderId, { gasLimit: 500000 });
        log.info(`卖单交易已发送，等待确认...`);
        const receipt = await waitForTransaction(tx);
        log.info(`卖单执行成功，交易哈希: ${receipt.hash}`);

        return true;
    } catch (error) {
        log.error(`执行卖单失败: ${error.message}`);
        if (error.reason) {
            log.error(`错误原因: ${error.reason}`);
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
        await waitForTransaction(resetTx);
        
        // 等待交易完全确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const approveAmount = distributionAmount * BigInt(2); // 授权两倍所需金额
        const approveTx = await usdtContract.approve(REWARD_MANAGER_ADDRESS, approveAmount);
        await waitForTransaction(approveTx);
        
        // 等待交易完全确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
        await waitForTransaction(addTx);
        
        // 等待交易完全确认
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        log.info(`USDT已添加到支持的稳定币列表中`);
    } catch (error) {
        // 如果已经添加过，忽略错误
        if (!error.message.includes("already supported")) {
            throw error;
        }
        log.info(`USDT已经在支持的稳定币列表中`);
    }
    
    // 获取卖家余额和总供应量
    const sellerBalance = await propertyTokenContract.balanceOf(state.sellerWallet.address);
    const totalSupply = await propertyTokenContract.totalSupply();
    
    // 计算卖家的可领取金额
    const eligibleAmount = (distributionAmount * BigInt(sellerBalance.toString())) / BigInt(totalSupply.toString());
    
    // 创建默克尔树数据
    const merkleData = {
        address: state.sellerWallet.address,
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
      const receipt = await waitForTransaction(createTx);
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
      await waitForTransaction(updateStatusTx);
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

// 修改领取收益函数
async function claimReward(distributionId) {
    try {
        console.log('\n[INFO] 开始领取收益...');

        // Grant OPERATOR_ROLE to seller
        const systemContract = await getContract('RealEstateSystem', SYSTEM_ADDRESS, state.adminWallet);
        const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('OPERATOR_ROLE'));
        await systemContract.grantRole(OPERATOR_ROLE, state.sellerWallet.address);
        console.log('[INFO] 已授予卖家 OPERATOR_ROLE 权限');

        // Connect to seller's wallet
        const rewardManager = await getContract('RewardManager', REWARD_MANAGER_ADDRESS, state.sellerWallet);
        const propertyTokenContract = await getContract('PropertyToken', state.propertyTokenAddress, state.sellerWallet);

        // 获取分配信息
        console.log('[INFO] 获取分配信息...');
        const distribution = await rewardManager.getDistribution(distributionId);
        console.log('[INFO] 分配信息:', distribution);

        // 检查分配是否存在
        if (!distribution) {
            throw new Error(`分配ID ${distributionId} 不存在`);
        }

        // 获取代币余额和总供应量
        const sellerBalance = await propertyTokenContract.balanceOf(state.sellerWallet.address);
        const totalSupply = await propertyTokenContract.totalSupply();

        console.log('[INFO] 代币信息:');
        console.log(`- 卖家余额: ${ethers.formatUnits(sellerBalance, 18)}`);
        console.log(`- 总供应量: ${ethers.formatUnits(totalSupply, 18)}`);

        // 计算可领取金额（按比例）
        const totalAmount = BigInt(distribution[8].toString());
        const eligibleAmount = (totalAmount * BigInt(sellerBalance.toString())) / BigInt(totalSupply.toString());
        console.log('[INFO] 可领取金额:', ethers.formatUnits(eligibleAmount, 18));

        // 创建默克尔树数据
        const merkleData = {
            address: state.sellerWallet.address,
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
        const usdtContract1 = await getContract('SimpleERC20', USDT_ADDRESS, state.sellerWallet);
        const balance1 = await usdtContract1.balanceOf(state.sellerWallet.address);
        console.log('[INFO] 卖家领取前USDT余额:', ethers.formatUnits(balance1, 18));

        // 验证默克尔证明
        console.log('[INFO] 开始合约验证默克尔证明...');
        const isValidOnChain = await rewardManager.verifyMerkleProof(
            distributionId,
            state.sellerWallet.address,
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
            state.sellerWallet.address,
            eligibleAmount,
            totalAmount,
            merkleProof
        );
        
        const receipt = await waitForTransaction(tx);
        
        // 获取领取后的余额
        const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, state.sellerWallet);
        const balance = await usdtContract.balanceOf(state.sellerWallet.address);
        console.log('[INFO] 卖家USDT余额:', ethers.formatUnits(balance, 18));
        
    } catch (error) {
        console.error('[ERROR] 卖家领取收益失败:', error);
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
    await initializeSystem();
        await checkBalances("After System Initialization");

    await registerProperty();
        await checkBalances("After Property Registration");

    await updatePropertyStatus();
        await checkBalances("After Status Update");

        // seller 初始购买房产代币
    await initialInvestorBuy();
        await checkBalances("After Initial Buy");

        // seller 创建卖单
    await createSellOrder();
        await checkBalances("After Sell Order Creation");

        // buyer 创建买单
        log.info('开始创建买单流程...');
        const buyOrderCreated = await createBuyOrder();
        if (!buyOrderCreated) {
            throw new Error('创建买单失败');
        }
        await checkBalances("After Buy Order Creation");

        // buyer 执行卖单（使用卖单ID）
        log.info(`准备执行卖单，使用订单ID: ${state.sellOrderId}`);
        if (!state.sellOrderId) {
            throw new Error('卖单ID未设置');
        }
        const buyOrderExecuted = await buyOrder(state.sellOrderId);
        if (!buyOrderExecuted) {
            throw new Error('执行卖单失败');
        }
        await checkBalances("After Buy Execution");

        // seller 执行买单（使用买单ID）
        log.info(`准备执行买单，使用订单ID: ${state.buyOrderId}`);
        if (!state.buyOrderId) {
            throw new Error('买单ID未设置');
        }
        const sellOrderExecuted = await sellOrder();
        if (!sellOrderExecuted) {
            throw new Error('执行买单失败');
        }
        await checkBalances("After Sell Execution");

    // 创建收益分配
    await createDistribution();
        await checkBalances("After Distribution Creation");

        // 领取收益
        await claimReward(state.distributionId);
        await checkBalances("After Reward Claim");

        console.log("测试流程完成");
  } catch (error) {
        console.error("测试流程失败:", error);
        throw error;
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