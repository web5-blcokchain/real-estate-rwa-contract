const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("开始验证系统状态...");
  
  // 合约地址
  const ADDRESSES = {
    system: "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0",
    propertyManager: "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650",
    tradingManager: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",
    rewardManager: "0xFD471836031dc5108809D173A067e8486B9047A3",
    realEstateFacade: "0x162A433068F51e18b7d13932F27e66a3f99E6890",
  };
  
  // 获取合约实例
  const system = await ethers.getContractAt("RealEstateSystem", ADDRESSES.system);
  const propertyManager = await ethers.getContractAt("PropertyManager", ADDRESSES.propertyManager);
  const tradingManager = await ethers.getContractAt("TradingManager", ADDRESSES.tradingManager);
  const rewardManager = await ethers.getContractAt("RewardManager", ADDRESSES.rewardManager);
  const facade = await ethers.getContractAt("RealEstateFacade", ADDRESSES.realEstateFacade);
  
  console.log("\n=== 系统基本信息 ===");
  
  // 检查系统状态
  const systemStatus = await system.systemStatus();
  console.log(`系统状态: ${systemStatus} (${['Inactive', 'Testing', 'Active', 'Suspended', 'Upgrading'][systemStatus]})`);
  
  // 检查紧急模式
  const emergencyMode = await system.emergencyMode();
  console.log(`紧急模式: ${emergencyMode ? "启用" : "未启用"}`);
  
  // 检查授权状态
  console.log("\n=== 合约授权状态 ===");
  const pmAuth = await system.authorizedContracts(ADDRESSES.propertyManager);
  console.log(`PropertyManager 授权: ${pmAuth ? "已授权" : "未授权"}`);
  
  const tmAuth = await system.authorizedContracts(ADDRESSES.tradingManager);
  console.log(`TradingManager 授权: ${tmAuth ? "已授权" : "未授权"}`);
  
  const rmAuth = await system.authorizedContracts(ADDRESSES.rewardManager);
  console.log(`RewardManager 授权: ${rmAuth ? "已授权" : "未授权"}`);
  
  const facadeAuth = await system.authorizedContracts(ADDRESSES.realEstateFacade);
  console.log(`RealEstateFacade 授权: ${facadeAuth ? "已授权" : "未授权"}`);
  
  // 检查各管理器的系统引用是否正确
  console.log("\n=== 系统引用验证 ===");
  const pmSystem = await propertyManager.system();
  console.log(`PropertyManager 引用的系统地址: ${pmSystem}`);
  console.log(`是否正确: ${pmSystem.toLowerCase() === ADDRESSES.system.toLowerCase() ? "✓" : "✗"}`);
  
  const tmSystem = await tradingManager.system();
  console.log(`TradingManager 引用的系统地址: ${tmSystem}`);
  console.log(`是否正确: ${tmSystem.toLowerCase() === ADDRESSES.system.toLowerCase() ? "✓" : "✗"}`);
  
  const rmSystem = await rewardManager.system();
  console.log(`RewardManager 引用的系统地址: ${rmSystem}`);
  console.log(`是否正确: ${rmSystem.toLowerCase() === ADDRESSES.system.toLowerCase() ? "✓" : "✗"}`);
  
  // 检查交易管理器参数
  console.log("\n=== 交易管理器参数 ===");
  const maxTradeAmount = await tradingManager.maxTradeAmount();
  console.log(`最大交易金额: ${ethers.formatEther(maxTradeAmount)} ETH`);
  
  const minTradeAmount = await tradingManager.minTradeAmount();
  console.log(`最小交易金额: ${ethers.formatEther(minTradeAmount)} ETH`);
  
  const cooldownPeriod = await tradingManager.cooldownPeriod();
  console.log(`冷却期: ${cooldownPeriod} 秒`);
  
  const feeRate = await tradingManager.feeRate();
  console.log(`交易费率: ${Number(feeRate) / 100}%`);
  
  // 验证系统完整性
  console.log("\n=== 系统完整性验证 ===");
  const facadeSystem = await facade.system();
  const facadePM = await facade.propertyManager();
  const facadeTM = await facade.tradingManager();
  const facadeRM = await facade.rewardManager();
  
  console.log(`Facade -> System: ${facadeSystem.toLowerCase() === ADDRESSES.system.toLowerCase() ? "✓" : "✗"}`);
  console.log(`Facade -> PropertyManager: ${facadePM.toLowerCase() === ADDRESSES.propertyManager.toLowerCase() ? "✓" : "✗"}`);
  console.log(`Facade -> TradingManager: ${facadeTM.toLowerCase() === ADDRESSES.tradingManager.toLowerCase() ? "✓" : "✗"}`);
  console.log(`Facade -> RewardManager: ${facadeRM.toLowerCase() === ADDRESSES.rewardManager.toLowerCase() ? "✓" : "✗"}`);
  
  console.log("\n系统验证完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 