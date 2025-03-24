/**
 * 部署配置文件
 * 从.env文件读取配置，并提供默认值和结构化配置
 */
require("dotenv").config();
const hre = require("hardhat");

// 从环境变量获取值，带默认值
function getEnv(key, defaultValue) {
  return process.env[key] || defaultValue;
}

module.exports = {
  // 不再重复定义网络配置，而是使用hardhat.config.js中的配置
  // 可以通过hre.config.networks访问网络配置
  
  // 合约部署顺序 - 这是结构化的配置，适合放在这里
  deploymentOrder: [
    "RealEstateSystem",
    "RoleManager",
    "FeeManager",
    "PropertyRegistry",
    "TokenFactory",
    "RedemptionManager",
    "RentDistributor",
    "Marketplace",
    "TokenHolderQuery"
  ],
  
  // 合约初始化参数 - 这是结构化的配置，适合放在这里
  initializationParams: {
    PropertyRegistry: ["RoleManager"],
    TokenFactory: ["PropertyRegistry"],
    RedemptionManager: ["PropertyRegistry"],
    RentDistributor: ["TokenFactory"],
    Marketplace: ["TokenFactory"],
    TokenHolderQuery: ["TokenFactory"]
  },
  
  // 费用设置 - 从.env读取，提供默认值
  fees: {
    trading: parseInt(getEnv("TRADING_FEE", "50")),
    tokenization: parseInt(getEnv("TOKENIZATION_FEE", "100")),
    redemption: parseInt(getEnv("REDEMPTION_FEE", "30")),
    platform: parseInt(getEnv("PLATFORM_FEE", "20"))
  },
  
  // 角色地址 - 从.env读取
  roles: {
    // 确保与deploy-utils.js中的getRoles()函数返回的角色名称一致
    superAdmin: getEnv("SUPER_ADMIN_ADDRESS", ""),
    propertyManager: getEnv("PROPERTY_MANAGER_ADDRESS", ""),
    feeCollector: getEnv("FEE_COLLECTOR_ADDRESS", "")
  },
  
  // 部署设置
  deployment: {
    // 是否强制部署到非目标网络
    forceDeploy: getEnv("FORCE_DEPLOY", "false").toLowerCase() === "true",
    // 验证合约
    verify: getEnv("VERIFY_CONTRACTS", "true").toLowerCase() === "true"
  },
  
  // 获取当前网络配置的辅助函数
  getCurrentNetworkConfig: function() {
    const networkName = hre.network.name;
    return {
      name: networkName,
      chainId: hre.config.networks[networkName]?.chainId || 0
    };
  }
};