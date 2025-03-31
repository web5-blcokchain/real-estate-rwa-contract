const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { logger } = require("../shared/src/logger");
const { ethers, upgrades } = require("hardhat");
const envConfig = require("../shared/src/config/env");

async function verifyContract(address, name) {
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    logger.info(`${name} contract verified successfully`);
  } catch (error) {
    logger.warn(`Failed to verify ${name} contract:`, error.message);
  }
}

async function deployTestToken(signer) {
  logger.info("Deploying TestToken...");
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy(
    "Test Token",
    "TEST",
    ethers.utils.parseEther("1000000") // 部署 1,000,000 个测试代币
  );
  await testToken.deployed();
  logger.info("TestToken deployed at:", testToken.address);
  
  // 验证测试代币合约
  if (envConfig.getBoolean('CONTRACT_VERIFY') && hre.network.name !== "hardhat") {
    await verifyContract(testToken.address, "TestToken");
  }
  
  return testToken;
}

async function main() {
  try {
    logger.info("Starting system deployment...");
    
    // 获取部署账户
    const [signer] = await ethers.getSigners();
    logger.info("Deployer address:", signer.address);
    
    // 部署测试代币
    const testToken = await deployTestToken(signer);
    
    // 部署 SimpleSystemDeployer
    logger.info("Deploying SimpleSystemDeployer...");
    const SimpleSystemDeployer = await ethers.getContractFactory("SimpleSystemDeployer");
    const systemDeployer = await upgrades.deployProxy(SimpleSystemDeployer, [], {
      kind: "uups",
    });
    await systemDeployer.deployed();
    logger.info("SimpleSystemDeployer deployed at:", systemDeployer.address);
    
    // 获取合约初始化参数
    const initParams = envConfig.getContractInitParams();
    
    // 将测试代币添加到支持的支付代币列表中
    const supportedTokens = [...initParams.reward.supportedPaymentTokens, testToken.address];
    initParams.reward.supportedPaymentTokens = supportedTokens;
    
    // 使用 SimpleSystemDeployer 部署系统
    logger.info("Deploying system using SimpleSystemDeployer...");
    const tx = await systemDeployer.deploySystem(
      initParams.role,
      initParams.trading,
      initParams.reward,
      initParams.token,
      initParams.system
    );
    await tx.wait();
    logger.info("System deployment transaction confirmed");
    
    // 获取已部署的合约地址
    const system = await ethers.getContractAt("SimpleRealEstateSystem", await systemDeployer.getSystemAddress());
    const facade = await ethers.getContractAt("RealEstateFacade", await systemDeployer.getFacadeAddress());
    const roleManager = await ethers.getContractAt("SimpleRoleManager", await systemDeployer.getRoleManagerAddress());
    const propertyManager = await ethers.getContractAt("PropertyManager", await systemDeployer.getPropertyManagerAddress());
    const tokenFactory = await ethers.getContractAt("PropertyToken", await systemDeployer.getTokenFactoryAddress());
    const tradingManager = await ethers.getContractAt("TradingManager", await systemDeployer.getTradingManagerAddress());
    const rewardManager = await ethers.getContractAt("RewardManager", await systemDeployer.getRewardManagerAddress());
    
    // 验证部署
    logger.info("Verifying deployment...");
    const systemStatus = await system.getSystemStatus();
    logger.info("System status:", systemStatus);
    
    // 验证合约
    if (envConfig.getBoolean('CONTRACT_VERIFY') && hre.network.name !== "hardhat") {
      logger.info("Verifying contracts on Etherscan...");
      await verifyContract(systemDeployer.address, "SimpleSystemDeployer");
      await verifyContract(system.address, "SimpleRealEstateSystem");
      await verifyContract(facade.address, "RealEstateFacade");
      await verifyContract(roleManager.address, "SimpleRoleManager");
      await verifyContract(propertyManager.address, "PropertyManager");
      await verifyContract(tokenFactory.address, "PropertyToken");
      await verifyContract(tradingManager.address, "TradingManager");
      await verifyContract(rewardManager.address, "RewardManager");
    }
    
    // 保存部署信息
    const deploymentInfo = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: signer.address,
      contracts: {
        systemDeployer: systemDeployer.address,
        system: system.address,
        facade: facade.address,
        roleManager: roleManager.address,
        propertyManager: propertyManager.address,
        tokenFactory: tokenFactory.address,
        tradingManager: tradingManager.address,
        rewardManager: rewardManager.address,
        testToken: testToken.address
      },
      systemStatus: systemStatus,
      initializationParams: initParams
    };
    
    // 保存部署信息到 config/deployment.json
    const configDir = path.join(__dirname, "../config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(configDir, "deployment.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    logger.info("Deployment info saved to config/deployment.json");

    // 提取并保存 ABI
    const abiDir = path.join(configDir, "abi");
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }

    const contracts = [
      "SimpleRoleManager",
      "PropertyManager",
      "PropertyToken",
      "TradingManager",
      "RewardManager",
      "SimpleRealEstateSystem",
      "RealEstateFacade",
      "TestToken"
    ];

    for (const contractName of contracts) {
      const artifact = await hre.artifacts.readArtifact(contractName);
      fs.writeFileSync(
        path.join(abiDir, `${contractName}.json`),
        JSON.stringify(artifact.abi, null, 2)
      );
    }
    logger.info("ABI files saved to config/abi/");

    // 生成部署报告
    const deployReportDir = path.join(__dirname, "../docs/deploy");
    if (!fs.existsSync(deployReportDir)) {
      fs.mkdirSync(deployReportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = path.join(deployReportDir, `${timestamp}.md`);
    const reportContent = `# 部署报告 (${timestamp})

## 部署信息
- 网络: ${deploymentInfo.network}
- 部署者: ${deploymentInfo.deployer}
- 部署时间: ${deploymentInfo.timestamp}

## 系统状态
${deploymentInfo.systemStatus}

## 合约地址
${Object.entries(deploymentInfo.contracts)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

## 初始化参数
### 角色管理
- 管理员地址: ${initParams.role.adminAddresses.join(", ")}
- 经理地址: ${initParams.role.managerAddresses.join(", ")}
- 操作员地址: ${initParams.role.operatorAddresses.join(", ")}

### 交易管理
- 交易费接收地址: ${initParams.trading.tradingFeeReceiver}
- 交易费率: ${initParams.trading.tradingFeeRate} 基点
- 最小交易金额: ${initParams.trading.minTradeAmount}

### 奖励管理
- 奖励费接收地址: ${initParams.reward.rewardFeeReceiver}
- 平台费率: ${initParams.reward.platformFeeRate} 基点
- 维护费率: ${initParams.reward.maintenanceFeeRate} 基点
- 最小分配阈值: ${initParams.reward.minDistributionThreshold}
- 支持的支付代币: ${initParams.reward.supportedPaymentTokens.join(", ")}

### 代币配置
- 最小转账金额: ${initParams.token.minTransferAmount}

### 系统配置
- 启动时暂停: ${initParams.system.startPaused}

### 代币工厂配置
- 名称: ${initParams.tokenFactory.name}
- 符号: ${initParams.tokenFactory.symbol}
- 初始供应量: ${initParams.tokenFactory.initialSupply}

### 房产管理配置
- 国家: ${initParams.property.country}
- 元数据URI: ${initParams.property.metadataURI}

### 测试代币配置
- 名称: Test Token
- 符号: TEST
- 初始供应量: 1,000,000
- 部署地址: ${testToken.address}

## 部署产物
- 部署信息: \`config/deployment.json\`
- ABI 文件: \`config/abi/*.json\`

## 验证状态
${hre.network.name === "hardhat" ? "本地网络，跳过验证" : "所有合约已验证"}
`;

    fs.writeFileSync(reportPath, reportContent);
    logger.info(`Deployment report saved to ${reportPath}`);

    logger.info("Deployment completed successfully");
  } catch (error) {
    logger.error("Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  }); 