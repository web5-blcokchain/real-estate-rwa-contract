const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
require('dotenv').config();

const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
};

async function deploy() {
  try {
    logger.info("开始基础部署...");
    const [deployer] = await ethers.getSigners();
    logger.info(`部署账户: ${deployer.address}`);
    
    // 1. 部署 RealEstateSystem
    logger.info("部署 RealEstateSystem...");
    const System = await ethers.getContractFactory("RealEstateSystem");
    const system = await upgrades.deployProxy(System, [deployer.address], {
      kind: "uups",
    });
    await system.waitForDeployment();
    const systemAddress = await system.getAddress();
    logger.info(`RealEstateSystem 部署到: ${systemAddress}`);
    
    // 2. 部署 PropertyManager
    logger.info("部署 PropertyManager...");
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    const propertyManager = await upgrades.deployProxy(PropertyManager, [deployer.address], {
      kind: "uups",
    });
    await propertyManager.waitForDeployment();
    const propertyManagerAddress = await propertyManager.getAddress();
    logger.info(`PropertyManager 部署到: ${propertyManagerAddress}`);
    
    // 3. 部署 TradingManager
    logger.info("部署 TradingManager...");
    const TradingManager = await ethers.getContractFactory("TradingManager");
    const tradingManager = await upgrades.deployProxy(TradingManager, [deployer.address], {
      kind: "uups",
    });
    await tradingManager.waitForDeployment();
    const tradingManagerAddress = await tradingManager.getAddress();
    logger.info(`TradingManager 部署到: ${tradingManagerAddress}`);
    
    // 4. 部署 RewardManager
    logger.info("部署 RewardManager...");
    const RewardManager = await ethers.getContractFactory("RewardManager");
    const rewardManager = await upgrades.deployProxy(RewardManager, [
      500, // platformFeeRate - 5%
      200, // maintenanceFeeRate - 2%
      deployer.address, // feeReceiver
      ethers.parseEther("0.01"), // minDistributionThreshold
      deployer.address // systemAddress placeholder
    ], {
      kind: "uups",
    });
    await rewardManager.waitForDeployment();
    const rewardManagerAddress = await rewardManager.getAddress();
    logger.info(`RewardManager 部署到: ${rewardManagerAddress}`);
    
    // 5. 部署 PropertyToken 示例
    logger.info("部署 PropertyToken 示例...");
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyToken = await upgrades.deployProxy(PropertyToken, [
      ethers.ZeroHash, // propertyIdHash
      "Test Token", // name
      "TEST", // symbol
      ethers.parseEther("1000"), // initialSupply
      deployer.address, // admin
      deployer.address // systemAddress placeholder
    ], {
      kind: "uups",
    });
    await propertyToken.waitForDeployment();
    const propertyTokenAddress = await propertyToken.getAddress();
    logger.info(`PropertyToken 部署到: ${propertyTokenAddress}`);
    
    // 6. 部署 RealEstateFacade
    logger.info("部署 RealEstateFacade...");
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
    logger.info(`RealEstateFacade 部署到: ${realEstateFacadeAddress}`);
    
    // 输出所有合约地址
    logger.info("== 合约地址摘要 ==");
    logger.info(`RealEstateSystem: ${systemAddress}`);
    logger.info(`PropertyManager: ${propertyManagerAddress}`);
    logger.info(`TradingManager: ${tradingManagerAddress}`);
    logger.info(`RewardManager: ${rewardManagerAddress}`);
    logger.info(`PropertyToken: ${propertyTokenAddress}`);
    logger.info(`RealEstateFacade: ${realEstateFacadeAddress}`);
    
    logger.info("部署完成！");
    
    return {
      system,
      propertyManager,
      tradingManager,
      rewardManager,
      propertyToken,
      realEstateFacade
    };
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