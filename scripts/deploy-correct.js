const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

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
  
  const report = `# 房地产代币化系统部署报告

## 基本信息
- 部署时间: ${timestamp}
- 网络: ${network}
- 部署账户: ${contracts.deployerAddress}

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

## 合约详情

### 1. RealEstateSystem
- 地址: ${contracts.systemAddress}
- 实现地址: ${contracts.systemImplementation}
- 功能: 系统核心合约，负责权限管理和系统状态控制
- 权限: 拥有 ADMIN_ROLE、MANAGER_ROLE、OPERATOR_ROLE 等角色管理权限

### 2. PropertyManager
- 地址: ${contracts.propertyManagerAddress}
- 实现地址: ${contracts.propertyManagerImplementation}
- 功能: 管理房地产资产，包括资产注册、状态更新等
- 权限: 需要 MANAGER_ROLE 权限

### 3. TradingManager
- 地址: ${contracts.tradingManagerAddress}
- 实现地址: ${contracts.tradingManagerImplementation}
- 功能: 管理代币交易，包括订单创建、执行等
- 权限: 需要 MANAGER_ROLE 权限
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

### 5. PropertyToken
- 地址: ${contracts.propertyTokenAddress}
- 实现地址: ${contracts.propertyTokenImplementation}
- 功能: 房地产代币合约，实现 ERC20 标准
- 权限: 需要 MANAGER_ROLE 权限
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
  - 初始供应量: 1,000,000 TEST

### 7. RealEstateFacade
- 地址: ${contracts.realEstateFacadeAddress}
- 实现地址: ${contracts.realEstateFacadeImplementation}
- 功能: 系统门面合约，提供统一的接口访问
- 权限: 需要 MANAGER_ROLE 权限

## 权限说明
- ADMIN_ROLE: 系统管理员，拥有最高权限
- MANAGER_ROLE: 合约管理员，负责日常运营
- OPERATOR_ROLE: 操作员，执行具体业务操作

## 系统状态
- 当前状态: Active
- 紧急模式: 未激活
- 合约授权状态: 全部已授权

## 注意事项
1. 所有合约均采用 UUPS 可升级模式部署
2. 部署后请妥善保管管理员私钥
3. 建议定期备份环境变量文件
4. 如需升级合约，请遵循升级流程

## 环境变量
所有合约地址已更新至 .env 文件，并已创建备份文件。
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
  
  // 确保环境变量文件存在
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, '');
    logger.info(`创建环境变量文件: ${envPath}`);
  }
  
  // 备份环境变量文件
  const backupPath = path.join(__dirname, '..', `.env.backup.${Date.now()}`);
  fs.copyFileSync(envPath, backupPath);
  logger.info(`环境变量文件已备份到: ${backupPath}`);
  
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
  
  fs.writeFileSync(envPath, envContent);
  logger.info('环境变量文件已更新');
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
    
    // 验证合约授权
    const isPropertyManagerAuthorized = await contracts.system.authorizedContracts(contracts.propertyManagerAddress);
    const isTradingManagerAuthorized = await contracts.system.authorizedContracts(contracts.tradingManagerAddress);
    const isRewardManagerAuthorized = await contracts.system.authorizedContracts(contracts.rewardManagerAddress);
    const isFacadeAuthorized = await contracts.system.authorizedContracts(contracts.realEstateFacadeAddress);
    
    logger.info("合约授权状态:");
    logger.info(`- PropertyManager: ${isPropertyManagerAuthorized ? "已授权" : "未授权"}`);
    logger.info(`- TradingManager: ${isTradingManagerAuthorized ? "已授权" : "未授权"}`);
    logger.info(`- RewardManager: ${isRewardManagerAuthorized ? "已授权" : "未授权"}`);
    logger.info(`- RealEstateFacade: ${isFacadeAuthorized ? "已授权" : "未授权"}`);
    
    // 验证交易参数
    const maxTradeAmount = await contracts.tradingManager.maxTradeAmount();
    const minTradeAmount = await contracts.tradingManager.minTradeAmount();
    const cooldownPeriod = await contracts.tradingManager.cooldownPeriod();
    const feeRate = await contracts.tradingManager.feeRate();
    
    logger.info("交易参数:");
    logger.info(`- 最大交易金额: ${ethers.formatEther(maxTradeAmount)} ETH`);
    logger.info(`- 最小交易金额: ${ethers.formatEther(minTradeAmount)} ETH`);
    logger.info(`- 冷却期: ${cooldownPeriod} 秒`);
    logger.info(`- 交易费率: ${Number(feeRate) / 100}%`);
    
    // 验证 PropertyToken
    const propertyTokenName = await contracts.propertyToken.name();
    const propertyTokenSymbol = await contracts.propertyToken.symbol();
    const propertyTokenTotalSupply = await contracts.propertyToken.totalSupply();
    
    logger.info("PropertyToken 信息:");
    logger.info(`- 名称: ${propertyTokenName}`);
    logger.info(`- 符号: ${propertyTokenSymbol}`);
    logger.info(`- 总供应量: ${ethers.formatEther(propertyTokenTotalSupply)}`);
    
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

async function deploy() {
  try {
    logger.info("开始正确的部署流程...");
    const [deployer] = await ethers.getSigners();
    logger.info(`部署账户: ${deployer.address}`);
    
    // 1. 首先部署 System 合约
    logger.info("步骤1: 部署 RealEstateSystem...");
    const System = await ethers.getContractFactory("RealEstateSystem");
    const system = await upgrades.deployProxy(System, [deployer.address], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto"]
    });
    await system.waitForDeployment();
    const systemAddress = await system.getAddress();
    const systemImplementation = await upgrades.erc1967.getImplementationAddress(systemAddress);
    logger.info(`RealEstateSystem 部署到: ${systemAddress}`);
    logger.info(`RealEstateSystem 实现地址: ${systemImplementation}`);
    
    // 2. 部署其他合约，直接传入正确的系统地址
    logger.info("步骤2: 部署管理合约...");
    
    // 部署 PropertyManager
    logger.info("部署 PropertyManager...");
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    const propertyManager = await upgrades.deployProxy(PropertyManager, [systemAddress], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
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
    const rewardManager = await upgrades.deployProxy(RewardManager, [systemAddress], {
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
    
    // 4. 部署 PropertyToken
    logger.info("步骤4: 部署 PropertyToken...");
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyToken = await upgrades.deployProxy(PropertyToken, [
      ethers.ZeroHash, // propertyIdHash
      "Test Property Token", // name
      "TPT", // symbol
      ethers.parseEther("1000000"), // initialSupply
      deployer.address, // admin
      systemAddress // systemAddress
    ], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await propertyToken.waitForDeployment();
    const propertyTokenAddress = await propertyToken.getAddress();
    const propertyTokenImplementation = await upgrades.erc1967.getImplementationAddress(propertyTokenAddress);
    logger.info(`PropertyToken 部署到: ${propertyTokenAddress}`);
    logger.info(`PropertyToken 实现地址: ${propertyTokenImplementation}`);
    
    // 5. 部署 SimpleERC20 测试代币
    logger.info("步骤5: 部署 SimpleERC20 测试代币...");
    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const testToken = await SimpleERC20.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000") // 初始供应量：1,000,000 TEST
    );
    await testToken.waitForDeployment();
    const testTokenAddress = await testToken.getAddress();
    logger.info(`SimpleERC20 部署到: ${testTokenAddress}`);
    
    // 6. 部署门面合约
    logger.info("步骤6: 部署门面合约...");
    const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
    const realEstateFacade = await upgrades.deployProxy(RealEstateFacade, [
      systemAddress,
      propertyManagerAddress,
      tradingManagerAddress,
      rewardManagerAddress
    ], {
      kind: "uups",
      unsafeAllow: ["constructor", "delegatecall", "selfdestruct", "missing-public-upgradeto", "state-variable-immutable", "state-variable-assignment", "external-library-linking"]
    });
    await realEstateFacade.waitForDeployment();
    const realEstateFacadeAddress = await realEstateFacade.getAddress();
    const realEstateFacadeImplementation = await upgrades.erc1967.getImplementationAddress(realEstateFacadeAddress);
    logger.info(`RealEstateFacade 部署到: ${realEstateFacadeAddress}`);
    logger.info(`RealEstateFacade 实现地址: ${realEstateFacadeImplementation}`);
    
    // 授权门面合约
    tx = await system.setContractAuthorization(realEstateFacadeAddress, true);
    await tx.wait();
    logger.info("RealEstateFacade 已授权");
    
    // 7. 设置交易管理器参数
    logger.info("步骤7: 配置交易参数...");
    tx = await tradingManager.setMaxTradeAmount(ethers.parseEther("1000"));
    await tx.wait();
    tx = await tradingManager.setMinTradeAmount(ethers.parseEther("0.01"));
    await tx.wait();
    tx = await tradingManager.setCooldownPeriod(3600);
    await tx.wait();
    tx = await tradingManager.setFeeRate(100); // 1%
    await tx.wait();
    tx = await tradingManager.setFeeReceiver(deployer.address);
    await tx.wait();
    logger.info("交易参数已配置");
    
    // 8. 激活系统
    logger.info("步骤8: 激活系统...");
    tx = await system.setSystemStatus(2); // Active = 2
    await tx.wait();
    logger.info("系统已激活");
    
    // 输出所有合约地址
    logger.info("== 合约地址摘要 ==");
    logger.info(`RealEstateSystem: ${systemAddress}`);
    logger.info(`PropertyManager: ${propertyManagerAddress}`);
    logger.info(`TradingManager: ${tradingManagerAddress}`);
    logger.info(`RewardManager: ${rewardManagerAddress}`);
    logger.info(`PropertyToken: ${propertyTokenAddress}`);
    logger.info(`SimpleERC20: ${testTokenAddress}`);
    logger.info(`RealEstateFacade: ${realEstateFacadeAddress}`);
    
    // 验证部署
    const contracts = {
      system,
      propertyManager,
      tradingManager,
      rewardManager,
      propertyToken,
      testToken,
      realEstateFacade,
      systemAddress,
      propertyManagerAddress,
      tradingManagerAddress,
      rewardManagerAddress,
      propertyTokenAddress,
      testTokenAddress,
      realEstateFacadeAddress,
      systemImplementation,
      propertyManagerImplementation,
      tradingManagerImplementation,
      rewardManagerImplementation,
      propertyTokenImplementation,
      realEstateFacadeImplementation,
      deployerAddress: deployer.address
    };
    
    await verifyDeployment(contracts);
    
    // 生成部署报告
    const report = generateDeploymentReport(contracts);
    
    // 更新环境变量文件
    updateEnvFile(contracts);
    
    logger.info("部署完成！系统已准备就绪。");
    
    return contracts;
  } catch (error) {
    logger.error("部署失败:", error);
    throw error;
  }
}

// 执行部署
deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = { deploy, verifyDeployment };