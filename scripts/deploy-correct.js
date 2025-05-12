const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// 硬编码的角色哈希值
const ROLES = {
    ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
    MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
    OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
};

const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
};

/**
 * 生成部署报告
 */
function generateDeploymentReport(contracts) {
  const timestamp = new Date().toISOString();
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;
  const rpcUrl = hre.network.config.url;
  
  const report = `# 房地产代币化系统部署报告

## 基本信息
- 部署时间: ${timestamp}
- 网络: ${network}
- Chain ID: ${chainId}
- RPC URL: ${rpcUrl}
- 部署账户: ${contracts.deployerAddress}

## 部署账户信息
### 随机生成的部署账户
- 地址: ${contracts.deployerAddress}
- 私钥: ${contracts.deployerPrivateKey}
- 初始ETH余额: ${ethers.formatEther(contracts.deployerInitialBalance)} ETH
- 部署后ETH余额: ${ethers.formatEther(contracts.deployerFinalBalance)} ETH

## 角色账户信息
### 管理员账户
- 地址: ${contracts.adminAddress}
- 角色: ADMIN_ROLE
- 权限: 系统最高权限，可管理所有角色和系统状态

### 经理账户
- 地址: ${contracts.managerAddress}
- 角色: MANAGER_ROLE
- 权限: 可管理合约日常运营，包括资产注册、交易管理等

### 操作员账户
- 地址: ${contracts.operatorAddress}
- 角色: OPERATOR_ROLE
- 权限: 可执行具体业务操作，如创建订单、执行交易等

## 部署方法
本次部署采用 UUPS 可升级代理模式，所有核心合约均通过代理合约部署，支持后续升级。部署过程分为以下步骤：
1. 部署 RealEstateSystem 系统合约
2. 部署管理合约（PropertyManager、TradingManager、RewardManager）
3. 在系统中授权管理合约
4. 部署 PropertyToken 代币合约
5. 部署 SimpleERC20 测试代币
6. 部署 RealEstateFacade 门面合约
7. 配置交易参数
8. 激活系统
9. 设置角色权限

## 合约详情

### 1. RealEstateSystem
- 地址: ${contracts.systemAddress}
- 实现地址: ${contracts.systemImplementation}
- 功能: 系统核心合约，负责权限管理和系统状态控制
- 权限: 拥有 ADMIN_ROLE、MANAGER_ROLE、OPERATOR_ROLE 等角色管理权限
- 角色分配:
  - ADMIN_ROLE: ${contracts.adminAddress}
  - MANAGER_ROLE: ${contracts.managerAddress}
  - OPERATOR_ROLE: ${contracts.operatorAddress}

### 2. PropertyManager
- 地址: ${contracts.propertyManagerAddress}
- 实现地址: ${contracts.propertyManagerImplementation}
- 功能: 管理房地产资产，包括资产注册、状态更新等
- 权限: 需要 MANAGER_ROLE 权限
- 授权账户: ${contracts.managerAddress}

### 3. TradingManager
- 地址: ${contracts.tradingManagerAddress}
- 实现地址: ${contracts.tradingManagerImplementation}
- 功能: 管理代币交易，包括订单创建、执行等
- 权限: 需要 MANAGER_ROLE 权限
- 授权账户: ${contracts.managerAddress}
- 交易参数:
  - 最大交易金额: 1000 ETH
  - 最小交易金额: 0.01 ETH
  - 冷却期: 3600 秒
  - 交易费率: 1%

### 4. RewardManager
- 地址: ${contracts.rewardManagerAddress}
- 实现地址: ${contracts.rewardManagerImplementation}
- 功能: 管理奖励分配，包括收益分配、奖励发放等
- 权限: 需要 MANAGER_ROLE 权限
- 授权账户: ${contracts.managerAddress}

### 5. PropertyToken
- 地址: ${contracts.propertyTokenAddress}
- 实现地址: ${contracts.propertyTokenImplementation}
- 功能: 房地产代币合约，实现 ERC20 标准
- 权限: 需要 MANAGER_ROLE 权限
- 授权账户: ${contracts.managerAddress}
- 代币信息:
  - 名称: Test Property Token
  - 符号: TPT
  - 初始供应量: 1,000,000 TPT

### 6. SimpleERC20
- 地址: ${contracts.testTokenAddress}
- 功能: 测试代币，用于交易测试
- 代币信息:
  - 名称: Test Token
  - 符号: TEST
  - 初始供应量: 100,000,000 TEST (1亿)
  - 代币分配:
    - 管理员账户: ${ethers.formatEther(contracts.adminTokenBalance)} TEST (约33.3%)
    - 经理账户: ${ethers.formatEther(contracts.managerTokenBalance)} TEST (约33.3%)
    - 操作员账户: ${ethers.formatEther(contracts.operatorTokenBalance)} TEST (约33.3%)
    - 部署者账户: ${ethers.formatEther(contracts.deployerTokenBalance)} TEST

### 7. RealEstateFacade
- 地址: ${contracts.realEstateFacadeAddress}
- 实现地址: ${contracts.realEstateFacadeImplementation}
- 功能: 系统门面合约，提供统一的接口访问
- 权限: 需要 MANAGER_ROLE 权限
- 授权账户: ${contracts.managerAddress}

## 权限说明
### 角色定义
1. ADMIN_ROLE
   - 权限级别: 最高
   - 主要职责: 系统管理、角色分配、合约升级
   - 持有账户: ${contracts.adminAddress}

2. MANAGER_ROLE
   - 权限级别: 高
   - 主要职责: 合约管理、参数配置、资产注册
   - 持有账户: ${contracts.managerAddress}

3. OPERATOR_ROLE
   - 权限级别: 中
   - 主要职责: 业务操作、订单处理、交易执行
   - 持有账户: ${contracts.operatorAddress}

### 权限验证结果
- 管理员权限: 已授予 ${contracts.adminAddress}
- 经理权限: 已授予 ${contracts.managerAddress}
- 操作员权限: 已授予 ${contracts.operatorAddress}

## 系统状态
- 当前状态: Active
- 紧急模式: 未激活
- 合约授权状态: 全部已授权

## 注意事项
1. 所有合约均采用 UUPS 可升级模式部署
2. 部署后请妥善保管管理员私钥
3. 建议定期备份环境变量文件
4. 如需升级合约，请遵循升级流程
5. 角色权限变更需通过管理员账户操作

## 环境变量
所有合约地址和角色账户已更新至 .env 文件，并已创建备份文件。
`;
  
  // 确保部署报告目录存在
  const reportsDir = path.join(__dirname, '..', 'deployment-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    logger.info(`创建部署报告目录: ${reportsDir}`);
  }
  
  // 写入部署报告
  const reportPath = path.join(reportsDir, `${network}-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  logger.info(`部署报告已生成: ${reportPath}`);
  
  return report;
}

/**
 * 更新环境变量文件
 */
function updateEnvFile(contracts) {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    // 检查文件权限
    try {
      fs.accessSync(envPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      logger.warn(`无法访问 .env 文件: ${err.message}`);
      logger.info('尝试修改文件权限...');
      
      try {
        // 尝试修改文件权限为 666 (rw-rw-rw-)
        fs.chmodSync(envPath, 0o666);
        logger.info('文件权限已修改为 666');
      } catch (chmodErr) {
        logger.warn(`无法修改文件权限: ${chmodErr.message}`);
        logger.warn('请手动修改文件权限或使用 sudo 运行脚本');
        return;
      }
    }
    
    // 确保环境变量文件存在
    if (!fs.existsSync(envPath)) {
      try {
        // 创建文件并设置权限为 666
        fs.writeFileSync(envPath, '');
        fs.chmodSync(envPath, 0o666);
        logger.info(`创建环境变量文件: ${envPath}`);
      } catch (err) {
        logger.warn(`无法创建 .env 文件: ${err.message}`);
        logger.warn('请手动创建 .env 文件并设置权限');
        return;
      }
    }
    
    // 备份环境变量文件
    const backupPath = path.join(__dirname, '..', `.env.backup.${Date.now()}`);
    try {
      fs.copyFileSync(envPath, backupPath);
      // 设置备份文件权限
      fs.chmodSync(backupPath, 0o666);
      logger.info(`环境变量文件已备份到: ${backupPath}`);
    } catch (err) {
      logger.warn(`无法备份 .env 文件: ${err.message}`);
      logger.warn('继续更新环境变量，但不创建备份');
    }
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // 更新或添加合约地址
    const envUpdates = {
      // 合约地址
      CONTRACT_REALESTATESYSTEM_ADDRESS: contracts.systemAddress,
      CONTRACT_PROPERTYMANAGER_ADDRESS: contracts.propertyManagerAddress,
      CONTRACT_TRADINGMANAGER_ADDRESS: contracts.tradingManagerAddress,
      CONTRACT_REWARDMANAGER_ADDRESS: contracts.rewardManagerAddress,
      CONTRACT_PROPERTYTOKEN_ADDRESS: contracts.propertyTokenAddress,
      CONTRACT_TESTTOKEN_ADDRESS: contracts.testTokenAddress,
      CONTRACT_REALESTATEFACADE_ADDRESS: contracts.realEstateFacadeAddress,
      
      // 实现地址
      CONTRACT_REALESTATESYSTEM_IMPLEMENTATION: contracts.systemImplementation,
      CONTRACT_PROPERTYMANAGER_IMPLEMENTATION: contracts.propertyManagerImplementation,
      CONTRACT_TRADINGMANAGER_IMPLEMENTATION: contracts.tradingManagerImplementation,
      CONTRACT_REWARDMANAGER_IMPLEMENTATION: contracts.rewardManagerImplementation,
      CONTRACT_PROPERTYTOKEN_IMPLEMENTATION: contracts.propertyTokenImplementation,
      CONTRACT_REALESTATEFACADE_IMPLEMENTATION: contracts.realEstateFacadeImplementation,
      
      // 部署信息
      DEPLOYER_ADDRESS: contracts.deployerAddress,
      DEPLOYMENT_NETWORK: hre.network.name,
      DEPLOYMENT_TIMESTAMP: new Date().toISOString()
    };
    
    // 更新环境变量
    for (const [key, value] of Object.entries(envUpdates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }
    
    try {
      fs.writeFileSync(envPath, envContent);
      // 确保写入后的文件权限正确
      fs.chmodSync(envPath, 0o666);
      logger.info('环境变量文件已更新');
    } catch (err) {
      logger.warn(`无法写入 .env 文件: ${err.message}`);
      logger.warn('请手动更新环境变量文件');
      // 打印需要更新的环境变量
      logger.info('需要更新的环境变量:');
      for (const [key, value] of Object.entries(envUpdates)) {
        logger.info(`${key}=${value}`);
      }
    }
  } catch (err) {
    logger.error(`更新环境变量文件时发生错误: ${err.message}`);
    logger.warn('请手动更新环境变量文件');
  }
}

/**
 * 验证合约部署
 */
async function verifyDeployment(contracts) {
  try {
    logger.info("开始验证合约部署...");
    
    // 验证系统状态
    const systemStatus = await contracts.system.getSystemStatus();
    logger.info(`系统状态: ${systemStatus}`);
    
    // 验证合约授权状态
    logger.info("合约授权状态:");
    const isPropertyManagerAuthorized = await contracts.system.authorizedContracts(contracts.propertyManagerAddress);
    logger.info(`- PropertyManager: ${isPropertyManagerAuthorized ? "已授权" : "未授权"}`);
    
    const isTradingManagerAuthorized = await contracts.system.authorizedContracts(contracts.tradingManagerAddress);
    logger.info(`- TradingManager: ${isTradingManagerAuthorized ? "已授权" : "未授权"}`);
    
    const isRewardManagerAuthorized = await contracts.system.authorizedContracts(contracts.rewardManagerAddress);
    logger.info(`- RewardManager: ${isRewardManagerAuthorized ? "已授权" : "未授权"}`);
    
    const isFacadeAuthorized = await contracts.system.authorizedContracts(contracts.realEstateFacadeAddress);
    logger.info(`- RealEstateFacade: ${isFacadeAuthorized ? "已授权" : "未授权"}`);
    
    // 验证交易参数
    logger.info("交易参数:");
    const maxTradeAmount = await contracts.tradingManager.maxTradeAmount();
    logger.info(`- 最大交易金额: ${maxTradeAmount} 份`);
    
    const minTradeAmount = await contracts.tradingManager.minTradeAmount();
    logger.info(`- 最小交易金额: ${minTradeAmount} 份`);
    
    const cooldownPeriod = await contracts.tradingManager.cooldownPeriod();
    logger.info(`- 冷却期: ${cooldownPeriod} 秒`);
    
    const feeRate = await contracts.tradingManager.feeRate();
    logger.info(`- 交易费率: ${Number(feeRate) / 100}%`);
    
    // 验证 SimpleERC20
    const testTokenName = await contracts.testToken.name();
    const testTokenSymbol = await contracts.testToken.symbol();
    const testTokenTotalSupply = await contracts.testToken.totalSupply();
    
    logger.info("SimpleERC20 信息:");
    logger.info(`- 名称: ${testTokenName}`);
    logger.info(`- 符号: ${testTokenSymbol}`);
    logger.info(`- 总供应量: ${ethers.formatEther(testTokenTotalSupply)}`);
    
    logger.info("合约验证完成！");
    return true;
  } catch (error) {
    logger.error("验证失败:", error);
    return false;
  }
}

/**
 * 设置角色权限
 * @param {Object} contracts - 合约实例
 */
async function setupRoles(contracts) {
  const { system, adminSigner, managerSigner, operatorSigner, deployer } = contracts;
  
  logger.info('开始设置角色权限...');
  
  // 首先授予部署账户 ADMIN_ROLE
  let tx = await system.connect(deployer).grantRole(ROLES.ADMIN_ROLE, deployer.address);
  await tx.wait();
  logger.info(`已授予 ${deployer.address} ADMIN_ROLE 权限`);
  
  // 然后授予部署账户 DEFAULT_ADMIN_ROLE
  tx = await system.connect(deployer).grantRole(ethers.ZeroHash, deployer.address);
  await tx.wait();
  logger.info(`已授予 ${deployer.address} DEFAULT_ADMIN_ROLE 权限`);
  
  // 授予管理员角色
  tx = await system.connect(deployer).grantRole(ROLES.ADMIN_ROLE, adminSigner.address);
  await tx.wait();
  logger.info(`已授予 ${adminSigner.address} ADMIN_ROLE 权限`);
  tx = await system.connect(deployer).grantRole(ROLES.MANAGER_ROLE, adminSigner.address);
  await tx.wait();
  logger.info(`已授予 ${adminSigner.address} MANAGER_ROLE 权限`);
  tx = await system.connect(deployer).grantRole(ROLES.OPERATOR_ROLE, adminSigner.address);
  await tx.wait();
  logger.info(`已授予 ${adminSigner.address} OPERATOR_ROLE 权限`);
  
  // 验证 ADMIN 是否自动获得 MANAGER 和 OPERATOR 权限
  const isAdminHasManager = await system.hasRole(ROLES.MANAGER_ROLE, adminSigner.address);
  const isAdminHasOperator = await system.hasRole(ROLES.OPERATOR_ROLE, adminSigner.address);
  logger.info(`- 管理员是否拥有经理权限: ${isAdminHasManager ? "是" : "否"}`);
  logger.info(`- 管理员是否拥有操作员权限: ${isAdminHasOperator ? "是" : "否"}`);
  
  // 授予经理角色
  tx = await system.connect(deployer).grantRole(ROLES.MANAGER_ROLE, managerSigner.address);
  await tx.wait();
  logger.info(`已授予 ${managerSigner.address} MANAGER_ROLE 权限`);
  tx = await system.connect(deployer).grantRole(ROLES.OPERATOR_ROLE, managerSigner.address);
  await tx.wait();
  logger.info(`已授予 ${managerSigner.address} OPERATOR_ROLE 权限`);

  // 验证 MANAGER 是否自动获得 OPERATOR 权限
  const isManagerHasOperator = await system.hasRole(ROLES.OPERATOR_ROLE, managerSigner.address);
  logger.info(`- 经理是否拥有操作员权限: ${isManagerHasOperator ? "是" : "否"}`);
  
  // 授予操作员角色
  tx = await system.connect(deployer).grantRole(ROLES.OPERATOR_ROLE, operatorSigner.address);
  await tx.wait();
  logger.info(`已授予 ${operatorSigner.address} OPERATOR_ROLE 权限`);
  
  // 验证角色权限
  const isAdmin = await system.hasRole(ROLES.ADMIN_ROLE, adminSigner.address);
  const isManager = await system.hasRole(ROLES.MANAGER_ROLE, managerSigner.address);
  const isOperator = await system.hasRole(ROLES.OPERATOR_ROLE, operatorSigner.address);
  
  logger.info("角色权限验证结果:");
  logger.info(`- 管理员权限: ${isAdmin ? "已授予" : "未授予"}`);
  logger.info(`- 经理权限: ${isManager ? "已授予" : "未授予"}`);
  logger.info(`- 操作员权限: ${isOperator ? "已授予" : "未授予"}`);
  
  if (!isAdmin || !isAdminHasManager || !isAdminHasOperator || !isManager || !isManagerHasOperator || !isOperator) {
    throw new Error('角色设置验证失败');
  }
  
  logger.info('角色权限设置完成');
}

async function deploy() {
  try {
    // 打印网络信息
    const network = hre.network.name;
    const chainId = hre.network.config.chainId;
    const rpcUrl = hre.network.config.url;
    
    logger.info("=== 部署信息 ===");
    logger.info(`网络: ${network}`);
    logger.info(`Chain ID: ${chainId}`);
    logger.info(`RPC URL: ${rpcUrl}`);
    logger.info("===============");

    // 生成随机私钥和地址
    const randomWallet = ethers.Wallet.createRandom();
    const randomPrivateKey = randomWallet.privateKey;
    const randomAddress = randomWallet.address;
    
    logger.info("=== 新生成的部署账户 ===");
    logger.info(`地址: ${randomAddress}`);
    logger.info(`私钥: ${randomPrivateKey}`);
    logger.info("=====================");

    // 获取当前部署账户
    const [deployer] = await ethers.getSigners();
    logger.info(`当前部署账户: ${deployer.address}`);
    
    // 检查当前账户余额
    const initialBalance = await ethers.provider.getBalance(deployer.address);
    logger.info(`当前账户余额: ${ethers.formatEther(initialBalance)} ETH`);
    
    // 转账 10 ETH 到新生成的地址
    const transferAmount = ethers.parseEther("10");
    if (initialBalance < transferAmount) {
      throw new Error(`当前账户余额不足，需要至少 10 ETH，当前余额: ${ethers.formatEther(initialBalance)} ETH`);
    }
    
    logger.info(`正在转账 10 ETH 到新地址: ${randomAddress}`);
    const transferTx = await deployer.sendTransaction({
      to: randomAddress,
      value: transferAmount
    });
    await transferTx.wait();
    
    // 验证转账结果
    const newBalance = await ethers.provider.getBalance(randomAddress);
    logger.info(`新地址余额: ${ethers.formatEther(newBalance)} ETH`);
    
    // 使用新生成的私钥创建签名者
    const newDeployer = new ethers.Wallet(randomPrivateKey, ethers.provider);
    logger.info(`使用新地址 ${newDeployer.address} 进行部署`);

    // 从环境变量读取角色账户
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    const managerPrivateKey = process.env.MANAGER_PRIVATE_KEY;
    const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;
    
    if (!adminPrivateKey || !managerPrivateKey || !operatorPrivateKey) {
      throw new Error("请在 .env 文件中设置 ADMIN_PRIVATE_KEY, MANAGER_PRIVATE_KEY 和 OPERATOR_PRIVATE_KEY");
    }
    
    // 创建角色账户
    const adminSigner = new ethers.Wallet(adminPrivateKey, ethers.provider);
    const managerSigner = new ethers.Wallet(managerPrivateKey, ethers.provider);
    const operatorSigner = new ethers.Wallet(operatorPrivateKey, ethers.provider);
    
    logger.info(`管理员账户: ${adminSigner.address}`);
    logger.info(`经理账户: ${managerSigner.address}`);
    logger.info(`操作员账户: ${operatorSigner.address}`);
    
    // 1. 首先部署 System 合约
    logger.info("步骤1: 部署 RealEstateSystem...");
    const System = await ethers.getContractFactory("RealEstateSystem");
    const system = await upgrades.deployProxy(System, [adminSigner.address], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto"],
      signer: deployer // 使用原始部署账户进行初始部署
    });
    await system.waitForDeployment();
    const systemAddress = await system.getAddress();
    const systemImplementation = await upgrades.erc1967.getImplementationAddress(systemAddress);
    logger.info(`RealEstateSystem 部署到: ${systemAddress}`);
    logger.info(`RealEstateSystem 实现地址: ${systemImplementation}`);
    
    // 授予新部署账户 ADMIN_ROLE
    let adminTx = await system.connect(deployer).grantRole(ROLES.ADMIN_ROLE, newDeployer.address);
    await adminTx.wait();
    logger.info(`已授予 ${newDeployer.address} ADMIN_ROLE 权限`);
    
    // 授予新部署账户 DEFAULT_ADMIN_ROLE
    adminTx = await system.connect(deployer).grantRole(ethers.ZeroHash, newDeployer.address);
    await adminTx.wait();
    logger.info(`已授予 ${newDeployer.address} DEFAULT_ADMIN_ROLE 权限`);
    
    // 2. 部署其他合约，使用新部署账户
    logger.info("步骤2: 部署管理合约...");
    
    // 部署 PropertyManager
    logger.info("部署 PropertyManager...");
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    const propertyManager = await upgrades.deployProxy(PropertyManager, [systemAddress], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"],
      signer: newDeployer // 使用新部署账户
    });
    await propertyManager.waitForDeployment();
    const propertyManagerAddress = await propertyManager.getAddress();
    const propertyManagerImplementation = await upgrades.erc1967.getImplementationAddress(propertyManagerAddress);
    logger.info(`PropertyManager 部署到: ${propertyManagerAddress}`);
    logger.info(`PropertyManager 实现地址: ${propertyManagerImplementation}`);
    
    // 部署 TradingManager
    logger.info("部署 TradingManager...");
    const TradingManager = await ethers.getContractFactory("TradingManager");
    const tradingManager = await upgrades.deployProxy(TradingManager, [systemAddress], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await tradingManager.waitForDeployment();
    const tradingManagerAddress = await tradingManager.getAddress();
    const tradingManagerImplementation = await upgrades.erc1967.getImplementationAddress(tradingManagerAddress);
    logger.info(`TradingManager 部署到: ${tradingManagerAddress}`);
    logger.info(`TradingManager 实现地址: ${tradingManagerImplementation}`);
    
    // 部署 RewardManager
    logger.info("部署 RewardManager...");
    const RewardManager = await ethers.getContractFactory("RewardManager");
    const rewardManager = await upgrades.deployProxy(RewardManager, [
      systemAddress,
      propertyManagerAddress,
      tradingManagerAddress
    ], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await rewardManager.waitForDeployment();
    const rewardManagerAddress = await rewardManager.getAddress();
    const rewardManagerImplementation = await upgrades.erc1967.getImplementationAddress(rewardManagerAddress);
    logger.info(`RewardManager 部署到: ${rewardManagerAddress}`);
    logger.info(`RewardManager 实现地址: ${rewardManagerImplementation}`);
    
    // 3. 在系统中授权各合约
    logger.info("步骤3: 授权合约...");
    let tx = await system.setContractAuthorization(propertyManagerAddress, true);
    await tx.wait();
    logger.info("PropertyManager 已授权");
    
    tx = await system.setContractAuthorization(tradingManagerAddress, true);
    await tx.wait();
    logger.info("TradingManager 已授权");
    
    tx = await system.setContractAuthorization(rewardManagerAddress, true);
    await tx.wait();
    logger.info("RewardManager 已授权");
    
    // 4. 部署 SimpleERC20 测试代币
    logger.info("步骤4: 部署 SimpleERC20 测试代币...");
    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const testToken = await SimpleERC20.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("100000000") // 初始供应量：100,000,000 TEST (1亿)
    );
    await testToken.waitForDeployment();
    const testTokenAddress = await testToken.getAddress();
    logger.info(`SimpleERC20 部署到: ${testTokenAddress}`);
    
    // 将代币平均分配给admin、manager和operator地址
    // 这样可以确保三个关键角色账户都有足够的代币进行测试
    // 平均分配可以让角色间在测试时有相同的初始资源
    logger.info("将测试代币平均分配给角色账户...");
    const totalSupply = await testToken.totalSupply();
    const thirdOfSupply = totalSupply / 3n;
    
    // 转移给管理员
    logger.info(`转移 ${ethers.formatEther(thirdOfSupply)} TEST 到管理员账户: ${adminSigner.address}`);
    let tokenTx = await testToken.transfer(adminSigner.address, thirdOfSupply);
    await tokenTx.wait();
    
    // 转移给经理
    logger.info(`转移 ${ethers.formatEther(thirdOfSupply)} TEST 到经理账户: ${managerSigner.address}`);
    tokenTx = await testToken.transfer(managerSigner.address, thirdOfSupply);
    await tokenTx.wait();
    
    // 转移给操作员
    logger.info(`转移 ${ethers.formatEther(thirdOfSupply)} TEST 到操作员账户: ${operatorSigner.address}`);
    tokenTx = await testToken.transfer(operatorSigner.address, thirdOfSupply);
    await tokenTx.wait();
    
    // 设置 TradingManager 的 USDT 地址
    logger.info("设置 TradingManager 的 USDT 地址...");
    tx = await tradingManager.setUsdtAddress(testTokenAddress);
    await tx.wait();
    logger.info(`TradingManager USDT 地址已设置为: ${testTokenAddress}`);
    
    // 验证代币分配结果
    const adminBalance = await testToken.balanceOf(adminSigner.address);
    const managerBalance = await testToken.balanceOf(managerSigner.address);
    const operatorBalance = await testToken.balanceOf(operatorSigner.address);
    const newDeployerTokenBalance = await testToken.balanceOf(newDeployer.address);
    
    logger.info("代币分配结果:");
    logger.info(`- 管理员账户余额: ${ethers.formatEther(adminBalance)} TEST`);
    logger.info(`- 经理账户余额: ${ethers.formatEther(managerBalance)} TEST`);
    logger.info(`- 操作员账户余额: ${ethers.formatEther(operatorBalance)} TEST`);
    logger.info(`- 部署者账户余额: ${ethers.formatEther(newDeployerTokenBalance)} TEST`);
    
    // 5. 部署门面合约
    logger.info("步骤5: 部署门面合约...");
    const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
    const facade = await upgrades.deployProxy(
        RealEstateFacade,
        [
            systemAddress,
            propertyManagerAddress,
            tradingManagerAddress,
            rewardManagerAddress
        ],
        { initializer: 'initialize' }
    );
    await facade.waitForDeployment();
    const facadeAddress = await facade.getAddress();
    logger.info(`RealEstateFacade 部署到: ${facadeAddress}`);
    
    // 授予 RealEstateFacade 合约 OPERATOR_ROLE 权限
    logger.info('授予 RealEstateFacade 合约权限...');
    await system.connect(adminSigner).grantRole(ROLES.ADMIN_ROLE, facadeAddress);
    logger.info('已授予 RealEstateFacade 合约 ADMIN_ROLE 权限');
    
    await system.connect(adminSigner).grantRole(ROLES.MANAGER_ROLE, facadeAddress);
    logger.info('已授予 RealEstateFacade 合约 MANAGER_ROLE 权限');
    
    await system.connect(adminSigner).grantRole(ROLES.OPERATOR_ROLE, facadeAddress);
    logger.info('已授予 RealEstateFacade 合约 OPERATOR_ROLE 权限');
    
    // 验证 Facade 是否获得所有必要权限
    const facadeHasAdmin = await system.hasRole(ROLES.ADMIN_ROLE, facadeAddress);
    const facadeHasManager = await system.hasRole(ROLES.MANAGER_ROLE, facadeAddress);
    const facadeHasOperator = await system.hasRole(ROLES.OPERATOR_ROLE, facadeAddress);
    logger.info(`Facade合约权限验证结果:`);
    logger.info(`- ADMIN_ROLE: ${facadeHasAdmin ? "已授予" : "未授予"}`);
    logger.info(`- MANAGER_ROLE: ${facadeHasManager ? "已授予" : "未授予"}`);
    logger.info(`- OPERATOR_ROLE: ${facadeHasOperator ? "已授予" : "未授予"}`);
    
    if (!facadeHasAdmin || !facadeHasManager || !facadeHasOperator) {
        logger.warn('⚠️ Facade合约权限授予不完整，可能导致权限验证问题');
    }
    
    // 激活系统
    logger.info('正在激活系统...');
    await system.connect(adminSigner).setSystemStatus(2); // 2 = Active
    logger.info('系统已激活');
    
    // 验证系统状态
    const systemStatus = await system.getSystemStatus();
    logger.info(`系统状态: ${systemStatus}`);
    if (Number(systemStatus) !== 2) { // 2 = Active
        throw new Error(`系统激活失败，当前状态: ${systemStatus}`);
    }
    logger.info('系统状态验证通过');
    
    // 6. 设置交易管理器参数
    logger.info("步骤6: 配置交易参数...");
    tx = await tradingManager.setMaxTradeAmount(100000000);
    await tx.wait();
    tx = await tradingManager.setMinTradeAmount(1);
    await tx.wait();
    tx = await tradingManager.setCooldownPeriod(10);
    await tx.wait();
    tx = await tradingManager.setFeeRate(100); // 1%
    await tx.wait();
    tx = await tradingManager.setFeeReceiver(newDeployer.address);
    await tx.wait();
    
    // 7. 设置角色权限
    await setupRoles({
      system,
      adminSigner,
      managerSigner,
      operatorSigner,
      deployer: newDeployer
    });
    
    // 生成部署报告
    const finalBalance = await ethers.provider.getBalance(newDeployer.address);
    logger.info(`部署后新地址余额: ${ethers.formatEther(finalBalance)} ETH`);

    const contracts = {
      deployerAddress: newDeployer.address,
      deployerPrivateKey: randomPrivateKey,
      deployerInitialBalance: transferAmount, // 使用转账金额作为初始余额
      deployerFinalBalance: finalBalance,
      adminAddress: adminSigner.address,
      managerAddress: managerSigner.address,
      operatorAddress: operatorSigner.address,
      systemAddress,
      systemImplementation,
      propertyManagerAddress,
      propertyManagerImplementation,
      tradingManagerAddress,
      tradingManagerImplementation,
      rewardManagerAddress,
      rewardManagerImplementation,
      propertyTokenAddress: "0x0", // 示例代币，实际部署时会生成
      propertyTokenImplementation: "0x0", // 示例代币，实际部署时会生成
      testTokenAddress,
      realEstateFacadeAddress: facadeAddress,
      realEstateFacadeImplementation: await upgrades.erc1967.getImplementationAddress(facadeAddress),
      adminTokenBalance: adminBalance,
      managerTokenBalance: managerBalance,
      operatorTokenBalance: operatorBalance,
      deployerTokenBalance: newDeployerTokenBalance
    };
    
    generateDeploymentReport(contracts);
    updateEnvFile(contracts);
    
    logger.info("部署完成！");
  } catch (error) {
    logger.error(`部署失败: ${error}`);
    throw error;
  }
}

deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = { deploy, verifyDeployment };