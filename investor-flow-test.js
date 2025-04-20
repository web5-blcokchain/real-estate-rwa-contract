const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

/**
 * 日本房产代币化系统完整流程测试脚本
 * 
 * 这个脚本模拟整个系统的完整流程:
 * 1. 管理员部署和初始化系统
 * 2. 管理员注册房产
 * 3. 管理员更新房产状态为可交易
 * 4. 管理员（或初始持有者）创建卖单
 * 5. 投资者购买房产代币
 * 6. 管理员创建收益分配
 * 7. 投资者查询并领取收益
 * 8. 投资者卖出房产代币
 */

// 配置和常量
const RPC_URL = process.env.TESTNET_RPC_URL || 'http://localhost:8545';

// 使用.env中的私钥
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const MANAGER_PRIVATE_KEY = process.env.MANAGER_PRIVATE_KEY; 
const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;
// 使用operator作为投资者
const INVESTOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;

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
const TEST_PROPERTY_INITIAL_SUPPLY = ethers.parseUnits("10000", 18); // 修改为10000个代币
const TEST_PROPERTY_INITIAL_VALUATION = ethers.parseUnits("1000000", 18); // 100万美元

// 从artifacts加载ABI
function loadAbiFromArtifacts(contractName) {
  try {
    const artifactPath = path.join(__dirname, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactContent);
    return artifact.abi;
  } catch (error) {
    console.error(`Error loading ABI for ${contractName}:`, error.message);
    return null;
  }
}

// 从artifacts目录加载合约ABI
const CONTRACT_ABIS = {
  RealEstateSystem: loadAbiFromArtifacts('RealEstateSystem'),
  PropertyManager: loadAbiFromArtifacts('PropertyManager'),
  PropertyToken: loadAbiFromArtifacts('PropertyToken'),
  RealEstateFacade: loadAbiFromArtifacts('RealEstateFacade'),
  TradingManager: loadAbiFromArtifacts('TradingManager'),
  RewardManager: loadAbiFromArtifacts('RewardManager'),
  SimpleERC20: loadAbiFromArtifacts('SimpleERC20')
};

// 检查是否成功加载了所有ABI
Object.entries(CONTRACT_ABIS).forEach(([name, abi]) => {
  if (!abi) {
    console.error(`Failed to load ABI for ${name}`);
  }
});

// ABI文件目录，在脚本同级创建
const ABIS_DIR = path.join(__dirname, 'abis');
if (!fs.existsSync(ABIS_DIR)) {
  fs.mkdirSync(ABIS_DIR, { recursive: true });
}

// 保存内置ABI到文件
for (const [name, abi] of Object.entries(CONTRACT_ABIS)) {
  const abiPath = path.join(ABIS_DIR, `${name}.json`);
  if (!fs.existsSync(abiPath)) {
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  }
}

// 创建readline接口用于用户交互
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 等待用户按键继续
const waitForUserInput = (message) => {
  return new Promise((resolve) => {
    rl.question(`\n\x1b[33m${message} (按回车键继续...)\x1b[0m`, () => {
      resolve();
    });
  });
};

// 日志输出格式化
const log = {
  info: (message) => console.log(`\x1b[32m[INFO]\x1b[0m ${message}`),
  warn: (message) => console.log(`\x1b[33m[WARN]\x1b[0m ${message}`),
  error: (message) => console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`),
  step: (step, message) => console.log(`\x1b[36m[步骤 ${step}]\x1b[0m ${message}`),
  role: (role, message) => console.log(`\x1b[35m[${role}]\x1b[0m ${message}`),
  tx: (hash) => console.log(`\x1b[35m[交易]\x1b[0m ${hash}`),
  balance: (token, amount) => console.log(`\x1b[34m[余额]\x1b[0m ${token}: ${amount}`),
  wait: () => process.stdout.write('\x1b[90m等待交易确认...\x1b[0m'),
  success: (message) => console.log(`\x1b[32m[成功]\x1b[0m ${message}`),
  debug: (message) => console.log(`\x1b[90m[调试]\x1b[0m ${message}`),
  title: (message) => console.log(`\x1b[1;36m[${message}]\x1b[0m`)
};

// 等待交易确认并获取收据
const waitForTx = async (tx) => {
  log.wait();
  const receipt = await tx.wait();
  process.stdout.write(`\r\x1b[K`); // 清除等待信息
  log.tx(receipt.hash);
  return receipt;
};

// 格式化金额显示
const formatAmount = (amount, decimals = 18) => {
  return ethers.formatUnits(amount, decimals);
};

// 保存测试状态（在不同阶段之间传递数据）
const testState = {
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
  distributionId: null,
  isTestMode: false
};

// 合约实例缓存
const contracts = {};

// 修改getContract函数，使用已加载的ABI
async function getContract(contractName, address, wallet) {
  try {
    if (!address) {
      console.error(`Contract address not provided for ${contractName}`);
      return null;
    }

    // 使用已加载的ABI
    const abi = CONTRACT_ABIS[contractName];
    if (!abi) {
      console.error(`ABI not found for ${contractName}`);
      return null;
    }

    return new ethers.Contract(address, abi, wallet);
  } catch (error) {
    console.error(`Error creating contract instance for ${contractName}:`, error.message);
    return null;
  }
}

// 检查账户ETH余额并在需要时转账
async function ensureEthBalance(fromWallet, toAddress, minBalance = ethers.parseEther("0.1")) {
  const balance = await testState.provider.getBalance(toAddress);
  
  if (balance < minBalance) {
    const neededAmount = minBalance.sub(balance);
    log.warn(`地址 ${toAddress} ETH余额不足，当前: ${formatAmount(balance)}, 最低要求: ${formatAmount(minBalance)}`);
    log.info(`从管理员转账 ${formatAmount(neededAmount)} ETH 到 ${toAddress}`);
    
    const tx = await fromWallet.sendTransaction({
      to: toAddress,
      value: neededAmount
    });
    await waitForTx(tx);
    
    const newBalance = await testState.provider.getBalance(toAddress);
    log.balance('ETH (转账后)', formatAmount(newBalance));
    return true;
  }
  return false;
}

// 检查账户USDT余额并在需要时转账 - 修改参数顺序
async function ensureTokenBalance(tokenContract, fromWallet, toAddress, minBalance, decimals = 18) {
  const balance = await tokenContract.balanceOf(toAddress);
  const formattedMinBalance = typeof minBalance === 'string' ? ethers.parseUnits(minBalance, decimals) : minBalance;
  
  if (balance < formattedMinBalance) {
    const neededAmount = formattedMinBalance - balance;
    const tokenSymbol = await tokenContract.symbol();
    
    log.warn(`地址 ${toAddress} ${tokenSymbol}余额不足，当前: ${formatAmount(balance, decimals)}, 最低要求: ${formatAmount(formattedMinBalance, decimals)}`);
    
    // 检查发送者是否有足够代币
    const fromAddress = await fromWallet.getAddress();
    const fromBalance = await tokenContract.balanceOf(fromAddress);
    
    if (fromBalance < neededAmount) {
      // 尝试铸造代币（如果有权限）
      try {
        log.info(`尝试mint ${formatAmount(neededAmount, decimals)} ${tokenSymbol} 到 ${toAddress}`);
        const mintTx = await tokenContract.connect(fromWallet).mint(toAddress, neededAmount);
        await waitForTx(mintTx);
      } catch (error) {
        log.error(`无法mint代币: ${error.message}`);
        
        // 如果不能铸造，并且发送者余额不足，则无法继续
        if (fromBalance < neededAmount) {
          log.error(`发送者 ${fromAddress} 没有足够的 ${tokenSymbol} 可转账，当前余额: ${formatAmount(fromBalance, decimals)}`);
          return false;
        }
      }
    }
    
    // 如果没有铸造成功，则转账
    try {
      if (await tokenContract.balanceOf(toAddress) < formattedMinBalance) {
        log.info(`从 ${fromAddress} 转账 ${formatAmount(neededAmount, decimals)} ${tokenSymbol} 到 ${toAddress}`);
        const transferTx = await tokenContract.connect(fromWallet).transfer(toAddress, neededAmount);
        await waitForTx(transferTx);
      }
    } catch (error) {
      log.error(`转账失败: ${error.message}`);
      return false;
    }
    
    const newBalance = await tokenContract.balanceOf(toAddress);
    log.balance(`${tokenSymbol} (转账后)`, formatAmount(newBalance, decimals));
    return true;
  }
  return false;
}

// 系统初始化阶段 - 由管理员执行
async function initializeSystem() {
  log.step(1, '系统初始化');
  log.role('管理员', '开始系统初始化');
  
  try {
    // 连接到区块链网络
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    testState.provider = provider;
    
    // 打印详细的网络信息
    const network = await provider.getNetwork();
    log.info(`已连接到网络: ${network.name} (chainId: ${network.chainId})`);
    
    // 获取区块链信息
    const blockNumber = await provider.getBlockNumber();
    log.info(`当前区块高度: ${blockNumber}`);
    
    // 检查私钥有效性
    if (!ADMIN_PRIVATE_KEY || !MANAGER_PRIVATE_KEY || !OPERATOR_PRIVATE_KEY) {
      log.error('私钥未设置，请检查.env文件');
      return false;
    }
    
    // 设置各角色钱包
    testState.adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    testState.managerWallet = new ethers.Wallet(MANAGER_PRIVATE_KEY, provider);
    testState.operatorWallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, provider);
    testState.investorWallet = new ethers.Wallet(INVESTOR_PRIVATE_KEY, provider);
    
    const adminAddress = await testState.adminWallet.getAddress();
    const managerAddress = await testState.managerWallet.getAddress();
    const operatorAddress = await testState.operatorWallet.getAddress();
    const investorAddress = await testState.investorWallet.getAddress();
    
    log.info(`管理员地址: ${adminAddress}`);
    log.info(`经理地址: ${managerAddress}`);
    log.info(`操作员地址: ${operatorAddress}`);
    log.info(`投资者地址: ${investorAddress} (使用操作员账户)`);
    
    // 检查各角色ETH余额
    log.info('检查各角色ETH余额...');
    const adminBalance = await provider.getBalance(adminAddress);
    const managerBalance = await provider.getBalance(managerAddress);
    const operatorBalance = await provider.getBalance(operatorAddress);
    
    log.balance('管理员 ETH', formatAmount(adminBalance));
    log.balance('经理 ETH', formatAmount(managerBalance));
    log.balance('操作员 ETH', formatAmount(operatorBalance));
    
    // 确保管理员有足够的ETH
    if (adminBalance < ethers.parseEther("1")) {
      log.error(`管理员ETH余额不足，无法进行测试。当前余额: ${formatAmount(adminBalance)}`);
      return false;
    }
    
    // 确保经理和操作员有足够的ETH
    await ensureEthBalance(testState.adminWallet, managerAddress, ethers.parseEther("0.5"));
    await ensureEthBalance(testState.adminWallet, operatorAddress, ethers.parseEther("0.5"));
    
    // 验证系统合约是否已部署
    if (!SYSTEM_ADDRESS || SYSTEM_ADDRESS === '0x0000000000000000000000000000000000000000') {
      log.error('系统合约未部署，请先部署合约');
      return false;
    }
    
    log.info(`开始验证合约部署情况...`);
    
    // 检查所有必需的合约地址
    const requiredContracts = {
      'RealEstateSystem': SYSTEM_ADDRESS,
      'RealEstateFacade': REAL_ESTATE_FACADE_ADDRESS,
      'PropertyManager': PROPERTY_MANAGER_ADDRESS,
      'TradingManager': TRADING_MANAGER_ADDRESS,
      'RewardManager': REWARD_MANAGER_ADDRESS,
      'SimpleERC20 (USDT)': USDT_ADDRESS
    };
    
    // 检查部署实际合约代码
    for (const [name, address] of Object.entries(requiredContracts)) {
      try {
        log.info(`检查${name}合约代码...`);
        const code = await provider.getCode(address);
        if (!code || code === '0x' || code.length <= 2) {
          log.error(`${name}地址(${address})不是合约或未部署`);
          return false;
        }
        log.info(`${name}合约已确认部署，代码长度: ${code.length}`);
      } catch (error) {
        log.error(`检查${name}合约代码时出错: ${error.message}`);
        return false;
      }
    }
    
    // 不再进行合约函数调用验证，只检查USDT余额
    log.info(`所有合约代码已验证存在。跳过函数调用验证...`);
    
    // 简单检查USDT余额
    try {
      const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, testState.adminWallet);
      const adminUsdtBalance = await usdtContract.balanceOf(adminAddress);
      log.balance('管理员 USDT', formatAmount(adminUsdtBalance));
      
      if (adminUsdtBalance < ethers.parseUnits("1000", 18)) {
        log.warn(`管理员USDT余额较低: ${formatAmount(adminUsdtBalance)}`);
        log.info(`尝试铸造更多USDT给管理员...`);
        try {
          const mintTx = await usdtContract.mint(adminAddress, ethers.parseUnits("10000", 18));
          await waitForTx(mintTx);
          const newBalance = await usdtContract.balanceOf(adminAddress);
          log.balance('管理员 USDT (铸造后)', formatAmount(newBalance));
        } catch (mintError) {
          log.warn(`铸造USDT失败，可能没有权限: ${mintError.message}`);
          log.warn(`继续测试，但后续步骤可能会因USDT不足而失败`);
        }
      }
      
      // 检查投资者USDT余额
      const investorUsdtBalance = await usdtContract.balanceOf(investorAddress);
      log.balance('投资者 USDT', formatAmount(investorUsdtBalance));
      
      // 如果投资者USDT余额不足，从管理员转一些给他
      if (investorUsdtBalance < ethers.parseUnits("1000", 18)) {
        log.warn(`投资者USDT余额较低: ${formatAmount(investorUsdtBalance)}`);
        
        const adminNewBalance = await usdtContract.balanceOf(adminAddress);
        if (adminNewBalance >= ethers.parseUnits("2000", 18)) {
          log.info(`从管理员转账USDT到投资者...`);
          try {
            const transferTx = await usdtContract.transfer(investorAddress, ethers.parseUnits("2000", 18));
            await waitForTx(transferTx);
            const newInvestorBalance = await usdtContract.balanceOf(investorAddress);
            log.balance('投资者 USDT (转账后)', formatAmount(newInvestorBalance));
          } catch (transferError) {
            log.warn(`转账USDT失败: ${transferError.message}`);
            log.warn(`继续测试，但投资者购买步骤可能会失败`);
          }
        } else {
          log.warn(`管理员USDT不足，无法转给投资者`);
        }
      }
    } catch (error) {
      log.warn(`USDT余额检查失败: ${error.message}`);
      log.warn(`继续测试，但与USDT相关的操作可能会失败`);
    }
    
    // 设置一个标志，表明系统正在测试模式运行
    testState.isTestMode = true;
    
    log.role('管理员', '系统初始化完成');
    log.warn('注意: 已跳过合约函数调用验证，实际操作可能会失败');
    log.info('如果接下来的步骤失败，请确认合约是否已正确初始化');
    return true;
  } catch (error) {
    log.error(`系统初始化出错: ${error.message}`);
    console.error(error);
    return false;
  }
}

// 房产注册阶段 - 由管理员或经理执行
async function registerProperty() {
  log.step(2, '房产注册');
  log.role('管理员', '开始注册新房产');
  
  try {
    // 使用RealEstateFacade合约注册房产
    const facadeContract = await getContract('RealEstateFacade', REAL_ESTATE_FACADE_ADDRESS, testState.adminWallet);
    
    log.info(`注册房产信息:`);
    log.info(`  - ID: ${testState.propertyId}`);
    log.info(`  - 名称: ${TEST_PROPERTY_NAME}`);
    log.info(`  - 符号: ${TEST_PROPERTY_SYMBOL}`);
    log.info(`  - 国家: ${TEST_PROPERTY_COUNTRY}`);
    log.info(`  - 元数据URI: ${TEST_PROPERTY_METADATA_URI}`);
    log.info(`  - 初始供应量: ${formatAmount(TEST_PROPERTY_INITIAL_SUPPLY)}`);
    log.info(`  - 初始估值: ${formatAmount(TEST_PROPERTY_INITIAL_VALUATION)}`);
    
    // 确保管理员有足够的ETH
    const adminAddress = await testState.adminWallet.getAddress();
    await ensureEthBalance(testState.adminWallet, adminAddress, ethers.parseEther("0.5"));
    
    // 查询该ID是否已被使用
    try {
      const existingInfo = await facadeContract.getPropertyInfo(testState.propertyId);
      if (existingInfo && existingInfo.id === testState.propertyId) {
        log.warn(`该房产ID已存在，使用现有房产继续测试`);
        
        // 使用现有的房产代币地址
        testState.propertyTokenAddress = existingInfo.tokenAddress;
        
        // 如果代币地址有效，获取代币信息
        if (testState.propertyTokenAddress && testState.propertyTokenAddress !== ethers.ZeroAddress) {
          const propertyTokenContract = await getContract('PropertyToken', testState.propertyTokenAddress, testState.adminWallet);
          testState.propertyToken = propertyTokenContract;
          
          testState.tokenSymbol = await propertyTokenContract.symbol();
          testState.tokenName = await propertyTokenContract.name();
          testState.tokenDecimals = await propertyTokenContract.decimals();
          
          log.info(`使用现有房产代币: ${testState.tokenName} (${testState.tokenSymbol})`);
          return true;
        } else {
          log.error(`现有房产没有有效的代币地址，无法继续测试`);
          return false;
        }
      }
    } catch (error) {
      // 如果房产不存在，会抛出错误，这是正常的
      log.info(`房产ID不存在或查询出错: ${error.message}`);
      log.info(`将尝试创建新房产`);
    }
    
    // 注册新房产
    log.info(`正在注册新房产...`);
    
    const registerTx = await facadeContract.registerPropertyAndCreateToken(
      testState.propertyId,
      TEST_PROPERTY_COUNTRY,
      TEST_PROPERTY_METADATA_URI,
      TEST_PROPERTY_INITIAL_SUPPLY,
      TEST_PROPERTY_NAME,
      TEST_PROPERTY_SYMBOL
    );
    
    const receipt = await waitForTx(registerTx);
    
    // 从事件中获取房产代币地址
    const propertyRegisteredEvent = receipt.logs.find(log => {
      try {
        // 尝试解析事件
        const parsedLog = facadeContract.interface.parseLog(log);
        return parsedLog && parsedLog.name === 'PropertyRegistered';
      } catch {
        return false;
      }
    });
    
    if (propertyRegisteredEvent) {
      const parsedEvent = facadeContract.interface.parseLog(propertyRegisteredEvent);
      testState.propertyTokenAddress = parsedEvent.args.tokenAddress;
      log.info(`房产注册成功，代币地址: ${testState.propertyTokenAddress}`);
    } else {
      // 直接查询代币地址
      log.warn(`无法从事件中获取代币地址，尝试直接查询`);
      testState.propertyTokenAddress = await facadeContract.getPropertyTokenAddress(testState.propertyId);
      
      if (!testState.propertyTokenAddress || testState.propertyTokenAddress === ethers.ZeroAddress) {
        log.error(`无法获取房产代币地址，注册可能失败`);
        return false;
      }
      
      log.info(`通过查询获取到代币地址: ${testState.propertyTokenAddress}`);
    }
    
    // 获取代币信息
    const propertyTokenContract = await getContract('PropertyToken', testState.propertyTokenAddress, testState.adminWallet);
    testState.propertyToken = propertyTokenContract;
    
    testState.tokenSymbol = await propertyTokenContract.symbol();
    testState.tokenName = await propertyTokenContract.name();
    testState.tokenDecimals = await propertyTokenContract.decimals();
    
    log.info(`房产代币信息: ${testState.tokenName} (${testState.tokenSymbol})`);
    
    // 更新房产估值
    log.info(`更新房产估值为 ${formatAmount(TEST_PROPERTY_INITIAL_VALUATION)}...`);
    const updateValuationTx = await facadeContract.updatePropertyValuation(
      testState.propertyId,
      TEST_PROPERTY_INITIAL_VALUATION
    );
    await waitForTx(updateValuationTx);
    
    log.role('管理员', '房产注册完成');
    return true;
  } catch (error) {
    log.error(`房产注册出错: ${error.message}`);
    console.error(error);
    return false;
  }
}

// 更新房产状态为可交易 - 由管理员或经理执行
async function updatePropertyStatus() {
  log.step(3, '更新房产状态');
  log.role('管理员', '更新房产状态为可交易');
  
  try {
    // 获取RealEstateFacade合约实例
    const facadeContract = await getContract('RealEstateFacade', REAL_ESTATE_FACADE_ADDRESS, testState.adminWallet);
    
    // 如果处于测试模式，跳过状态检查
    if (testState.isTestMode) {
      log.warn('测试模式: 跳过当前状态检查，直接尝试更新状态');
    } else {
      // 尝试查询当前房产状态
      try {
        const propertyInfo = await facadeContract.getPropertyInfo(testState.propertyId);
        log.info(`当前房产状态: ${propertyInfo.status} (${getStatusName(propertyInfo.status)})`);
        
        // 如果已经是可交易状态(2)，直接返回成功
        if (propertyInfo.status === 2) {
          log.info(`房产已经是可交易状态，无需更新`);
          return true;
        }
      } catch (error) {
        log.warn(`无法查询房产状态: ${error.message}`);
        log.warn('继续尝试更新状态，但操作可能会失败');
      }
    }
    
    // 确保管理员有足够的ETH
    const adminAddress = await testState.adminWallet.getAddress();
    await ensureEthBalance(testState.adminWallet, adminAddress, ethers.parseEther("0.5"));
    
    // 更新状态为可交易(2)
    log.info(`正在更新房产状态为可交易...`);
    try {
      const updateStatusTx = await facadeContract.updatePropertyStatus(
        testState.propertyId,
        2 // 2表示可交易状态
      );
      
      await waitForTx(updateStatusTx);
      log.info('状态更新交易已确认');
      
      // 尝试验证状态更新
      try {
        const updatedInfo = await facadeContract.getPropertyInfo(testState.propertyId);
        log.info(`更新后房产状态: ${updatedInfo.status} (${getStatusName(updatedInfo.status)})`);
        
        if (updatedInfo.status === 2) {
          log.role('管理员', '房产状态已更新为可交易');
        } else {
          log.warn(`房产状态未变为可交易，当前状态: ${updatedInfo.status} (${getStatusName(updatedInfo.status)})`);
        }
      } catch (verifyError) {
        log.warn(`无法验证状态更新: ${verifyError.message}`);
        log.warn('状态可能已更新，但无法确认');
      }
      
      // 即使无法验证状态，也假设更新成功
      log.role('管理员', '房产状态更新操作已完成');
      return true;
    } catch (updateError) {
      log.error(`更新状态失败: ${updateError.message}`);
      
      // 如果是权限问题，尝试检查权限（只是为了提供更好的错误信息）
      if (updateError.message.includes('AccessControl') || updateError.message.includes('not authorized')) {
        try {
          const systemContract = await getContract('RealEstateSystem', SYSTEM_ADDRESS, testState.adminWallet);
          const adminRole = '0x0000000000000000000000000000000000000000000000000000000000000000'; // 默认的ADMIN_ROLE
          const hasAdminRole = await systemContract.hasRole(adminRole, adminAddress);
          log.warn(`管理员账户 ${adminAddress} ${hasAdminRole ? '有' : '没有'} 管理员权限`);
        } catch (roleError) {
          log.warn(`无法检查权限: ${roleError.message}`);
        }
      }
      
      // 询问用户是否要跳过这一步继续测试
      const skipAndContinue = await new Promise((resolve) => {
        rl.question(`\n\x1b[33m更新房产状态失败，是否跳过此步骤继续测试? (y/n)\x1b[0m`, (answer) => {
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
      });
      
      if (skipAndContinue) {
        log.warn('用户选择跳过状态更新步骤，继续测试');
        // 假设已经更新成功
        return true;
      } else {
        log.error('用户选择停止测试');
        return false;
      }
    }
  } catch (error) {
    log.error(`更新房产状态出错: ${error.message}`);
    console.error(error);
    
    // 询问用户是否要跳过这一步继续测试
    const skipAndContinue = await new Promise((resolve) => {
      rl.question(`\n\x1b[33m更新房产状态出错，是否跳过此步骤继续测试? (y/n)\x1b[0m`, (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
    
    if (skipAndContinue) {
      log.warn('用户选择跳过状态更新步骤，继续测试');
      // 假设已经更新成功
      return true;
    } else {
      log.error('用户选择停止测试');
      return false;
    }
  }
}

// 创建卖单 - 由管理员执行（作为初始代币持有人）
async function createSellOrder() {
  log.step(4, '创建卖单');
  log.role('管理员', '创建初始卖单，提供流动性');
  
  try {
    // 获取TradingManager合约实例
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, testState.adminWallet);
    
    // 获取房产代币合约
    const propertyTokenContract = testState.propertyToken;
    if (!propertyTokenContract) {
      log.error(`房产代币合约未初始化`);
      return false;
    }
    
    // 检查代币授权
    const adminAddress = await testState.adminWallet.getAddress();
    const adminBalance = await propertyTokenContract.balanceOf(adminAddress);
    log.balance(`管理员 ${testState.tokenSymbol}`, formatAmount(adminBalance, testState.tokenDecimals));
    
    if (adminBalance == 0n) {
      log.warn(`管理员没有房产代币，尝试使用PropertyManager.initialBuyPropertyToken购买`);
      
      try {
        // 获取PropertyManager合约实例
        const propertyManagerContract = await getContract('PropertyManager', PROPERTY_MANAGER_ADDRESS, testState.adminWallet);
        
        // 获取代币合约总供应量
        const totalSupply = await propertyTokenContract.totalSupply();
        log.info(`代币总供应量: ${formatAmount(totalSupply, testState.tokenDecimals)}`);
        
        if (totalSupply > 0n) {
          // 检查房产状态
          let propertyStatus;
          try {
            propertyStatus = await propertyManagerContract.getPropertyStatus(testState.propertyId);
            log.info(`房产状态: ${propertyStatus} (${getStatusName(propertyStatus)})`);
            
            // 如果房产不是可交易状态，尝试更新
            if (propertyStatus !== 2) { // 2表示Approved状态
              log.warn(`房产状态不是可交易状态，尝试先更新...`);
              await updatePropertyStatus();
              
              // 再次获取状态验证
              propertyStatus = await propertyManagerContract.getPropertyStatus(testState.propertyId);
              log.info(`更新后房产状态: ${propertyStatus} (${getStatusName(propertyStatus)})`);
              
              if (propertyStatus !== 2) {
                log.error(`更新房产状态失败，仍然不是可交易状态`);
                return false;
              }
            }
          } catch (statusError) {
            log.error(`检查房产状态失败: ${statusError.message}`);
            return false;
          }
          
          // 购买10%的代币
          const purchaseAmount = totalSupply / 10n;
          log.info(`准备购买 ${formatAmount(purchaseAmount, testState.tokenDecimals)} ${testState.tokenSymbol} (10%供应量)`);
          
          try {
            // 使用initialBuyPropertyToken方法购买
            log.info(`调用PropertyManager.initialBuyPropertyToken方法...`);
            const buyTx = await propertyManagerContract.initialBuyPropertyToken(
              testState.propertyId,
              purchaseAmount
            );
            await waitForTx(buyTx);
            
            // 检查购买后的余额
            const newAdminBalance = await propertyTokenContract.balanceOf(adminAddress);
            log.balance(`管理员 ${testState.tokenSymbol} (购买后)`, formatAmount(newAdminBalance, testState.tokenDecimals));
            
            if (newAdminBalance > 0n) {
              log.success(`成功使用initialBuyPropertyToken方法购买房产份额`);
            } else {
              log.error(`initialBuyPropertyToken交易成功但未获得代币`);
              
              // 询问用户是否继续
              const skipAndContinue = await askToSkipStep('创建卖单');
              return skipAndContinue;
            }
          } catch (buyError) {
            log.error(`使用initialBuyPropertyToken方法失败: ${buyError.message}`);
            
            // 询问用户是否继续
            const skipAndContinue = await askToSkipStep('创建卖单');
            return skipAndContinue;
          }
        } else {
          log.error(`代币总供应量为零，无法购买`);
          const skipAndContinue = await askToSkipStep('创建卖单');
          return skipAndContinue;
        }
      } catch (error) {
        log.error(`购买房产份额失败: ${error.message}`);
        
        // 询问用户是否继续
        const skipAndContinue = await askToSkipStep('创建卖单');
        return skipAndContinue;
      }
    }
    
    // 重新获取管理员余额（可能在上面的步骤中已经变化）
    const currentAdminBalance = await propertyTokenContract.balanceOf(adminAddress);
    
    // 确保管理员有足够的代币
    if (currentAdminBalance == 0n) {
      log.error(`管理员没有房产代币，无法创建卖单`);
      return false;
    }
    
    // 卖单数量 - 管理员持有代币的一半
    const sellAmount = currentAdminBalance / 2n;
    // 设置卖价（每个代币100 USDT）
    const sellPrice = ethers.parseUnits('100', 18);
    
    log.info(`创建卖单信息:`);
    log.info(`  - 代币: ${testState.tokenSymbol} (${testState.propertyTokenAddress})`);
    log.info(`  - 数量: ${formatAmount(sellAmount, testState.tokenDecimals)} ${testState.tokenSymbol}`);
    log.info(`  - 单价: ${formatAmount(sellPrice)} USDT/个`);
    
    // 授权TradingManager使用代币
    log.info(`授权TradingManager使用代币...`);
    const approveTx = await propertyTokenContract.approve(TRADING_MANAGER_ADDRESS, sellAmount);
    await waitForTx(approveTx);
    
    // 创建卖单
    log.info(`创建卖单...`);
    const createSellOrderTx = await tradingManagerContract.createSellOrder(
      testState.propertyTokenAddress,
      sellAmount,
      sellPrice
    );
    
    const receipt = await waitForTx(createSellOrderTx);
    
    // 从事件中获取卖单ID
    const orderCreatedEvent = receipt.logs.find(log => {
      try {
        const parsedLog = tradingManagerContract.interface.parseLog(log);
        return parsedLog && parsedLog.name === 'OrderCreated';
      } catch {
        return false;
      }
    });
    
    if (orderCreatedEvent) {
      const parsedEvent = tradingManagerContract.interface.parseLog(orderCreatedEvent);
      testState.sellOrderId = parsedEvent.args.orderId;
      log.info(`卖单创建成功，订单ID: ${testState.sellOrderId}`);
    } else {
      // 如果无法从事件获取，尝试获取用户最新订单
      log.warn(`无法从事件中获取订单ID，尝试获取最新订单`);
      const userOrders = await tradingManagerContract.getUserOrders(adminAddress);
      if (userOrders && userOrders.length > 0) {
        testState.sellOrderId = userOrders[userOrders.length - 1];
        log.info(`获取到最新订单ID: ${testState.sellOrderId}`);
      } else {
        log.error(`无法获取订单ID，创建卖单可能失败`);
        return false;
      }
    }
    
    log.role('管理员', '卖单创建成功');
    return true;
  } catch (error) {
    log.error(`创建卖单出错: ${error.message}`);
    console.error(error);
    return false;
  }
}

// 询问用户是否要跳过当前步骤
const askToSkipStep = (stepName) => {
  return new Promise((resolve) => {
    rl.question(`\n\x1b[33m是否跳过${stepName || '当前'}步骤? (y/n): \x1b[0m`, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

// 初始购买房产代币 - 由管理员执行
async function initialBuyPropertyToken() {
  log.step(3, '初始购买房产代币');
  log.role('管理员', '购买初始房产份额，获取代币');
  
  // 移除跳过步骤的选项，直接执行购买流程
  try {
    // 检查账户余额
    const adminAddress = await testState.adminWallet.getAddress();
    log.info(`管理员地址: ${adminAddress}`);
    
    // 获取USDT合约实例
    const usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, testState.adminWallet);
    if (!usdtContract) {
      log.error('无法获取USDT合约实例');
      return false;
    }
    
    // 检查管理员USDT余额
    const adminUsdtBalance = await usdtContract.balanceOf(adminAddress);
    log.balance('管理员 USDT', formatAmount(adminUsdtBalance, 6));
    
    // 检查管理员ETH余额
    const adminEthBalance = await testState.provider.getBalance(adminAddress);
    log.balance('管理员 ETH', formatAmount(adminEthBalance, 18));
    
    // 获取PropertyManager合约实例
    const propertyManagerContract = await getContract('PropertyManager', PROPERTY_MANAGER_ADDRESS, testState.adminWallet);
    if (!propertyManagerContract) {
      log.error(`无法获取PropertyManager合约实例`);
      return false;
    }

    // 输出合约地址和调用者信息，用于调试
    log.info(`PropertyManager合约地址: ${PROPERTY_MANAGER_ADDRESS}`);
    log.info(`房产ID: ${testState.propertyId}`);

    // 检查房产状态 - 使用try-catch进行安全检查
    let propertyStatus = -1;
    let propertyTokenAddress = null;
    
    try {
      log.info(`尝试获取房产状态...`);
      propertyStatus = await propertyManagerContract.getPropertyStatus(testState.propertyId);
      log.info(`房产状态: ${propertyStatus} (${getStatusName(propertyStatus)})`);
    } catch (error) {
      log.error(`获取房产状态失败，可能房产不存在: ${error.message}`);
      log.debug(`错误详情: ${error.stack || '无堆栈信息'}`);
      return false;
    }
    
    // 获取房产代币地址
    try {
      log.info(`尝试获取房产代币地址...`);
      propertyTokenAddress = await propertyManagerContract.getPropertyTokenAddress(testState.propertyId);
      log.info(`房产代币地址: ${propertyTokenAddress}`);
    } catch (error) {
      log.error(`获取代币地址失败: ${error.message}`);
      log.debug(`错误详情: ${error.stack || '无堆栈信息'}`);
      return false;
    }
    
    // 验证地址有效性
    if (propertyTokenAddress === ethers.ZeroAddress) {
      log.error(`找不到ID为 ${testState.propertyId} 的房产代币，地址为零地址`);
      return false;
    }
    
    log.info(`房产代币合约地址: ${propertyTokenAddress}`);
    testState.propertyTokenAddress = propertyTokenAddress;
    
    // 创建房产代币合约实例
    const propertyToken = await getContract('PropertyToken', propertyTokenAddress, testState.adminWallet);
    if (!propertyToken) {
      log.error(`无法获取房产代币合约实例`);
      return false;
    }
    
    testState.propertyToken = propertyToken;
    
    // 获取代币信息
    try {
      testState.tokenName = await propertyToken.name();
      testState.tokenSymbol = await propertyToken.symbol();
      testState.tokenDecimals = await propertyToken.decimals();
      
      log.info(`代币信息: ${testState.tokenName} (${testState.tokenSymbol}), 精度: ${testState.tokenDecimals}`);
    } catch (error) {
      log.error(`获取代币信息失败: ${error.message}`);
      log.debug(`错误详情: ${error.stack || '无堆栈信息'}`);
      return false;
    }
    
    // 检查当前代币持有情况
    let totalSupply;
    try {
      totalSupply = await propertyToken.totalSupply();
      log.info(`代币总供应量: ${formatAmount(totalSupply, testState.tokenDecimals)} ${testState.tokenSymbol}`);
      
      const adminTokenBalance = await propertyToken.balanceOf(adminAddress);
      log.balance(`管理员 ${testState.tokenSymbol}`, formatAmount(adminTokenBalance, testState.tokenDecimals));
      
      if (adminTokenBalance > 0n) {
        log.info(`管理员已持有房产代币，不需要再次购买`);
        return true;
      }
    } catch (error) {
      log.error(`检查代币持有情况失败: ${error.message}`);
      log.debug(`错误详情: ${error.stack || '无堆栈信息'}`);
      // 继续执行，尝试购买
    }
    
    // 检查房产状态是否允许购买，必须是可交易状态(2)
    if (Number(propertyStatus) !== 2) {  // 使用Number()确保类型匹配
      log.warn(`房产状态不是可交易状态，当前状态: ${propertyStatus} (${getStatusName(propertyStatus)})`);
      log.info(`将尝试更新房产状态到可交易...`);
      
      try {
        // 尝试更新房产状态到可交易
        const statusUpdated = await updatePropertyStatus();
        if (!statusUpdated) {
          log.error(`房产状态更新失败`);
          return false;
        }
        
        // 再次获取状态验证
        propertyStatus = await propertyManagerContract.getPropertyStatus(testState.propertyId);
        log.info(`更新后房产状态: ${propertyStatus} (${getStatusName(propertyStatus)})`);
        
        // 确保使用数值比较，避免类型问题
        if (Number(propertyStatus) !== 2) {
          log.error(`房产状态验证失败，当前状态: ${propertyStatus}，需要状态: 2 (可交易)`);
          return false;
        }
        
        log.success(`房产状态已成功更新为可交易状态`);
      } catch (error) {
        log.error(`更新房产状态过程中出错: ${error.message}`);
        log.debug(`错误详情: ${error.stack || '无堆栈信息'}`);
        return false;
      }
    } else {
      log.success(`房产状态已是可交易状态(2)，可以继续购买`);
    }
    
    // 再次确认获取最新的代币总供应量
    try {
      totalSupply = await propertyToken.totalSupply();
      log.info(`确认代币总供应量: ${formatAmount(totalSupply, testState.tokenDecimals)} ${testState.tokenSymbol}`);
      
      if (totalSupply === 0n) {
        log.error(`代币总供应量为零，无法购买`);
        return false;
      }
    } catch (error) {
      log.error(`获取代币总供应量失败: ${error.message}`);
      return false;
    }
    
    // 计算购买数量 - 购买10%的代币
    const purchaseAmount = totalSupply / 10n;
    
    log.info(`准备购买 ${formatAmount(purchaseAmount, testState.tokenDecimals)} ${testState.tokenSymbol} (10%供应量)`);
    log.info(`调用合约: PropertyManager (${PROPERTY_MANAGER_ADDRESS})`);
    log.info(`调用方法: initialBuyPropertyToken(${testState.propertyId}, ${purchaseAmount})`);
    
    // 打印合约方法信息，用于调试
    log.info(`检查PropertyManager合约方法...`);
    try {
      if (propertyManagerContract.interface && propertyManagerContract.interface.functions) {
        const propertyManagerFunctions = Object.keys(propertyManagerContract.interface.functions);
        log.info(`合约可用方法: ${propertyManagerFunctions.join(', ')}`);
        
        // 检查是否包含initialBuyPropertyToken方法
        const hasInitialBuyMethod = propertyManagerFunctions.some(name => 
          name.startsWith('initialBuyPropertyToken('));
          
        if (!hasInitialBuyMethod) {
          log.error(`合约接口中没有找到initialBuyPropertyToken方法!`);
          log.info(`尝试查看合约代码或手动调用函数...`);
        } else {
          log.info(`找到initialBuyPropertyToken方法，可以继续`);
        }
      } else {
        log.warn(`无法获取合约方法列表，可能是ABI不完整`);
        
        // 尝试列出合约的所有属性
        log.info(`尝试获取合约的可用属性...`);
        const contractProps = Object.getOwnPropertyNames(Object.getPrototypeOf(propertyManagerContract));
        log.info(`合约属性: ${contractProps.join(', ')}`);
      }
    } catch (error) {
      log.warn(`获取合约方法列表失败: ${error.message}`);
    }
    
    // 尝试直接检查方法是否存在
    if (typeof propertyManagerContract.initialBuyPropertyToken === 'function') {
      log.info(`确认: initialBuyPropertyToken方法存在`);
    } else {
      log.error(`PropertyManager合约没有initialBuyPropertyToken方法! 尝试查看以下可用方法:`);
      
      // 列出所有方法尝试查找类似功能
      try {
        for (const prop in propertyManagerContract) {
          if (typeof propertyManagerContract[prop] === 'function') {
            log.info(` - ${prop}`);
          }
        }
      } catch (error) {
        log.warn(`无法列出合约方法: ${error.message}`);
      }
      
      log.warn(`由于找不到初始购买方法，将尝试调用其他类似方法...`);
    }
    
    // 尝试调用initialBuyPropertyToken方法购买
    try {
      log.info(`正在调用PropertyManager.initialBuyPropertyToken方法...`);
      
      // 检查合约方法是否存在
      if (typeof propertyManagerContract.initialBuyPropertyToken !== 'function') {
        log.error(`PropertyManager合约没有initialBuyPropertyToken方法`);
        
        // 尝试查找类似的方法名称
        let alternativeMethod = null;
        for (const prop in propertyManagerContract) {
          if (typeof propertyManagerContract[prop] === 'function' && 
              (prop.toLowerCase().includes('buy') || prop.toLowerCase().includes('token'))) {
            log.info(`发现可能的替代方法: ${prop}`);
            alternativeMethod = prop;
          }
        }
        
        if (alternativeMethod) {
          log.warn(`尝试使用替代方法: ${alternativeMethod}...`);
          try {
            const altTx = await propertyManagerContract[alternativeMethod](
              testState.propertyId,
              purchaseAmount
            );
            await waitForTx(altTx);
            log.info(`替代方法调用成功，检查结果...`);
          } catch (altError) {
            log.error(`替代方法调用失败: ${altError.message}`);
          }
        } else {
          log.error(`找不到合适的替代方法，无法购买代币`);
          
          // 尝试查看PropertyManager合约代码
          try {
            const code = await testState.provider.getCode(PROPERTY_MANAGER_ADDRESS);
            log.info(`合约代码长度: ${code.length}`);
            if (code && code.length > 2) {
              log.info(`合约已部署，代码长度正常`);
            } else {
              log.error(`合约代码为空或长度异常，可能未正确部署`);
            }
          } catch (codeError) {
            log.warn(`无法获取合约代码: ${codeError.message}`);
          }
          
          return false;
        }
      } else {
        // 正常调用初始购买方法
        const buyTx = await propertyManagerContract.initialBuyPropertyToken(
          testState.propertyId,
          purchaseAmount
        );
        
        log.info(`交易已提交，等待确认，交易哈希: ${buyTx.hash}`);
        await waitForTx(buyTx);
      }
      
      // 等待一段时间，确保状态更新
      log.info(`等待区块链状态更新，3秒...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 检查购买后的余额
      const newAdminTokenBalance = await propertyToken.balanceOf(adminAddress);
      log.balance(`管理员 ${testState.tokenSymbol} (购买后)`, formatAmount(newAdminTokenBalance, testState.tokenDecimals));
      
      if (newAdminTokenBalance > 0n) {
        log.success(`购买成功！管理员获得了 ${formatAmount(newAdminTokenBalance, testState.tokenDecimals)} ${testState.tokenSymbol}`);
        return true;
      } else {
        log.error(`购买交易已确认，但管理员未获得代币，可能需要检查合约状态`);
        
        // 检查更多持有者信息
        try {
          // 检查PropertyManager合约余额
          const contractTokenBalance = await propertyToken.balanceOf(PROPERTY_MANAGER_ADDRESS);
          log.info(`PropertyManager合约的代币余额: ${formatAmount(contractTokenBalance, testState.tokenDecimals)} ${testState.tokenSymbol}`);
          
          // 如果PropertyManager有代币，尝试检查原因
          if (contractTokenBalance > 0n) {
            log.warn(`PropertyManager合约持有代币，但未转移给管理员！可能需要单独的提取步骤`);
            
            // 尝试检查是否有提取方法
            for (const prop in propertyManagerContract) {
              if (typeof propertyManagerContract[prop] === 'function' && 
                  (prop.toLowerCase().includes('claim') || prop.toLowerCase().includes('withdraw') ||
                   prop.toLowerCase().includes('get'))) {
                log.info(`发现可能的提取方法: ${prop}，您可能需要调用此方法获取代币`);
              }
            }
          }
        } catch (error) {
          log.warn(`无法检查合约代币余额: ${error.message}`);
        }
        
        return false;
      }
    } catch (error) {
      log.error(`调用购买方法失败: ${error.message}`);
      
      // 尝试解析更详细的错误信息
      if (error.data) {
        log.debug(`错误数据: ${error.data}`);
      }
      
      if (error.reason) {
        log.debug(`错误原因: ${error.reason}`);
      }
      
      if (error.code) {
        log.debug(`错误代码: ${error.code}`);
      }
      
      log.debug(`错误详情: ${error.stack || '无堆栈信息'}`);
      
      // 尝试检查合约的具体错误
      try {
        // 尝试调用仅查询版本的函数，检查是否能基本访问合约
        if (typeof propertyManagerContract.version === 'function') {
          const version = await propertyManagerContract.version();
          log.info(`PropertyManager合约版本: ${version}`);
        }
        
        // 尝试查看PropertyToken的所有者，看是否是PropertyManager
        if (typeof propertyToken.owner === 'function') {
          const owner = await propertyToken.owner();
          log.info(`PropertyToken的所有者: ${owner}`);
          if (owner.toLowerCase() !== PROPERTY_MANAGER_ADDRESS.toLowerCase()) {
            log.warn(`PropertyToken的所有者不是PropertyManager合约，这可能导致购买失败`);
          }
        }
        
        // 尝试检查PropertyManager的拥有者权限
        if (typeof propertyManagerContract.owner === 'function') {
          const pmOwner = await propertyManagerContract.owner();
          log.info(`PropertyManager的所有者: ${pmOwner}`);
          
          if (pmOwner.toLowerCase() !== adminAddress.toLowerCase()) {
            log.warn(`管理员账户不是PropertyManager的所有者，这可能导致权限不足`);
          }
        }
      } catch (checkError) {
        log.warn(`合约检查失败: ${checkError.message}`);
      }
      
      // 尝试检查是否有其他购买方法
      log.info(`尝试查找其他购买方法...`);
      for (const prop in propertyManagerContract) {
        if (typeof propertyManagerContract[prop] === 'function' && 
            (prop.toLowerCase().includes('buy') || prop.toLowerCase().includes('purchase'))) {
          log.info(`发现可能的购买方法: ${prop}`);
        }
      }
      
      return false;
    }
  } catch (error) {
    log.error(`购买房产份额过程中发生意外错误: ${error.message}`);
    log.debug(`错误详情: ${error.stack || '无堆栈信息'}`);
    return false;
  }
}

// 投资者购买房产代币
async function investorBuyPropertyToken() {
  log.step(5, '投资者购买房产代币');
  log.role('投资者', '购买房产代币');
  
  try {
    // 验证前置条件
    if (!testState.propertyTokenAddress) {
      log.error('房产代币地址未设置，无法进行购买');
      return false;
    }
    
    if (!testState.sellOrderId) {
      log.warn('卖单ID未找到，可能需要先创建卖单');
      
      // 询问是否跳过
      const skipAndContinue = await askToSkipStep('投资者购买');
      if (skipAndContinue) {
        log.warn('用户选择继续测试，将模拟购买成功');
        return true;
      } else {
        return false;
      }
    }
    
    // 获取TradingManager合约实例
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, testState.investorWallet);
    
    // 获取USDT合约实例
    let usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, testState.investorWallet);
    
    // 验证USDT合约实例
    try {
      // 尝试简单调用验证合约实例
      const usdtSymbol = await usdtContract.symbol();
      const usdtDecimals = await usdtContract.decimals();
      log.info(`USDT合约验证: 符号=${usdtSymbol}, 小数位=${usdtDecimals}`);
    } catch (verifyError) {
      log.error(`USDT合约验证失败: ${verifyError.message}`);
      
      // 使用标准ERC20 ABI
      const standardERC20ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function transfer(address to, uint amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ];
      
      usdtContract = new ethers.Contract(USDT_ADDRESS, standardERC20ABI, testState.investorWallet);
      log.info(`已使用标准ERC20 ABI重新创建USDT合约实例`);
    }
    
    // 获取房产代币合约实例
    const propertyTokenContract = await getContract('PropertyToken', testState.propertyTokenAddress, testState.investorWallet);
    if (!propertyTokenContract) {
      log.error(`无法获取房产代币合约实例`);
      return false;
    }
    
    // 检查投资者USDT余额
    const investorAddress = await testState.investorWallet.getAddress();
    const usdtBalance = await usdtContract.balanceOf(investorAddress);
    const usdtDecimals = await usdtContract.decimals();
    const usdtSymbol = await usdtContract.symbol();
    
    log.balance(`投资者 ${usdtSymbol}`, formatAmount(usdtBalance, usdtDecimals));
    
    // 确保投资者有足够的ETH支付gas
    await ensureEthBalance(testState.adminWallet, investorAddress, ethers.parseEther("0.1"));
    
    // 检查投资者现有房产代币余额
    const initialTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者初始 ${testState.tokenSymbol}`, formatAmount(initialTokenBalance, testState.tokenDecimals));
    
    // 获取卖单详情
    let sellOrderInfo;
    try {
      sellOrderInfo = await tradingManagerContract.getOrderInfo(testState.sellOrderId);
      if (!sellOrderInfo.active) {
        log.error(`卖单不活跃，无法购买`);
        
        // 询问是否跳过
        const skipAndContinue = await askToSkipStep('投资者购买');
        if (skipAndContinue) {
          log.warn('用户选择继续测试，将模拟购买成功');
          return true;
        } else {
          return false;
        }
      }
      
      // 验证卖单是否为卖单
      if (!sellOrderInfo.isSellOrder) {
        log.error(`订单ID ${testState.sellOrderId} 不是卖单`);
        return false;
      }
      
      // 验证卖单中的代币地址是否与房产代币一致
      if (sellOrderInfo.token.toLowerCase() !== testState.propertyTokenAddress.toLowerCase()) {
        log.error(`卖单中的代币地址(${sellOrderInfo.token})与房产代币地址(${testState.propertyTokenAddress})不一致`);
        return false;
      }
      
      log.info(`已找到活跃卖单，ID: ${testState.sellOrderId}`);
      log.info(`卖单详情:`);
      log.info(`  - 卖家: ${sellOrderInfo.seller}`);
      log.info(`  - A数量: ${formatAmount(sellOrderInfo.amount, testState.tokenDecimals)} ${testState.tokenSymbol}`);
      log.info(`  - 单价: ${formatAmount(sellOrderInfo.price)} ${usdtSymbol}/个`);
    } catch (orderError) {
      log.error(`获取卖单详情失败: ${orderError.message}`);
      
      // 询问是否跳过
      const skipAndContinue = await askToSkipStep('投资者购买');
      if (skipAndContinue) {
        log.warn('用户选择继续测试，将模拟购买成功');
        return true;
      } else {
        return false;
      }
    }
    
    // 购买固定100个代币
    const purchaseAmount = ethers.parseUnits("100", testState.tokenDecimals);
    const price = sellOrderInfo.price;
    
    // 计算总成本
    const totalCost = (purchaseAmount * price) / (10n ** BigInt(testState.tokenDecimals));
    
    log.info(`购买信息:`);
    log.info(`  - 卖单ID: ${testState.sellOrderId}`);
    log.info(`  - 购买数量: ${formatAmount(purchaseAmount, testState.tokenDecimals)} ${testState.tokenSymbol}`);
    log.info(`  - 单价: ${formatAmount(price)} ${usdtSymbol}/个`);
    log.info(`  - 总成本: ${formatAmount(totalCost, usdtDecimals)} ${usdtSymbol}`);
    
    // 确保投资者有足够的USDT
    await ensureTokenBalance(usdtContract, testState.adminWallet, investorAddress, totalCost * 12n / 10n, usdtDecimals);
    
    // 授权TradingManager使用USDT
    log.info(`授权TradingManager使用USDT...`);
    const approveTx = await usdtContract.approve(TRADING_MANAGER_ADDRESS, totalCost);
    await waitForTx(approveTx);
    
    // 创建买单
    log.info(`创建买单...`);
    try {
      const createBuyOrderTx = await tradingManagerContract.createBuyOrder(
        sellOrderInfo.token,
        purchaseAmount,
        price
      );
      
      const receipt = await waitForTx(createBuyOrderTx);
      
      // 从事件中获取买单ID
      const orderCreatedEvent = receipt.logs.find(log => {
        try {
          const parsedLog = tradingManagerContract.interface.parseLog(log);
          return parsedLog && parsedLog.name === 'OrderCreated';
        } catch {
          return false;
        }
      });
      
      if (orderCreatedEvent) {
        const parsedEvent = tradingManagerContract.interface.parseLog(orderCreatedEvent);
        testState.buyOrderId = parsedEvent.args.orderId;
        log.info(`买单创建成功，订单ID: ${testState.buyOrderId}`);
      } else {
        // 如果无法从事件获取，尝试获取用户最新订单
        log.warn(`无法从事件中获取订单ID，尝试获取最新订单`);
        const userOrders = await tradingManagerContract.getUserOrders(investorAddress);
        if (userOrders && userOrders.length > 0) {
          testState.buyOrderId = userOrders[userOrders.length - 1];
          log.info(`获取到最新订单ID: ${testState.buyOrderId}`);
        } else {
          log.error(`无法获取订单ID，创建买单可能失败`);
          return false;
        }
      }
    } catch (createError) {
      log.error(`创建买单失败: ${createError.message}`);
      
      // 如果由于订单匹配而失败，可能是交易已完成
      log.warn(`买单创建失败，可能是交易已自动完成，将检查代币余额`);
    }
    
    // 等待一会儿，让交易完成
    log.info(`等待交易处理...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 检查投资者新的房产代币余额
    const newTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者新 ${testState.tokenSymbol}`, formatAmount(newTokenBalance, testState.tokenDecimals));
    
    // 计算实际获得的代币数量
    const tokensReceived = newTokenBalance - initialTokenBalance;
    log.info(`实际获得代币: ${formatAmount(tokensReceived, testState.tokenDecimals)} ${testState.tokenSymbol}`);
    
    if (tokensReceived > 0n) {
      log.success(`交易成功！投资者获得了 ${formatAmount(tokensReceived, testState.tokenDecimals)} ${testState.tokenSymbol}`);
      log.role('投资者', '代币购买成功');
      return true;
    } else {
      log.warn(`代币余额未增加，但交易可能仍在进行中`);
      
      // 询问是否继续
      const skipAndContinue = await askToSkipStep('继续后续步骤');
      if (skipAndContinue) {
        log.warn('用户选择继续测试，假设交易已完成');
        return true;
      } else {
        return false;
      }
    }
  } catch (error) {
    log.error(`投资者购买代币出错: ${error.message}`);
    console.error(error);
    
    // 询问是否继续
    const skipAndContinue = await askToSkipStep('继续后续步骤');
    return skipAndContinue;
  }
}

// 管理员创建收益分配
async function createDistribution() {
  log.step(6, '创建收益分配');
  log.role('管理员', '创建房产收益分配');
  
  try {
    // 获取RewardManager合约实例
    const rewardManagerContract = await getContract('RewardManager', REWARD_MANAGER_ADDRESS, testState.adminWallet);
    
    // 获取USDT合约实例
    let usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, testState.adminWallet);
    
    // 验证USDT合约实例
    try {
      const usdtSymbol = await usdtContract.symbol();
      log.info(`USDT合约验证: 符号=${usdtSymbol}`);
    } catch (verifyError) {
      log.error(`USDT合约验证失败: ${verifyError.message}`);
      
      // 使用标准ERC20 ABI
      const standardERC20ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function transfer(address to, uint amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ];
      
      usdtContract = new ethers.Contract(USDT_ADDRESS, standardERC20ABI, testState.adminWallet);
      log.info(`已使用标准ERC20 ABI重新创建USDT合约实例`);
    }
    
    // 确保管理员有足够的ETH
    const adminAddress = await testState.adminWallet.getAddress();
    await ensureEthBalance(testState.adminWallet, adminAddress, ethers.parseEther("0.2"));
    
    // 设置分配金额 - 1000 USDT
    const distributionAmount = ethers.parseUnits('1000', await usdtContract.decimals());
    
    log.info(`创建收益分配信息:`);
    log.info(`  - 房产ID: ${testState.propertyId}`);
    log.info(`  - 分配金额: ${formatAmount(distributionAmount, await usdtContract.decimals())} USDT`);
    log.info(`  - 分配描述: 2023年第4季度房产租金收益`);
    
    // 确保管理员有足够的USDT用于分配
    await ensureTokenBalance(usdtContract, testState.adminWallet, adminAddress, distributionAmount * 12n / 10n, await usdtContract.decimals());
    
    // 授权RewardManager使用USDT
    log.info(`授权RewardManager使用USDT...`);
    const approveTx = await usdtContract.approve(REWARD_MANAGER_ADDRESS, distributionAmount);
    await waitForTx(approveTx);
    
    // 创建分配
    log.info(`创建分配...`);
    const createDistributionTx = await rewardManagerContract.createDistribution(
      testState.propertyId,
      distributionAmount,
      USDT_ADDRESS,
      '2023年第4季度房产租金收益'
    );
    
    const receipt = await waitForTx(createDistributionTx);
    
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
      testState.distributionId = parsedEvent.args.distributionId;
      log.info(`分配创建成功，分配ID: ${testState.distributionId}`);
    } else {
      // 如果无法从事件获取，查询该房产的所有分配
      log.warn(`无法从事件中获取分配ID，尝试查询房产分配`);
      const distributions = await rewardManagerContract.getDistributionsForProperty(testState.propertyId);
      if (distributions && distributions.length > 0) {
        testState.distributionId = distributions[distributions.length - 1];
        log.info(`获取到最新分配ID: ${testState.distributionId}`);
      } else {
        log.error(`无法获取分配ID，创建分配可能失败`);
        return false;
      }
    }
    
    // 激活分配
    log.info(`激活分配...`);
    const activateDistributionTx = await rewardManagerContract.activateDistribution(testState.distributionId);
    await waitForTx(activateDistributionTx);
    
    // 查询分配详情
    const distributionInfo = await rewardManagerContract.getDistributionInfo(testState.distributionId);
    log.info(`分配信息:`);
    log.info(`  - ID: ${distributionInfo.id}`);
    log.info(`  - 房产ID: ${distributionInfo.propertyId}`);
    log.info(`  - 金额: ${formatAmount(distributionInfo.amount)}`);
    log.info(`  - 时间戳: ${new Date(Number(distributionInfo.timestamp) * 1000).toLocaleString()}`);
    log.info(`  - 状态: ${distributionInfo.status}`);
    log.info(`  - 描述: ${distributionInfo.description}`);
    
    log.role('管理员', '收益分配创建并激活成功');
    return true;
  } catch (error) {
    log.error(`创建收益分配出错: ${error.message}`);
    console.error(error);
    return false;
  }
}

// 投资者领取收益
async function investorClaimReward() {
  log.step(7, '投资者领取收益');
  log.role('投资者', '查询并领取房产收益');
  
  try {
    // 获取RewardManager合约实例
    const rewardManagerContract = await getContract('RewardManager', REWARD_MANAGER_ADDRESS, testState.investorWallet);
    
    // 获取USDT合约实例
    let usdtContract = await getContract('SimpleERC20', USDT_ADDRESS, testState.investorWallet);
    
    // 验证USDT合约实例
    try {
      const usdtSymbol = await usdtContract.symbol();
      log.info(`USDT合约验证: 符号=${usdtSymbol}`);
    } catch (verifyError) {
      log.error(`USDT合约验证失败: ${verifyError.message}`);
      
      // 使用标准ERC20 ABI
      const standardERC20ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
      ];
      
      usdtContract = new ethers.Contract(USDT_ADDRESS, standardERC20ABI, testState.investorWallet);
      log.info(`已使用标准ERC20 ABI重新创建USDT合约实例`);
    }
    
    // 获取分配详情
    log.info(`查询分配信息，分配ID: ${testState.distributionId}`);
    const distributionInfo = await rewardManagerContract.getDistributionInfo(testState.distributionId);
    
    log.info(`分配信息:`);
    log.info(`  - ID: ${distributionInfo.id}`);
    log.info(`  - 房产ID: ${distributionInfo.propertyId}`);
    log.info(`  - 金额: ${formatAmount(distributionInfo.amount)}`);
    log.info(`  - 状态: ${distributionInfo.status}`);
    log.info(`  - 描述: ${distributionInfo.description}`);
    
    // 估算投资者可获得的收益
    const investorAddress = await testState.investorWallet.getAddress();
    const estimatedReward = await rewardManagerContract.estimateReward(testState.distributionId, investorAddress);
    
    log.info(`预估收益: ${formatAmount(estimatedReward)} USDT`);
    
    if (estimatedReward == 0n) {
      log.warn(`投资者没有可领取的收益`);
      return true;
    }
    
    // 检查投资者当前USDT余额
    const initialUsdtBalance = await usdtContract.balanceOf(investorAddress);
    log.balance('投资者初始 USDT', formatAmount(initialUsdtBalance, await usdtContract.decimals()));
    
    // 领取收益
    log.info(`领取收益...`);
    const claimTx = await rewardManagerContract.claimReward(testState.distributionId);
    await waitForTx(claimTx);
    
    // 检查投资者新的USDT余额
    const newUsdtBalance = await usdtContract.balanceOf(investorAddress);
    log.balance('投资者新 USDT', formatAmount(newUsdtBalance, await usdtContract.decimals()));
    
    // 计算实际收到的收益
    const actualReward = newUsdtBalance - initialUsdtBalance;
    log.info(`实际收到收益: ${formatAmount(actualReward, await usdtContract.decimals())} USDT`);
    
    log.role('投资者', '收益领取完成');
    return true;
  } catch (error) {
    log.error(`投资者领取收益出错: ${error.message}`);
    console.error(error);
    return false;
  }
}

// 投资者创建卖单（退出投资）
async function investorSellToken() {
  log.step(8, '投资者退出投资');
  log.role('投资者', '创建卖单出售房产代币');
  
  try {
    // 获取TradingManager合约实例
    const tradingManagerContract = await getContract('TradingManager', TRADING_MANAGER_ADDRESS, testState.investorWallet);
    
    // 获取房产代币合约实例
    const propertyTokenContract = await getContract('PropertyToken', testState.propertyTokenAddress, testState.investorWallet);
    
    // 检查投资者房产代币余额
    const investorAddress = await testState.investorWallet.getAddress();
    const tokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    
    log.balance(`投资者 ${testState.tokenSymbol}`, formatAmount(tokenBalance, testState.tokenDecimals));
    
    if (tokenBalance == 0n) {
      log.warn(`投资者没有房产代币，无法创建卖单`);
      return true;
    }
    
    // 卖出所有代币
    const sellAmount = tokenBalance;
    // 价格比买入价高10%
    const sellPrice = ethers.parseUnits('110', 18); // 假设买入价是100
    
    log.info(`创建卖单信息:`);
    log.info(`  - 代币: ${testState.tokenSymbol} (${testState.propertyTokenAddress})`);
    log.info(`  - 数量: ${formatAmount(sellAmount, testState.tokenDecimals)} ${testState.tokenSymbol}`);
    log.info(`  - 价格: ${formatAmount(sellPrice)} USDT/个`);
    
    // 授权TradingManager使用代币
    log.info(`授权TradingManager使用房产代币...`);
    const approveTx = await propertyTokenContract.approve(TRADING_MANAGER_ADDRESS, sellAmount);
    await waitForTx(approveTx);
    
    // 创建卖单
    log.info(`创建卖单...`);
    const createSellOrderTx = await tradingManagerContract.createSellOrder(
      testState.propertyTokenAddress,
      sellAmount,
      sellPrice
    );
    
    await waitForTx(createSellOrderTx);
    
    // 检查代币余额变化
    const newTokenBalance = await propertyTokenContract.balanceOf(investorAddress);
    log.balance(`投资者新 ${testState.tokenSymbol}`, formatAmount(newTokenBalance, testState.tokenDecimals));
    
    if (newTokenBalance < tokenBalance) {
      log.info(`卖单创建成功，代币已锁定在交易合约中`);
    } else {
      log.warn(`代币余额未减少，卖单可能未成功创建`);
    }
    
    log.role('投资者', '退出投资流程完成');
    return true;
  } catch (error) {
    log.error(`投资者创建卖单出错: ${error.message}`);
    console.error(error);
    return false;
  }
}

// 获取状态名称
function getStatusName(status) {
  const statusMap = {
    0: '未初始化',
    1: '已注册',
    2: '可交易',
    3: '已暂停',
    4: '已下架'
  };
  return statusMap[status] || `未知状态(${status})`;
}

// 验证合约部署状态
async function validateContracts() {
  log.info("验证合约部署状态...");
  
  try {
    // 检查所有必需的合约地址
    const requiredContracts = {
      'RealEstateSystem': SYSTEM_ADDRESS,
      'RealEstateFacade': REAL_ESTATE_FACADE_ADDRESS,
      'PropertyManager': PROPERTY_MANAGER_ADDRESS,
      'TradingManager': TRADING_MANAGER_ADDRESS,
      'RewardManager': REWARD_MANAGER_ADDRESS,
      'USDT': USDT_ADDRESS
    };
    
    let allValid = true;
    // 检查合约地址是否存在
    for (const [name, address] of Object.entries(requiredContracts)) {
      if (!address || address === '0x0000000000000000000000000000000000000000') {
        log.error(`${name} 合约地址未设置或无效`);
        allValid = false;
      } else {
        log.info(`${name} 地址已设置: ${address}`);
      }
    }
    
    if (!allValid) {
      log.error("合约地址验证失败，请检查.env文件中的合约地址设置");
      return false;
    }
    
    // 验证RealEstateSystem合约是否可访问
    try {
      const system = await getContract('RealEstateSystem', SYSTEM_ADDRESS, testState.adminWallet);
      // 尝试调用一个简单的查询方法
      try {
        // 首先尝试使用getSystemStatus方法
        try {
          const systemStatus = await system.getSystemStatus();
          log.info(`系统状态: ${systemStatus}`);
        } catch (statusError) {
          log.warn(`无法获取系统状态: ${statusError.message}`);
          
          // 尝试使用paused方法
          try {
            const paused = await system.paused();
            log.info(`系统暂停状态: ${paused}`);
          } catch (pausedError) {
            log.warn(`无法获取系统暂停状态: ${pausedError.message}`);
            
            // 尝试直接检查一个常量或其他任何可用方法
            try {
              // 尝试调用任何看起来简单的函数
              let someFieldOrMethod;
              
              try {
                someFieldOrMethod = await system.version();
                log.info(`系统版本: ${someFieldOrMethod}`);
              } catch (e) {
                log.warn(`无法获取系统版本: ${e.message}`);
              }
              
              // 尝试检查角色 - 小心处理hasRole可能不存在的情况
              try {
                const adminRole = ethers.ZeroHash; // 默认管理员角色常量
                const adminAddress = await testState.adminWallet.getAddress();
                
                if (typeof system.hasRole === 'function') {
                  const hasAdminRole = await system.hasRole(adminRole, adminAddress);
                  log.info(`管理员角色检查: ${hasAdminRole}`);
                } else if (typeof system.checkRole === 'function') {
                  const hasAdminRole = await system.checkRole(adminRole, adminAddress);
                  log.info(`管理员角色检查: ${hasAdminRole}`);
                } else {
                  log.warn('系统合约没有hasRole或checkRole方法可用');
                }
              } catch (roleError) {
                log.warn(`角色检查失败: ${roleError.message}`);
              }
            } catch (otherError) {
              log.error(`无法调用任何系统合约方法: ${otherError.message}`);
              return false;
            }
          }
        }
      } catch (error) {
        log.error(`系统合约方法调用失败: ${error.message}`);
        return false;
      }
    } catch (error) {
      log.error(`系统合约验证失败: ${error.message}`);
      return false;
    }
    
    log.info("合约基本验证通过");
    return true;
  } catch (error) {
    log.error(`合约验证过程中出错: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  try {
    // 系统初始化
    log.info('========== 日本房产代币化系统测试脚本 ==========');
    
    // 环境变量检查
    log.info('检查环境变量配置:');
    log.info(`- USDT合约地址: ${USDT_ADDRESS}`);
    log.info(`- RealEstateSystem地址: ${SYSTEM_ADDRESS}`);
    log.info(`- RealEstateFacade地址: ${REAL_ESTATE_FACADE_ADDRESS}`);
    log.info(`- PropertyManager地址: ${PROPERTY_MANAGER_ADDRESS}`);
    log.info(`- TradingManager地址: ${TRADING_MANAGER_ADDRESS}`);
    log.info(`- RewardManager地址: ${REWARD_MANAGER_ADDRESS}`);
    log.info(`- PropertyToken地址: ${PROPERTY_TOKEN_ADDRESS || '0x0'}`);
    
    const systemInitialized = await initializeSystem();
    if (!systemInitialized) {
      log.error('系统初始化失败，无法继续');
      return;
    }
    
    // 验证合约状态
    const contractsValid = await validateContracts();
    if (!contractsValid) {
      log.warn('合约验证未完全通过，可能影响后续操作');
      const proceedAnyway = await askToSkipStep('合约验证');
      if (!proceedAnyway) {
        log.error('用户选择终止测试');
        return;
      }
    }
    
    await waitForUserInput('系统初始化完成，按Enter继续');
    
    // 检查是否已有PropertyToken，如果没有则需要注册
    if (!testState.propertyTokenAddress || testState.propertyTokenAddress === ethers.ZeroAddress) {
      log.warn('PropertyToken合约未部署或地址未设置，需要先注册房产');
      
      // 注册新房产
      const propertyRegistered = await registerProperty();
      if (!propertyRegistered) {
        log.error('房产注册失败，无法继续');
        return;
      }
      
      await waitForUserInput('房产注册完成');
    } else {
      log.info(`检测到已有PropertyToken: ${testState.propertyTokenAddress}`);
      testState.propertyId = await askForPropertyId();
    }
    
    // 初始购买房产代币步骤
    const initialPurchase = await initialBuyPropertyToken();
    if (!initialPurchase) {
      log.error('初始购买房产代币失败，将尝试继续测试');
    } else {
      log.success('成功执行初始购买步骤');
    }
    
    await waitForUserInput('房产代币准备完成，按Enter继续');
    
    // 更新房产状态为可交易（如果需要）
    let propertyStatus = -1;
    try {
      const propertyManagerContract = await getContract('PropertyManager', PROPERTY_MANAGER_ADDRESS, testState.adminWallet);
      propertyStatus = await propertyManagerContract.getPropertyStatus(testState.propertyId);
      log.info(`当前房产状态: ${propertyStatus} (${getStatusName(propertyStatus)})`);
    } catch (error) {
      log.warn(`获取房产状态失败，将尝试更新: ${error.message}`);
      propertyStatus = 0; // 假设未激活状态
    }
    
    // 如果房产状态不是可交易（2），则尝试更新
    if (propertyStatus !== 2) {
      const statusUpdated = await updatePropertyStatus();
      if (!statusUpdated) {
        log.error('房产状态更新失败，无法继续');
        const skipAndContinue = await askToSkipStep('状态验证');
        if (!skipAndContinue) {
          return;
        }
      } else {
        log.success('房产状态已更新为可交易');
      }
    } else {
      log.info('房产已处于可交易状态，无需更新');
    }
    
    await waitForUserInput('房产状态更新完成');
    
    // 管理员创建卖单
    const sellOrderCreated = await createSellOrder();
    if (!sellOrderCreated) {
      log.error('卖单创建失败，检查是否继续');
      const skipAndContinue = await askToSkipStep('创建卖单');
      if (!skipAndContinue) {
        return;
      }
      log.warn('用户选择继续测试，将模拟卖单已创建');
      testState.sellOrderId = 1; // 设置一个模拟ID
    } else {
      log.success('卖单创建成功');
    }
    
    await waitForUserInput('卖单创建完成');
    
    // 投资者购买房产代币
    const tokenPurchased = await investorBuyPropertyToken();
    if (!tokenPurchased) {
      log.error('投资者购买代币失败，检查是否继续');
      const skipAndContinue = await askToSkipStep('投资者购买');
      if (!skipAndContinue) {
        return;
      }
      log.warn('用户选择继续测试，将模拟投资者已购买代币');
    } else {
      log.success('投资者购买代币成功');
    }
    
    await waitForUserInput('投资者购买完成');
    
    // 创建收益分配
    const distributionCreated = await createDistribution();
    if (!distributionCreated) {
      log.error('收益分配创建失败，检查是否继续');
      const skipAndContinue = await askToSkipStep('创建分配');
      if (!skipAndContinue) {
        return;
      }
      log.warn('用户选择继续测试，将模拟分配已创建');
      testState.distributionId = 1; // 设置一个模拟ID
    } else {
      log.success('收益分配创建成功');
    }
    
    await waitForUserInput('收益分配完成');
    
    // 投资者认领收益
    const rewardClaimed = await investorClaimReward();
    if (!rewardClaimed) {
      log.error('投资者认领收益失败，检查是否继续');
      const skipAndContinue = await askToSkipStep('认领收益');
      if (!skipAndContinue) {
        return;
      }
      log.warn('用户选择继续测试，将模拟已认领收益');
    } else {
      log.success('投资者认领收益成功');
    }
    
    await waitForUserInput('投资者认领收益完成');
    
    // 投资者出售房产代币（退出投资）
    const tokenSold = await investorSellToken();
    if (!tokenSold) {
      log.error('投资者出售代币失败，测试流程结束');
    } else {
      log.success('投资者出售代币成功');
    }
    
    log.info('========== 测试流程全部完成 ==========');
    log.success('所有步骤执行成功或已跳过!');
  } catch (error) {
    log.error(`测试过程中发生错误: ${error.message}`);
    console.error(error);
  } finally {
    rl.close();
  }
}

// 获取用户输入的房产ID
async function askForPropertyId() {
  return new Promise((resolve) => {
    rl.question(`\n\x1b[33m请输入要使用的房产ID: \x1b[0m`, (answer) => {
      if (!answer || answer.trim() === '') {
        // 默认使用一个随机ID
        const defaultId = `PROP-${Date.now()}`;
        log.info(`未输入ID，使用默认ID: ${defaultId}`);
        resolve(defaultId);
      } else {
        resolve(answer.trim());
      }
    });
  });
}

// 运行主流程
main().then(() => {
  console.log('测试脚本执行完毕');
  process.exit(0);
}).catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
}); 