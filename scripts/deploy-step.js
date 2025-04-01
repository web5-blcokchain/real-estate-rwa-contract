const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers, upgrades } = require("hardhat");
const envConfig = require("../shared/src/config/env");

const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
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
  const initParams = envConfig.getContractInitParams();
  
  // 部署 RoleManager
  logger.info("Deploying RoleManager...");
  const RoleManager = await ethers.getContractFactory("SimpleRoleManager");
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
  
  // 部署 TokenFactory
  logger.info("Deploying TokenFactory...");
  const TokenFactory = await ethers.getContractFactory("PropertyToken");
  const tokenFactory = await upgrades.deployProxy(TokenFactory, [
    ethers.ZeroHash,
    initParams.tokenFactory.name,
    initParams.tokenFactory.symbol,
    ethers.parseEther(initParams.tokenFactory.initialSupply.toString()),
    signer.address,
    roleManagerAddress
  ], {
    kind: "uups",
  });
  await tokenFactory.waitForDeployment();
  const tokenFactoryAddress = await tokenFactory.getAddress();
  logger.info("TokenFactory deployed at:", tokenFactoryAddress);
  
  // 部署 System
  logger.info("Deploying System...");
  const System = await ethers.getContractFactory("SimpleRealEstateSystem");
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
    tokenFactory,
    system,
    facade
  };
}

/**
 * 使用 SimpleSystemDeployer 部署系统
 */
async function deploySystemWithDeployer(signer, testToken) {
  // 获取合约初始化参数
  const initParams = envConfig.getContractInitParams();
  
  // 部署 SimpleSystemDeployer
  logger.info("Deploying SimpleSystemDeployer...");
  const SimpleSystemDeployer = await ethers.getContractFactory("SimpleSystemDeployer");
  const systemDeployer = await SimpleSystemDeployer.deploy();
  await systemDeployer.waitForDeployment();
  const systemDeployerAddress = await systemDeployer.getAddress();
  logger.info("SimpleSystemDeployer deployed at:", systemDeployerAddress);
  
  // 构建 SimpleSystemDeployer 所期望的参数格式 - 先不添加支付代币，后面手动添加
  const roleParams = {
    admin: signer.address // 使用部署者地址作为管理员
  };
  
  const tradingParams = {
    tradingFeeRate: initParams.trading.tradingFeeRate,
    feeReceiver: initParams.trading.tradingFeeReceiver,
    minTradeAmount: ethers.parseEther(initParams.trading.minTradeAmount.toString())
  };
  
  const rewardParams = {
    platformFeeRate: initParams.reward.platformFeeRate,
    maintenanceFeeRate: initParams.reward.maintenanceFeeRate,
    feeReceiver: initParams.reward.rewardFeeReceiver,
    minDistributionThreshold: ethers.parseEther(initParams.reward.minDistributionThreshold.toString()),
    supportedPaymentTokens: [] // 先不添加支付代币，后面手动添加
  };
  
  const tokenParams = {
    name: initParams.tokenFactory.name,
    symbol: initParams.tokenFactory.symbol,
    initialSupply: ethers.parseEther(initParams.tokenFactory.initialSupply.toString())
  };
  
  const systemParams = {
    startPaused: initParams.system.startPaused
  };
  
  // 使用 SimpleSystemDeployer 部署系统
  logger.info("Deploying system using SimpleSystemDeployer...");
  const tx = await systemDeployer.deploySystem(
    roleParams,
    tradingParams,
    rewardParams,
    tokenParams,
    systemParams
  );
  await tx.wait();
  logger.info("System deployment transaction confirmed");
  
  // 获取已部署的合约地址
  const systemAddress = await systemDeployer.system();
  const facadeAddress = await systemDeployer.facade();
  const roleManagerAddress = await systemDeployer.roleManager();
  const propertyManagerAddress = await systemDeployer.propertyManager();
  const tokenFactoryAddress = await systemDeployer.tokenFactory();
  const tradingManagerAddress = await systemDeployer.tradingManager();
  const rewardManagerAddress = await systemDeployer.rewardManager();
  
  const system = await ethers.getContractAt("SimpleRealEstateSystem", systemAddress);
  const facade = await ethers.getContractAt("RealEstateFacade", facadeAddress);
  const roleManager = await ethers.getContractAt("SimpleRoleManager", roleManagerAddress);
  const propertyManager = await ethers.getContractAt("PropertyManager", propertyManagerAddress);
  const tokenFactory = await ethers.getContractAt("PropertyToken", tokenFactoryAddress);
  const tradingManager = await ethers.getContractAt("TradingManager", tradingManagerAddress);
  const rewardManager = await ethers.getContractAt("RewardManager", rewardManagerAddress);
  
  return {
    systemDeployer,
    system,
    facade,
    roleManager,
    propertyManager,
    tokenFactory,
    tradingManager,
    rewardManager
  };
}

async function main() {
  try {
    logger.info("Starting system deployment...");
    
    // 获取部署账户
    const [signer] = await ethers.getSigners();
    logger.info("Deployer address:", signer.address);
    
    // 部署测试代币
    const testToken = await deployTestToken(signer);
    const testTokenAddress = await testToken.getAddress();
    
    // 选择部署方式: 'deployer' 或 'step'
    const deployMethod = process.env.DEPLOY_METHOD || 'step';
    let contracts;
    
    if (deployMethod === 'deployer') {
      logger.info("Using SimpleSystemDeployer for deployment...");
      contracts = await deploySystemWithDeployer(signer, testToken);
    } else {
      logger.info("Using step-by-step deployment...");
      contracts = await deploySystemStep(signer);
    }
    
    const { system, facade, roleManager, propertyManager, tokenFactory, tradingManager, rewardManager } = contracts;
    
    // 将测试代币添加到支持的支付代币列表中
    const initParams = envConfig.getContractInitParams();
    const supportedTokens = [...initParams.reward.supportedPaymentTokens];
    
    // 只添加我们的测试代币
    if (testTokenAddress) {
      supportedTokens.push(testTokenAddress);
    }
    
    // 添加支持的支付代币
    logger.info("Adding supported payment tokens...");
    
    // 确保每个支付代币被正确添加
    for (const tokenAddress of supportedTokens) {
      try {
        // 验证代币是否有效的 ERC20
        const erc20 = new ethers.Contract(
          tokenAddress,
          [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)"
          ],
          signer
        );
        
        const name = await erc20.name();
        const symbol = await erc20.symbol();
        const totalSupply = await erc20.totalSupply();
        
        logger.info(`Payment token info - Address: ${tokenAddress}, Name: ${name}, Symbol: ${symbol}, Total Supply: ${totalSupply}`);
        
        if (totalSupply === 0n) {
          logger.error(`Token ${tokenAddress} has zero supply. Skipping...`);
          continue;
        }
        
        const tx = await rewardManager.addSupportedPaymentToken(tokenAddress);
        await tx.wait();
        logger.info(`Added payment token: ${tokenAddress}`);
      } catch (error) {
        logger.error(`Failed to add payment token ${tokenAddress}: ${error.message}`);
      }
    }
    
    // 设置角色 (如果需要额外的管理员/操作员)
    logger.info("Setting up roles...");
    for (const adminAddress of initParams.role.adminAddresses) {
      if (adminAddress !== signer.address) {
        await roleManager.grantRole(await roleManager.ADMIN_ROLE(), adminAddress);
        logger.info("Granted ADMIN_ROLE to:", adminAddress);
      }
    }
    
    for (const managerAddress of initParams.role.managerAddresses) {
      await roleManager.grantRole(await roleManager.MANAGER_ROLE(), managerAddress);
      logger.info("Granted MANAGER_ROLE to:", managerAddress);
    }
    
    for (const operatorAddress of initParams.role.operatorAddresses) {
      if (operatorAddress !== signer.address) {
        await roleManager.grantRole(await roleManager.OPERATOR_ROLE(), operatorAddress);
        logger.info("Granted OPERATOR_ROLE to:", operatorAddress);
      }
    }
    
    // 验证部署
    logger.info("Verifying deployment...");
    const systemStatus = await system.getSystemStatus();
    logger.info("System status:", systemStatus);
    
    // 保存部署信息
    const deploymentInfo = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: signer.address,
      contracts: {
        system: await system.getAddress(),
        facade: await facade.getAddress(),
        roleManager: await roleManager.getAddress(),
        propertyManager: await propertyManager.getAddress(),
        tokenFactory: await tokenFactory.getAddress(),
        tradingManager: await tradingManager.getAddress(),
        rewardManager: await rewardManager.getAddress(),
        testToken: testTokenAddress
      }
    };
    
    if (deployMethod === 'deployer') {
      deploymentInfo.contracts.systemDeployer = await contracts.systemDeployer.getAddress();
    }
    
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

    const contracts2 = [
      "SimpleRoleManager",
      "PropertyManager",
      "PropertyToken",
      "TradingManager",
      "RewardManager",
      "SimpleRealEstateSystem",
      "RealEstateFacade",
      "SimpleERC20"
    ];

    for (const contractName of contracts2) {
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
- 部署方式: ${deployMethod === 'deployer' ? 'SimpleSystemDeployer' : '单步部署'}

## 系统状态
${systemStatus}

## 合约地址
${Object.entries(deploymentInfo.contracts)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

## 测试代币配置
- 名称: Test Token
- 符号: TEST
- 初始供应量: 1,000,000
- 部署地址: ${testTokenAddress}

## 部署产物
- 部署信息: \`config/deployment.json\`
- ABI 文件: \`config/abi/*.json\`
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