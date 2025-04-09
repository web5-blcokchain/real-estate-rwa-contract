const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
require('dotenv').config();

// 日志工具
const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
};

// 初始化参数
const getInitParams = () => {
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
    token: {
      name: process.env.TOKEN_FACTORY_NAME || "Test Token",
      symbol: process.env.TOKEN_FACTORY_SYMBOL || "TEST",
      initialSupply: process.env.TOKEN_FACTORY_INITIAL_SUPPLY || "0"
    }
  };
};

// 主部署函数
async function deploy() {
  try {
    logger.info("开始部署合约...");
    const [deployer] = await ethers.getSigners();
    logger.info(`部署账户: ${deployer.address}`);
    
    const params = getInitParams();
    const deployedContracts = {};
    
    // 1. 部署 RealEstateSystem - 核心系统合约
    logger.info("部署 RealEstateSystem...");
    const System = await ethers.getContractFactory("RealEstateSystem");
    const system = await upgrades.deployProxy(System, [deployer.address], {
      kind: "uups",
    });
    await system.waitForDeployment();
    const systemAddress = await system.getAddress();
    logger.info(`RealEstateSystem 部署到: ${systemAddress}`);
    deployedContracts.system = system;
    
    // 2. 部署 PropertyManager
    logger.info("部署 PropertyManager...");
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    const propertyManager = await upgrades.deployProxy(PropertyManager, [systemAddress], {
      kind: "uups",
    });
    await propertyManager.waitForDeployment();
    const propertyManagerAddress = await propertyManager.getAddress();
    logger.info(`PropertyManager 部署到: ${propertyManagerAddress}`);
    deployedContracts.propertyManager = propertyManager;
    
    // 3. 部署 TradingManager
    logger.info("部署 TradingManager...");
    const TradingManager = await ethers.getContractFactory("TradingManager");
    const tradingManager = await upgrades.deployProxy(TradingManager, [systemAddress], {
      kind: "uups",
    });
    await tradingManager.waitForDeployment();
    const tradingManagerAddress = await tradingManager.getAddress();
    logger.info(`TradingManager 部署到: ${tradingManagerAddress}`);
    deployedContracts.tradingManager = tradingManager;
    
    // 4. 部署 RewardManager
    logger.info("部署 RewardManager...");
    const RewardManager = await ethers.getContractFactory("RewardManager");
    const rewardManager = await upgrades.deployProxy(RewardManager, [
      params.reward.platformFeeRate,
      params.reward.maintenanceFeeRate,
      params.reward.rewardFeeReceiver,
      ethers.parseEther(params.reward.minDistributionThreshold.toString()),
      systemAddress
    ], {
      kind: "uups",
    });
    await rewardManager.waitForDeployment();
    const rewardManagerAddress = await rewardManager.getAddress();
    logger.info(`RewardManager 部署到: ${rewardManagerAddress}`);
    deployedContracts.rewardManager = rewardManager;
    
    // 5. 在系统合约中授权各组件
    logger.info("授权各组件...");
    await system.setContractAuthorization(propertyManagerAddress, true);
    logger.info("已授权 PropertyManager");
    
    await system.setContractAuthorization(tradingManagerAddress, true);
    logger.info("已授权 TradingManager");
    
    await system.setContractAuthorization(rewardManagerAddress, true);
    logger.info("已授权 RewardManager");
    
    // 6. 设置各组件的系统地址
    logger.info("更新各组件系统地址...");
    
    // PropertyManager已在初始化时设置系统地址
    logger.info("PropertyManager的系统地址已在初始化时设置");
    
    // TradingManager已在初始化时设置系统地址
    logger.info("TradingManager的系统地址已在初始化时设置");
    
    // RewardManager 的系统地址已在构造时设置
    logger.info("RewardManager 的系统地址已在初始化时设置");
    
    // 7. 部署 PropertyToken 示例
    logger.info("部署 PropertyToken 示例...");
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyToken = await upgrades.deployProxy(PropertyToken, [
      ethers.ZeroHash,
      params.token.name,
      params.token.symbol,
      ethers.parseEther(params.token.initialSupply.toString()),
      deployer.address,
      systemAddress
    ], {
      kind: "uups",
    });
    await propertyToken.waitForDeployment();
    const propertyTokenAddress = await propertyToken.getAddress();
    logger.info(`PropertyToken 部署到: ${propertyTokenAddress}`);
    deployedContracts.propertyToken = propertyToken;
    
    // 8. 部署 RealEstateFacade
    logger.info("部署 RealEstateFacade...");
    const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
    const realEstateFacade = await upgrades.deployProxy(RealEstateFacade, [
      systemAddress,
      deployer.address,
      propertyManagerAddress,
      tradingManagerAddress,
      rewardManagerAddress
    ], {
      kind: "uups",
    });
    await realEstateFacade.waitForDeployment();
    const realEstateFacadeAddress = await realEstateFacade.getAddress();
    logger.info(`RealEstateFacade 部署到: ${realEstateFacadeAddress}`);
    deployedContracts.realEstateFacade = realEstateFacade;
    
    // 9. 设置 TradingManager 参数
    logger.info("设置 TradingManager 参数...");
    await tradingManager.setMaxTradeAmount(ethers.parseEther("1000"));
    await tradingManager.setMinTradeAmount(ethers.parseEther("0.01"));
    await tradingManager.setCooldownPeriod(3600); // 1小时
    await tradingManager.setFeeRate(params.trading.tradingFeeRate);
    await tradingManager.setFeeReceiver(params.trading.tradingFeeReceiver);
    logger.info("TradingManager 参数已设置");
    
    // 10. 部署简单ERC20测试代币
    logger.info("部署测试代币...");
    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const testToken = await SimpleERC20.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000")
    );
    await testToken.waitForDeployment();
    const testTokenAddress = await testToken.getAddress();
    logger.info(`测试代币已部署到: ${testTokenAddress}`);
    deployedContracts.testToken = testToken;
    
    logger.info("所有合约部署完成!");
    
    // 输出所有合约地址
    logger.info("== 合约地址摘要 ==");
    for (const [name, contract] of Object.entries(deployedContracts)) {
      logger.info(`${name}: ${await contract.getAddress()}`);
    }
    
    return deployedContracts;
  } catch (error) {
    logger.error("部署失败:", error);
    throw error;
  }
}

// 只有直接运行脚本时才执行部署
if (require.main === module) {
  deploy()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deploy }; 