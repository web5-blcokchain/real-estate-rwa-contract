const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers, upgrades } = require("hardhat");
require('dotenv').config();

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
  
  // 部署 RoleManager
  logger.info("Deploying RoleManager...");
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = await upgrades.deployProxy(RoleManager, [signer.address], {
    kind: "uups",
  });
  await roleManager.waitForDeployment();
  const roleManagerAddress = await roleManager.getAddress();
  logger.info("RoleManager deployed at:", roleManagerAddress);
  
  // 部署 PropertyManager
  logger.info("Deploying PropertyManager...");
  const PropertyManager = await ethers.getContractFactory("PropertyManager");
  const propertyManager = await upgrades.deployProxy(PropertyManager, [roleManagerAddress], {
    kind: "uups",
  });
  await propertyManager.waitForDeployment();
  const propertyManagerAddress = await propertyManager.getAddress();
  logger.info("PropertyManager deployed at:", propertyManagerAddress);
  
  // 部署 TradingManager
  logger.info("Deploying TradingManager...");
  const TradingManager = await ethers.getContractFactory("TradingManager");
  const tradingManager = await upgrades.deployProxy(TradingManager, [roleManagerAddress], {
    kind: "uups",
  });
  await tradingManager.waitForDeployment();
  const tradingManagerAddress = await tradingManager.getAddress();
  logger.info("TradingManager deployed at:", tradingManagerAddress);
  
  // 从环境变量读取或使用默认值
  const maxTradeAmount = process.env.MAX_TRADE_AMOUNT || "1000"; // 默认为1000
  const minTradeAmount = process.env.MIN_TRADE_AMOUNT || "0.01"; // 默认为0.01
  
  // 设置最大交易金额
  console.log(`INFO: Setting max trade amount to ${maxTradeAmount}`);
  let tx = await tradingManager.setMaxTradeAmount(ethers.parseEther(maxTradeAmount.toString()));
  await tx.wait();
  
  // 设置最小交易金额
  console.log(`INFO: Setting min trade amount to ${minTradeAmount}`);
  tx = await tradingManager.setMinTradeAmount(ethers.parseEther(minTradeAmount.toString()));
  await tx.wait();
  
  // 使用环境变量或默认值设置冷却期
  const cooldownPeriod = process.env.COOLDOWN_PERIOD || "3600"; // 默认为1小时(3600秒)
  console.log(`INFO: Setting cooldown period to ${cooldownPeriod} seconds`);
  tx = await tradingManager.setCooldownPeriod(cooldownPeriod);
  await tx.wait();
  
  // 设置交易管理器参数
  logger.info("Setting TradingManager parameters...");
  tx = await tradingManager.setFeeRate(initParams.trading.tradingFeeRate);
  await tx.wait();
  tx = await tradingManager.setFeeReceiver(initParams.trading.tradingFeeReceiver);
  await tx.wait();
  
  // 部署 RewardManager
  logger.info("Deploying RewardManager...");
  const RewardManager = await ethers.getContractFactory("RewardManager");
  const rewardManager = await upgrades.deployProxy(RewardManager, [
    roleManagerAddress,
    initParams.reward.platformFeeRate,
    initParams.reward.maintenanceFeeRate,
    initParams.reward.rewardFeeReceiver,
    ethers.parseEther(initParams.reward.minDistributionThreshold.toString())
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
    roleManagerAddress
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
    roleManagerAddress,
    propertyManagerAddress,
    tradingManagerAddress,
    rewardManagerAddress
  ], {
    kind: "uups",
  });
  await system.waitForDeployment();
  const systemAddress = await system.getAddress();
  logger.info("System deployed at:", systemAddress);
  
  // 部署 Facade
  logger.info("Deploying Facade...");
  const Facade = await ethers.getContractFactory("RealEstateFacade");
  const facade = await upgrades.deployProxy(Facade, [
    systemAddress,
    roleManagerAddress,
    propertyManagerAddress,
    tradingManagerAddress,
    rewardManagerAddress
  ], {
    kind: "uups",
  });
  await facade.waitForDeployment();
  const facadeAddress = await facade.getAddress();
  logger.info("Facade deployed at:", facadeAddress);
  
  return {
    roleManager,
    propertyManager,
    tradingManager,
    rewardManager,
    propertyToken,
    system,
    facade
  };
}

/**
 * 导出合约 ABI 到 config/abi 目录
 * @param {Object} contractNames - 要导出 ABI 的合约名称列表
 */
async function exportContractABIs(contractNames) {
  logger.info("导出合约 ABI...");
  
  // 确保 config/abi 目录存在
  const abiDir = path.join(__dirname, "../config/abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  
  // 为每个合约生成 ABI 文件
  for (const contractName of contractNames) {
    try {
      // 读取合约 artifact
      const artifact = await hre.artifacts.readArtifact(contractName);
      
      // 保存 ABI 文件，文件名与合约名称完全一致
      fs.writeFileSync(
        path.join(abiDir, `${contractName}.json`),
        JSON.stringify(artifact.abi, null, 2)
      );
      
      logger.info(`已导出 ${contractName}.json ABI`);
    } catch (error) {
      logger.error(`导出 ${contractName} ABI 失败: ${error.message}`);
    }
  }
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
  
  // 添加新的合约地址部分
  updatedContent += `\n\n# 以下是合约部署后自动生成的地址信息（由scripts/deploy-step.js于${new Date().toISOString()}更新）
# 这些地址是部署期间自动写入的，无需手动修改

# 代币合约地址
CONTRACT_SIMPLEERC20_ADDRESS=${deploymentInfo.contracts.SimpleERC20}

# 系统核心合约地址
CONTRACT_ROLEMANAGER_ADDRESS=${deploymentInfo.contracts.RoleManager}
CONTRACT_PROPERTYMANAGER_ADDRESS=${deploymentInfo.contracts.PropertyManager}
CONTRACT_TRADINGMANAGER_ADDRESS=${deploymentInfo.contracts.TradingManager}
CONTRACT_REWARDMANAGER_ADDRESS=${deploymentInfo.contracts.RewardManager}
CONTRACT_PROPERTYTOKEN_ADDRESS=${deploymentInfo.contracts.PropertyToken}
CONTRACT_SYSTEM_ADDRESS=${deploymentInfo.contracts.System}
CONTRACT_FACADE_ADDRESS=${deploymentInfo.contracts.Facade}

# 代理合约实现地址（仅供参考，通常不需要直接使用）
`;

  // 添加实现合约地址
  for (const [name, address] of Object.entries(implementations)) {
    updatedContent += `CONTRACT_${name.toUpperCase()}_IMPLEMENTATION=${address}\n`;
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
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info("Deploying contracts with the account:", deployer.address);

    // 部署测试代币
    const testToken = await deployTestToken(deployer);

    // 部署系统合约
    const contracts = await deploySystemStep(deployer);

    // 创建部署信息对象，带有正确的合约地址字符串
    const deploymentInfo = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        SimpleERC20: await testToken.getAddress(),
        RoleManager: await contracts.roleManager.getAddress(),
        PropertyManager: await contracts.propertyManager.getAddress(),
        TradingManager: await contracts.tradingManager.getAddress(),
        RewardManager: await contracts.rewardManager.getAddress(),
        PropertyToken: await contracts.propertyToken.getAddress(),
        System: await contracts.system.getAddress(),
        Facade: await contracts.facade.getAddress()
      },
      systemStatus: "1",
      deployMethod: "step-by-step"
    };

    // 获取实现合约地址
    const implementations = await getImplementationAddresses(deploymentInfo);

    // 更新部署信息，添加实现地址
    deploymentInfo.implementations = implementations;

    // 保存部署信息到.env文件
    updateEnvFile(deploymentInfo, implementations);
    
    // 导出合约 ABI
    const contractNames = [
      "RealEstateSystem",  // System
      "RealEstateFacade",  // Facade
      "RoleManager",
      "PropertyManager",
      "PropertyToken",     // TokenFactory
      "TradingManager",
      "RewardManager",
      "SimpleERC20"
    ];
    await exportContractABIs(contractNames);

    // 生成部署报告
    const report = generateDeploymentReport(deploymentInfo);
    console.log('\n部署报告:');
    console.log(report);

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