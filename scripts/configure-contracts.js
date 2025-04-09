const hre = require("hardhat");
const { ethers } = require("hardhat");
require('dotenv').config();

const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
};

// 读取之前部署的合约地址
// 这些值应该从之前运行的deploy-basic.js中获取
const CONTRACT_ADDRESSES = {
  system: "0x0E801D84Fa97b50751Dbf25036d067dCf18858bF",
  propertyManager: "0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf",
  tradingManager: "0x9d4454B023096f34B160D6B654540c56A1F81688",
  rewardManager: "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00",
  propertyToken: "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
  realEstateFacade: "0x809d550fca64d94Bd9F66E60752A544199cfAC3D"
};

async function configureContracts() {
  try {
    logger.info("开始配置合约关系...");
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    logger.info(`配置账户: ${deployer.address}`);
    
    // 获取合约实例
    logger.info("连接到已部署的合约...");
    
    const system = await ethers.getContractAt("RealEstateSystem", CONTRACT_ADDRESSES.system);
    const propertyManager = await ethers.getContractAt("PropertyManager", CONTRACT_ADDRESSES.propertyManager);
    const tradingManager = await ethers.getContractAt("TradingManager", CONTRACT_ADDRESSES.tradingManager);
    const rewardManager = await ethers.getContractAt("RewardManager", CONTRACT_ADDRESSES.rewardManager);
    const propertyToken = await ethers.getContractAt("PropertyToken", CONTRACT_ADDRESSES.propertyToken);
    const realEstateFacade = await ethers.getContractAt("RealEstateFacade", CONTRACT_ADDRESSES.realEstateFacade);
    
    logger.info("成功连接到所有合约");
    
    // 设置 PropertyManager 的系统地址
    logger.info("设置 PropertyManager 的系统地址...");
    try {
      let tx = await propertyManager.setSystem(CONTRACT_ADDRESSES.system);
      await tx.wait();
      logger.info("PropertyManager 系统地址已更新");
    } catch (error) {
      logger.error("更新 PropertyManager 系统地址失败:", error.message);
    }
    
    // 设置 TradingManager 的系统地址
    logger.info("设置 TradingManager 的系统地址...");
    try {
      let tx = await tradingManager.setSystem(CONTRACT_ADDRESSES.system);
      await tx.wait();
      logger.info("TradingManager 系统地址已更新");
    } catch (error) {
      logger.error("更新 TradingManager 系统地址失败:", error.message);
    }
    
    // 设置 RewardManager 的系统地址
    logger.info("设置 RewardManager 的系统地址...");
    try {
      let tx = await rewardManager.setSystem(CONTRACT_ADDRESSES.system);
      await tx.wait();
      logger.info("RewardManager 系统地址已更新");
    } catch (error) {
      logger.error("更新 RewardManager 系统地址失败:", error.message);
    }
    
    // 设置 PropertyToken 的系统地址
    logger.info("设置 PropertyToken 的系统地址...");
    try {
      let tx = await propertyToken.setSystem(CONTRACT_ADDRESSES.system);
      await tx.wait();
      logger.info("PropertyToken 系统地址已更新");
    } catch (error) {
      logger.error("更新 PropertyToken 系统地址失败:", error.message);
    }
    
    // 在 System 中授权各合约
    logger.info("在 System 中授权各合约...");
    try {
      let tx = await system.setContractAuthorization(CONTRACT_ADDRESSES.propertyManager, true);
      await tx.wait();
      logger.info("PropertyManager 已在 System 中授权");
      
      tx = await system.setContractAuthorization(CONTRACT_ADDRESSES.tradingManager, true);
      await tx.wait();
      logger.info("TradingManager 已在 System 中授权");
      
      tx = await system.setContractAuthorization(CONTRACT_ADDRESSES.rewardManager, true);
      await tx.wait();
      logger.info("RewardManager 已在 System 中授权");
      
      tx = await system.setContractAuthorization(CONTRACT_ADDRESSES.realEstateFacade, true);
      await tx.wait();
      logger.info("RealEstateFacade 已在 System 中授权");
    } catch (error) {
      logger.error("在 System 中授权合约失败:", error.message);
    }
    
    // 设置 System 状态为 Active
    logger.info("设置 System 状态为 Active...");
    try {
      // SystemStatus.Active = 2
      let tx = await system.setSystemStatus(2);
      await tx.wait();
      logger.info("System 状态已设置为 Active");
    } catch (error) {
      logger.error("设置 System 状态失败:", error.message);
    }
    
    // 验证配置是否成功
    logger.info("验证配置结果...");
    
    const propertyManagerSystem = await propertyManager.system();
    logger.info(`PropertyManager 系统地址: ${propertyManagerSystem}`);
    
    const tradingManagerSystem = await tradingManager.system();
    logger.info(`TradingManager 系统地址: ${tradingManagerSystem}`);
    
    const rewardManagerSystem = await rewardManager.system();
    logger.info(`RewardManager 系统地址: ${rewardManagerSystem}`);
    
    const propertyTokenSystem = await propertyToken.system();
    logger.info(`PropertyToken 系统地址: ${propertyTokenSystem}`);
    
    const systemStatus = await system.systemStatus();
    logger.info(`System 状态: ${systemStatus}`);
    
    // 检查系统中合约的授权状态
    const pmAuthorized = await system.authorizedContracts(CONTRACT_ADDRESSES.propertyManager);
    logger.info(`PropertyManager 授权状态: ${pmAuthorized}`);
    
    const tmAuthorized = await system.authorizedContracts(CONTRACT_ADDRESSES.tradingManager);
    logger.info(`TradingManager 授权状态: ${tmAuthorized}`);
    
    const rmAuthorized = await system.authorizedContracts(CONTRACT_ADDRESSES.rewardManager);
    logger.info(`RewardManager 授权状态: ${rmAuthorized}`);
    
    const rfAuthorized = await system.authorizedContracts(CONTRACT_ADDRESSES.realEstateFacade);
    logger.info(`RealEstateFacade 授权状态: ${rfAuthorized}`);
    
    logger.info("合约配置完成!");
    
  } catch (error) {
    logger.error("配置合约失败:", error);
    throw error;
  }
}

// 只有直接运行脚本时才执行
if (require.main === module) {
  configureContracts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { configureContracts }; 