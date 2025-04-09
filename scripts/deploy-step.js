const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers, upgrades } = require("hardhat");
require('dotenv').config();
const { verifyFacadeConnections } = require("./verify-facade-connections");

const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
};

// 获取合约初始化参数
const getContractInitParams = () => {
  return {
    trading: {
      tradingFeeRate: parseInt(process.env.TRADING_FEE_RATE || "100"), // 默认1%
      tradingFeeReceiver: process.env.TRADING_FEE_RECEIVER || ethers.ZeroAddress,
    },
    reward: {
      platformFeeRate: parseInt(process.env.PLATFORM_FEE_RATE || "500"), // 默认5%
      maintenanceFeeRate: parseInt(process.env.MAINTENANCE_FEE_RATE || "200"), // 默认2%
      rewardFeeReceiver: process.env.REWARD_FEE_RECEIVER || ethers.ZeroAddress,
      minDistributionThreshold: process.env.MIN_DISTRIBUTION_THRESHOLD || "0.01"
    },
    tokenFactory: {
      name: process.env.TOKEN_FACTORY_NAME || "Token Factory",
      symbol: process.env.TOKEN_FACTORY_SYMBOL || "TF",
      initialSupply: process.env.TOKEN_FACTORY_INITIAL_SUPPLY || "0"
    }
  };
};

async function verifyContract(contractAddress, contractName, constructorArguments = []) {
  try {
    logger.info(`Verifying ${contractName} at ${contractAddress}...`);
    
    // 如果网络不是本地网络，才进行验证
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
      await hre.run("verify:verify", {
        address: contractAddress,
        contract: `contracts/${contractName}.sol:${contractName}`,
        constructorArguments: constructorArguments
      });
      logger.info(`${contractName} verified successfully`);
    } else {
      logger.info(`Skipping verification on ${hre.network.name}`);
    }
  } catch (error) {
    logger.error(`Failed to verify ${contractName}: ${error.message}`);
  }
}

async function deployTestToken(signer) {
  logger.info("Deploying SimpleERC20 test token...");
  const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
  const testToken = await SimpleERC20.deploy(
    "Test Token", 
    "TEST",
    ethers.parseEther("1000000") // 初始供应量：1,000,000 TEST
  );
  
  await testToken.waitForDeployment();
  
  const testTokenAddress = await testToken.getAddress();
  logger.info("TestToken deployed at:", testTokenAddress);
  logger.info("Minted 1,000,000 TEST tokens");
  
  // 注意：SimpleERC20 不需要调用 mint 函数，因为在构造函数中已经铸造了代币
  
  if (process.env.NODE_ENV === "production") {
    await verifyContract(testTokenAddress, "SimpleERC20", [
      "Test Token", 
      "TEST",
      ethers.parseEther("1000000")
    ]);
  }
  
  return testToken;
}

/**
 * 使用单步部署方式部署整个系统
 */
async function deploySystemStep(signer) {
  // 获取合约初始化参数
  const initParams = getContractInitParams();
  
  // 部署 PropertyManager
  logger.info("Deploying PropertyManager...");
  const PropertyManager = await ethers.getContractFactory("PropertyManager");
  const propertyManager = await upgrades.deployProxy(PropertyManager, [signer.address], {
    kind: "uups",
  });
  await propertyManager.waitForDeployment();
  const propertyManagerAddress = await propertyManager.getAddress();
  logger.info("PropertyManager deployed at:", propertyManagerAddress);
  
  // 部署 TradingManager
  logger.info("Deploying TradingManager...");
  const TradingManager = await ethers.getContractFactory("TradingManager");
  const tradingManager = await upgrades.deployProxy(TradingManager, [signer.address], {
    kind: "uups",
  });
  await tradingManager.waitForDeployment();
  const tradingManagerAddress = await tradingManager.getAddress();
  logger.info("TradingManager deployed at:", tradingManagerAddress);
  
  // 从环境变量读取或使用默认值
  const maxTradeAmount = process.env.MAX_TRADE_AMOUNT || "1000"; // 默认为1000
  const minTradeAmount = process.env.MIN_TRADE_AMOUNT || "0.01"; // 默认为0.01
  const cooldownPeriod = process.env.COOLDOWN_PERIOD || "3600"; // 默认为1小时(3600秒)
  
  // 部署 RewardManager
  logger.info("Deploying RewardManager...");
  const RewardManager = await ethers.getContractFactory("RewardManager");
  const rewardManager = await upgrades.deployProxy(RewardManager, [
    initParams.reward.platformFeeRate,
    initParams.reward.maintenanceFeeRate,
    initParams.reward.rewardFeeReceiver,
    ethers.parseEther(initParams.reward.minDistributionThreshold.toString()),
    signer.address  // 系统地址 - 这里暂时用部署者地址，后面会更新
  ], {
    kind: "uups",
  });
  await rewardManager.waitForDeployment();
  const rewardManagerAddress = await rewardManager.getAddress();
  logger.info("RewardManager deployed at:", rewardManagerAddress);
  
  // 部署 PropertyToken
  logger.info("Deploying PropertyToken...");
  const PropertyToken = await ethers.getContractFactory("PropertyToken");
  const propertyToken = await upgrades.deployProxy(PropertyToken, [
    ethers.ZeroHash,
    initParams.tokenFactory.name,
    initParams.tokenFactory.symbol,
    ethers.parseEther(initParams.tokenFactory.initialSupply.toString()),
    signer.address,
    signer.address  // Add a placeholder for systemAddress, will update it after system is deployed
  ], {
    kind: "uups",
  });
  await propertyToken.waitForDeployment();
  const propertyTokenAddress = await propertyToken.getAddress();
  logger.info("PropertyToken deployed at:", propertyTokenAddress);
  
  // 部署 System
  logger.info("Deploying System...");
  const System = await ethers.getContractFactory("RealEstateSystem");
  const system = await upgrades.deployProxy(System, [
    signer.address  // Only pass the admin address
  ], {
    kind: "uups",
  });
  await system.waitForDeployment();
  const systemAddress = await system.getAddress();
  logger.info("System deployed at:", systemAddress);
  
  // 更新所有合约的系统地址
  logger.info("Updating system address in all contracts...");
  let tx = await propertyManager.setSystem(systemAddress);
  await tx.wait();
  
  tx = await tradingManager.setSystem(systemAddress);
  await tx.wait();
  
  tx = await rewardManager.setSystem(systemAddress);
  await tx.wait();
  
  // Update PropertyToken's system address
  logger.info("Updating PropertyToken's system address...");
  tx = await propertyToken.setSystem(systemAddress);
  await tx.wait();
  
  // 现在设置交易管理器参数（在系统设置之后）
  logger.info("Setting TradingManager parameters...");
  
  // 设置最大交易金额
  console.log(`INFO: Setting max trade amount to ${maxTradeAmount}`);
  tx = await tradingManager.setMaxTradeAmount(ethers.parseEther(maxTradeAmount.toString()));
  await tx.wait();
  
  // 设置最小交易金额
  console.log(`INFO: Setting min trade amount to ${minTradeAmount}`);
  tx = await tradingManager.setMinTradeAmount(ethers.parseEther(minTradeAmount.toString()));
  await tx.wait();
  
  // 设置冷却期
  console.log(`INFO: Setting cooldown period to ${cooldownPeriod} seconds`);
  tx = await tradingManager.setCooldownPeriod(cooldownPeriod);
  await tx.wait();
  
  // 设置交易费率和接收者
  tx = await tradingManager.setFeeRate(initParams.trading.tradingFeeRate);
  await tx.wait();
  tx = await tradingManager.setFeeReceiver(initParams.trading.tradingFeeReceiver);
  await tx.wait();
  
  // 部署 Facade
  logger.info("Deploying RealEstateFacade...");
  const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
  const realEstateFacade = await upgrades.deployProxy(RealEstateFacade, [
    systemAddress,
    propertyManagerAddress,
    tradingManagerAddress,
    rewardManagerAddress
  ], {
    kind: "uups",
  });
  await realEstateFacade.waitForDeployment();
  const realEstateFacadeAddress = await realEstateFacade.getAddress();
  logger.info("RealEstateFacade deployed at:", realEstateFacadeAddress);
  
  return {
    propertyManager,
    tradingManager,
    rewardManager,
    propertyToken,
    system,
    realEstateFacade
  };
}

/**
 * 将合约地址更新到.env文件中
 * @param {Object} deploymentInfo - 部署信息
 * @param {Object} implementations - 实现合约地址
 */
function updateEnvFile(deploymentInfo, implementations) {
  logger.info("正在更新.env文件...");
  
  // 读取当前.env文件内容
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    logger.error(`读取.env文件失败: ${error.message}`);
    return false;
  }
  
  // 创建一个临时文件，用于存储更新后的内容
  const tempEnvPath = path.join(__dirname, '../.env.temp');
  
  // 移除已有的合约地址部分（如果存在）
  let updatedContent = envContent;
  const contractSectionMarker = '# 以下是合约部署后自动生成的地址信息';
  
  if (updatedContent.includes(contractSectionMarker)) {
    updatedContent = updatedContent.split(contractSectionMarker)[0].trim();
  }
  
  // 合约名称映射关系，使用完整名称作为环境变量
  const contractFullNames = {
    'SimpleERC20': 'SimpleERC20',
    'PropertyManager': 'PropertyManager',
    'TradingManager': 'TradingManager',
    'RewardManager': 'RewardManager',
    'PropertyToken': 'PropertyToken',
    'System': 'RealEstateSystem',
    'RealEstateFacade': 'RealEstateFacade'
  };
  
  // 添加新的合约地址部分
  updatedContent += `\n\n# 以下是合约部署后自动生成的地址信息（由scripts/deploy-step.js于${new Date().toISOString()}更新）
# 这些地址是部署期间自动写入的，无需手动修改

# 角色地址信息（由私钥派生）
`;

  // 添加角色地址（如果有）
  if (process.env.ADMIN_PRIVATE_KEY) {
    try {
      const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY);
      updatedContent += `ADMIN_ADDRESS=${adminWallet.address}\n`;
    } catch (error) {
      logger.error(`获取ADMIN_ADDRESS失败: ${error.message}`);
    }
  }
  
  if (process.env.MANAGER_PRIVATE_KEY) {
    try {
      const managerWallet = new ethers.Wallet(process.env.MANAGER_PRIVATE_KEY);
      updatedContent += `MANAGER_ADDRESS=${managerWallet.address}\n`;
    } catch (error) {
      logger.error(`获取MANAGER_ADDRESS失败: ${error.message}`);
    }
  }
  
  if (process.env.OPERATOR_PRIVATE_KEY) {
    try {
      const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY);
      updatedContent += `OPERATOR_ADDRESS=${operatorWallet.address}\n`;
    } catch (error) {
      logger.error(`获取OPERATOR_ADDRESS失败: ${error.message}`);
    }
  }
  
  updatedContent += `
# 代币合约地址
CONTRACT_SIMPLEERC20_ADDRESS=${deploymentInfo.contracts.SimpleERC20}

# 系统核心合约地址
`;

  // 添加带有完整名称的合约地址
  Object.entries(deploymentInfo.contracts).forEach(([shortName, address]) => {
    if (shortName !== 'SimpleERC20') {
      const fullName = contractFullNames[shortName] || shortName;
      updatedContent += `CONTRACT_${fullName.toUpperCase()}_ADDRESS=${address}\n`;
    }
  });

  updatedContent += `\n# 代理合约实现地址（仅供参考，通常不需要直接使用）\n`;

  // 添加实现合约地址
  for (const [name, address] of Object.entries(implementations)) {
    const fullName = contractFullNames[name] || name;
    updatedContent += `CONTRACT_${fullName.toUpperCase()}_IMPLEMENTATION=${address}\n`;
  }
  
  // 写入临时文件
  try {
    fs.writeFileSync(tempEnvPath, updatedContent, 'utf8');
    logger.info(`环境变量临时文件已生成: ${tempEnvPath}`);
    
    // 备份原始.env文件
    const backupPath = path.join(__dirname, `../.env.backup.${Date.now()}`);
    fs.copyFileSync(envPath, backupPath);
    logger.info(`原始.env文件已备份到: ${backupPath}`);
    
    // 用临时文件替换原始.env文件
    fs.renameSync(tempEnvPath, envPath);
    logger.info(`环境变量文件已更新: ${envPath}`);
    
    return true;
  } catch (error) {
    logger.error(`更新.env文件失败: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    logger.info("开始部署不动产系统...");
    
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: hre.network.name,
      deployer: (await ethers.getSigners())[0].address,
      contracts: {},
      initializationParams: getContractInitParams(),
      systemStatus: "未知",
    };
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    logger.info("部署账户地址:", deployer.address);
    
    // 部署系统
    const contracts = await deploySystemStep(deployer);
    
    // 记录合约地址
    deploymentInfo.contracts = {
      PropertyManager: await contracts.propertyManager.getAddress(),
      TradingManager: await contracts.tradingManager.getAddress(),
      RewardManager: await contracts.rewardManager.getAddress(),
      PropertyToken: await contracts.propertyToken.getAddress(),
      RealEstateSystem: await contracts.system.getAddress(),
      RealEstateFacade: await contracts.realEstateFacade.getAddress()
    };
    
    // 检查系统状态
    const emergencyMode = await contracts.system.emergencyMode();
    deploymentInfo.systemStatus = emergencyMode ? "紧急模式" : "正常模式";
    
    // 获取实现合约地址
    const implementations = await getImplementationAddresses(deploymentInfo);
    deploymentInfo.implementations = implementations;
    
    // 部署测试代币
    const testToken = await deployTestToken(deployer);
    deploymentInfo.contracts.SimpleERC20 = await testToken.getAddress();
    
    // 更新.env文件
    updateEnvFile(deploymentInfo, implementations);
    
    // 验证Facade与各组件之间的连接
    try {
      logger.info("验证Facade与各组件之间的连接");
      const verificationResult = await verifyFacadeConnections(contracts.realEstateFacade);
      deploymentInfo.verificationResult = verificationResult;
    } catch (error) {
      logger.error("验证连接失败:", error.message);
      deploymentInfo.verificationError = error.message;
    }
    
    // 授予角色权限
    const roleResults = await grantRoles(contracts);
    deploymentInfo.roleResults = roleResults;
    
    // 生成部署报告
    const reportPath = generateDeploymentReport(deploymentInfo);
    
    logger.info("部署成功，所有合约和配置已就绪");
  } catch (error) {
    logger.error("部署失败:", error);
    throw error;
  }
}

/**
 * 获取代理合约的实现地址
 */
async function getImplementationAddresses(deploymentInfo) {
  const implementations = {};
  
  logger.info("获取代理合约的实现地址...");
  
  // 获取每个代理合约的实现地址
  for (const [name, address] of Object.entries(deploymentInfo.contracts)) {
    // 跳过非代理合约或无效地址
    if (name === "SimpleERC20" || !address || address === "0x") {
      logger.info(`跳过 ${name}，因为它不是代理合约或地址无效`);
      continue;
    }
    
    try {
      logger.info(`获取 ${name} 的实现地址...`);
      // 验证地址是否有效
      if (!ethers.isAddress(address)) {
        logger.error(`${name} 地址无效: ${address}`);
        continue;
      }
      
      // 获取实现地址
      const implAddress = await upgrades.erc1967.getImplementationAddress(address);
      implementations[name] = implAddress;
      logger.info(`${name} 实现地址: ${implAddress}`);
    } catch (error) {
      logger.error(`获取 ${name} 的实现地址失败: ${error.message}`);
    }
  }
  
  return implementations;
}

/**
 * 授予角色权限
 * @param {Object} contracts - 已部署的合约对象
 * @returns {Object} - 角色授权结果
 */
async function grantRoles(contracts) {
  logger.info("开始授予角色权限...");
  
  // 初始化角色授权结果对象
  const roleResults = {
    admin: { 
      address: null, 
      success: { admin: false, manager: false, operator: false, pauser: false, upgrader: false }, 
      hash: { admin: null, manager: null, operator: null, pauser: null, upgrader: null }, 
      alreadyHasRole: { admin: false, manager: false, operator: false, pauser: false, upgrader: false } 
    },
    manager: { 
      address: null, 
      success: { manager: false, operator: false }, 
      hash: { manager: null, operator: null }, 
      alreadyHasRole: { manager: false, operator: false } 
    },
    operator: { 
      address: null, 
      success: { operator: false }, 
      hash: { operator: null }, 
      alreadyHasRole: { operator: false } 
    }
  };
  
  // Get the system contract for role checks
  const system = contracts.system;
  
  // Get role constants from the System contract
  const ADMIN_ROLE = await system.ADMIN_ROLE();
  const MANAGER_ROLE = await system.MANAGER_ROLE();
  const OPERATOR_ROLE = await system.OPERATOR_ROLE();
  const PAUSER_ROLE = await system.PAUSER_ROLE();
  const UPGRADER_ROLE = await system.UPGRADER_ROLE();
  
  // 授予 ADMIN_ROLE
  if (process.env.ADMIN_PRIVATE_KEY) {
    try {
      const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY);
      const adminAddress = adminWallet.address;
      roleResults.admin.address = adminAddress;
      
      // 为admin授予ADMIN_ROLE
      logger.info(`检查地址 ${adminAddress} 是否已有 ADMIN_ROLE...`);
      const hasAdminRole = await system.hasRole(ADMIN_ROLE, adminAddress);
      
      if (!hasAdminRole) {
        logger.info(`授予 ADMIN_ROLE 给: ${adminAddress}`);
        const tx = await system.grantRole(ADMIN_ROLE, adminAddress);
        await tx.wait();
        roleResults.admin.success.admin = true;
        roleResults.admin.hash.admin = tx.hash;
        logger.info(`ADMIN_ROLE 授权成功, 交易哈希: ${tx.hash}`);
      } else {
        roleResults.admin.alreadyHasRole.admin = true;
        roleResults.admin.success.admin = true;
        logger.info(`地址 ${adminAddress} 已有 ADMIN_ROLE, 无需再次授权`);
      }
      
      // 为admin授予MANAGER_ROLE
      logger.info(`检查地址 ${adminAddress} 是否已有 MANAGER_ROLE...`);
      const hasManagerRole = await system.hasRole(MANAGER_ROLE, adminAddress);
      
      if (!hasManagerRole) {
        logger.info(`授予 MANAGER_ROLE 给 admin: ${adminAddress}`);
        const tx = await system.grantRole(MANAGER_ROLE, adminAddress);
        await tx.wait();
        roleResults.admin.success.manager = true;
        roleResults.admin.hash.manager = tx.hash;
        logger.info(`MANAGER_ROLE 授予admin成功, 交易哈希: ${tx.hash}`);
      } else {
        roleResults.admin.alreadyHasRole.manager = true;
        roleResults.admin.success.manager = true;
        logger.info(`admin地址 ${adminAddress} 已有 MANAGER_ROLE, 无需再次授权`);
      }
      
      // 为admin授予OPERATOR_ROLE
      logger.info(`检查地址 ${adminAddress} 是否已有 OPERATOR_ROLE...`);
      const hasOperatorRole = await system.hasRole(OPERATOR_ROLE, adminAddress);
      
      if (!hasOperatorRole) {
        logger.info(`授予 OPERATOR_ROLE 给 admin: ${adminAddress}`);
        const tx = await system.grantRole(OPERATOR_ROLE, adminAddress);
        await tx.wait();
        roleResults.admin.success.operator = true;
        roleResults.admin.hash.operator = tx.hash;
        logger.info(`OPERATOR_ROLE 授予admin成功, 交易哈希: ${tx.hash}`);
      } else {
        roleResults.admin.alreadyHasRole.operator = true;
        roleResults.admin.success.operator = true;
        logger.info(`admin地址 ${adminAddress} 已有 OPERATOR_ROLE, 无需再次授权`);
      }
      
      // 为admin授予PAUSER_ROLE
      logger.info(`检查地址 ${adminAddress} 是否已有 PAUSER_ROLE...`);
      const hasPauserRole = await system.hasRole(PAUSER_ROLE, adminAddress);
      
      if (!hasPauserRole) {
        logger.info(`授予 PAUSER_ROLE 给 admin: ${adminAddress}`);
        const tx = await system.grantRole(PAUSER_ROLE, adminAddress);
        await tx.wait();
        roleResults.admin.success.pauser = true;
        roleResults.admin.hash.pauser = tx.hash;
        logger.info(`PAUSER_ROLE 授予admin成功, 交易哈希: ${tx.hash}`);
      } else {
        roleResults.admin.alreadyHasRole.pauser = true;
        roleResults.admin.success.pauser = true;
        logger.info(`admin地址 ${adminAddress} 已有 PAUSER_ROLE, 无需再次授权`);
      }
      
      // 为admin授予UPGRADER_ROLE
      logger.info(`检查地址 ${adminAddress} 是否已有 UPGRADER_ROLE...`);
      const hasUpgraderRole = await system.hasRole(UPGRADER_ROLE, adminAddress);
      
      if (!hasUpgraderRole) {
        logger.info(`授予 UPGRADER_ROLE 给 admin: ${adminAddress}`);
        const tx = await system.grantRole(UPGRADER_ROLE, adminAddress);
        await tx.wait();
        roleResults.admin.success.upgrader = true;
        roleResults.admin.hash.upgrader = tx.hash;
        logger.info(`UPGRADER_ROLE 授予admin成功, 交易哈希: ${tx.hash}`);
      } else {
        roleResults.admin.alreadyHasRole.upgrader = true;
        roleResults.admin.success.upgrader = true;
        logger.info(`admin地址 ${adminAddress} 已有 UPGRADER_ROLE, 无需再次授权`);
      }
    } catch (error) {
      logger.error(`授予admin权限失败: ${error.message}`);
    }
  } else {
    logger.warn("未找到 ADMIN_PRIVATE_KEY 环境变量, 跳过admin角色授权");
  }
  
  // 授予 MANAGER_ROLE
  if (process.env.MANAGER_PRIVATE_KEY) {
    try {
      const managerWallet = new ethers.Wallet(process.env.MANAGER_PRIVATE_KEY);
      const managerAddress = managerWallet.address;
      roleResults.manager.address = managerAddress;
      
      // 为manager授予MANAGER_ROLE
      logger.info(`检查地址 ${managerAddress} 是否已有 MANAGER_ROLE...`);
      const hasManagerRole = await system.hasRole(MANAGER_ROLE, managerAddress);
      
      if (!hasManagerRole) {
        logger.info(`授予 MANAGER_ROLE 给: ${managerAddress}`);
        const tx = await system.grantRole(MANAGER_ROLE, managerAddress);
        await tx.wait();
        roleResults.manager.success.manager = true;
        roleResults.manager.hash.manager = tx.hash;
        logger.info(`MANAGER_ROLE 授权成功, 交易哈希: ${tx.hash}`);
      } else {
        roleResults.manager.alreadyHasRole.manager = true;
        roleResults.manager.success.manager = true;
        logger.info(`地址 ${managerAddress} 已有 MANAGER_ROLE, 无需再次授权`);
      }
      
      // 为manager授予OPERATOR_ROLE
      logger.info(`检查地址 ${managerAddress} 是否已有 OPERATOR_ROLE...`);
      const hasOperatorRole = await system.hasRole(OPERATOR_ROLE, managerAddress);
      
      if (!hasOperatorRole) {
        logger.info(`授予 OPERATOR_ROLE 给 manager: ${managerAddress}`);
        const tx = await system.grantRole(OPERATOR_ROLE, managerAddress);
        await tx.wait();
        roleResults.manager.success.operator = true;
        roleResults.manager.hash.operator = tx.hash;
        logger.info(`OPERATOR_ROLE 授予manager成功, 交易哈希: ${tx.hash}`);
      } else {
        roleResults.manager.alreadyHasRole.operator = true;
        roleResults.manager.success.operator = true;
        logger.info(`manager地址 ${managerAddress} 已有 OPERATOR_ROLE, 无需再次授权`);
      }
    } catch (error) {
      logger.error(`授予manager权限失败: ${error.message}`);
    }
  } else {
    logger.warn("未找到 MANAGER_PRIVATE_KEY 环境变量, 跳过manager角色授权");
  }
  
  // 授予 OPERATOR_ROLE
  if (process.env.OPERATOR_PRIVATE_KEY) {
    try {
      const operatorWallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY);
      const operatorAddress = operatorWallet.address;
      roleResults.operator.address = operatorAddress;
      
      logger.info(`检查地址 ${operatorAddress} 是否已有 OPERATOR_ROLE...`);
      const hasOperatorRole = await system.hasRole(OPERATOR_ROLE, operatorAddress);
      
      if (!hasOperatorRole) {
        logger.info(`授予 OPERATOR_ROLE 给: ${operatorAddress}`);
        const tx = await system.grantRole(OPERATOR_ROLE, operatorAddress);
        await tx.wait();
        roleResults.operator.success.operator = true;
        roleResults.operator.hash.operator = tx.hash;
        logger.info(`OPERATOR_ROLE 授权成功, 交易哈希: ${tx.hash}`);
      } else {
        roleResults.operator.alreadyHasRole.operator = true;
        roleResults.operator.success.operator = true;
        logger.info(`地址 ${operatorAddress} 已有 OPERATOR_ROLE, 无需再次授权`);
      }
    } catch (error) {
      logger.error(`授予operator权限失败: ${error.message}`);
    }
  } else {
    logger.warn("未找到 OPERATOR_PRIVATE_KEY 环境变量, 跳过operator角色授权");
  }
  
  logger.info("角色授权完成");
  return roleResults;
}

/**
 * 生成部署报告
 */
function generateDeploymentReport(deploymentInfo) {
  // 创建报告目录
  const reportDir = path.join(__dirname, "../docs/deploy");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // 创建时间戳
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `${timestamp}.md`);
  
  // 生成报告内容
  let reportContent = `# 部署报告 (${timestamp})

## 部署信息
- 网络: ${deploymentInfo.network}
- 部署时间: ${deploymentInfo.timestamp}
- 部署者地址: ${deploymentInfo.deployer}
- 系统状态: ${deploymentInfo.systemStatus}

## 合约地址

| 合约 | 代理地址 | 实现地址 |
|------|----------|----------|
`;

  // 添加合约地址信息
  for (const [name, address] of Object.entries(deploymentInfo.contracts)) {
    if (name === "SimpleERC20") {
      reportContent += `| ${name} | ${address} | 非代理合约 |\n`;
    } else if (deploymentInfo.implementations && deploymentInfo.implementations[name]) {
      reportContent += `| ${name} | ${address} | ${deploymentInfo.implementations[name]} |\n`;
    } else {
      reportContent += `| ${name} | ${address} | 未获取 |\n`;
    }
  }
  
  // 添加角色授权信息
  if (deploymentInfo.roleResults) {
    reportContent += `
## 角色授权信息

| 角色 | 地址 | 授权角色 | 授权状态 | 交易哈希 |
|------|------|----------|----------|----------|
`;
    
    const roles = deploymentInfo.roleResults;
    
    // 添加管理员角色信息
    if (roles.admin.address) {
      // Admin拥有ADMIN_ROLE
      const adminStatus = roles.admin.alreadyHasRole.admin ? "已授权(已有权限)" : 
                         roles.admin.success.admin ? "已授权(新授权)" : "授权失败";
      reportContent += `| Admin账户 | ${roles.admin.address} | ADMIN_ROLE | ${adminStatus} | ${roles.admin.hash.admin || '无'} |\n`;
      
      // Admin拥有MANAGER_ROLE
      const adminManagerStatus = roles.admin.alreadyHasRole.manager ? "已授权(已有权限)" : 
                                roles.admin.success.manager ? "已授权(新授权)" : "授权失败";
      reportContent += `| Admin账户 | ${roles.admin.address} | MANAGER_ROLE | ${adminManagerStatus} | ${roles.admin.hash.manager || '无'} |\n`;
      
      // Admin拥有OPERATOR_ROLE
      const adminOperatorStatus = roles.admin.alreadyHasRole.operator ? "已授权(已有权限)" : 
                                 roles.admin.success.operator ? "已授权(新授权)" : "授权失败";
      reportContent += `| Admin账户 | ${roles.admin.address} | OPERATOR_ROLE | ${adminOperatorStatus} | ${roles.admin.hash.operator || '无'} |\n`;
    } else {
      reportContent += `| Admin账户 | 未设置 | 所有角色 | 未执行 | 无 |\n`;
    }
    
    // 添加经理角色信息
    if (roles.manager.address) {
      // Manager拥有MANAGER_ROLE
      const managerStatus = roles.manager.alreadyHasRole.manager ? "已授权(已有权限)" : 
                           roles.manager.success.manager ? "已授权(新授权)" : "授权失败";
      reportContent += `| Manager账户 | ${roles.manager.address} | MANAGER_ROLE | ${managerStatus} | ${roles.manager.hash.manager || '无'} |\n`;
      
      // Manager拥有OPERATOR_ROLE
      const managerOperatorStatus = roles.manager.alreadyHasRole.operator ? "已授权(已有权限)" : 
                                   roles.manager.success.operator ? "已授权(新授权)" : "授权失败";
      reportContent += `| Manager账户 | ${roles.manager.address} | OPERATOR_ROLE | ${managerOperatorStatus} | ${roles.manager.hash.operator || '无'} |\n`;
    } else {
      reportContent += `| Manager账户 | 未设置 | 相关角色 | 未执行 | 无 |\n`;
    }
    
    // 添加操作员角色信息
    if (roles.operator.address) {
      const operatorStatus = roles.operator.alreadyHasRole.operator ? "已授权(已有权限)" : 
                            roles.operator.success.operator ? "已授权(新授权)" : "授权失败";
      reportContent += `| Operator账户 | ${roles.operator.address} | OPERATOR_ROLE | ${operatorStatus} | ${roles.operator.hash.operator || '无'} |\n`;
    } else {
      reportContent += `| Operator账户 | 未设置 | OPERATOR_ROLE | 未执行 | 无 |\n`;
    }
  }
  
  // 添加组件连接验证结果
  if (deploymentInfo.verificationResult) {
    reportContent += `
## 组件连接验证结果

| 组件 | 连接状态 |
|------|----------|
`;
    
    const connections = deploymentInfo.verificationResult.connections;
    const statusMap = {
      true: "✅ 成功",
      false: "❌ 失败"
    };
    
    for (const [component, status] of Object.entries(connections)) {
      reportContent += `| ${component} | ${statusMap[status]} |\n`;
    }
    
    reportContent += `
总体验证结果: ${deploymentInfo.verificationResult.success ? "✅ 成功" : "❌ 失败"}
`;
  } else if (deploymentInfo.verificationError) {
    reportContent += `
## 组件连接验证结果

验证过程失败: ${deploymentInfo.verificationError}
`;
  }
  
  // 添加初始化参数
  reportContent += `
## 初始化参数

\`\`\`json
${JSON.stringify(deploymentInfo.initializationParams, null, 2)}
\`\`\`
`;

  // 写入报告文件
  fs.writeFileSync(reportPath, reportContent);
  logger.info(`部署报告已生成: ${reportPath}`);
  
  return reportPath;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  }); 