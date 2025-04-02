/**
 * 配置模块
 * 加载和管理应用配置
 */
require('dotenv').config();

/**
 * 服务器配置
 */
const server = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

/**
 * 环境配置
 */
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

/**
 * API配置
 */
const api = {
  version: '1.0.0',
  keys: process.env.API_KEYS ? process.env.API_KEYS.split(',') : []
};

/**
 * 区块链网络配置
 */
const blockchain = {
  defaultNetwork: process.env.DEFAULT_NETWORK || 'local',
  
  // 网络配置
  networks: {
    // 本地网络
    local: {
      rpcUrl: process.env.LOCAL_RPC_URL || 'http://localhost:8545',
      contracts: {
        RealEstateSystem: process.env.LOCAL_REAL_ESTATE_SYSTEM_ADDRESS,
        PropertyManager: process.env.LOCAL_PROPERTY_MANAGER_ADDRESS,
        PropertyToken: process.env.LOCAL_PROPERTY_TOKEN_ADDRESS,
        RoleManager: process.env.LOCAL_ROLE_MANAGER_ADDRESS,
        TradingManager: process.env.LOCAL_TRADING_MANAGER_ADDRESS,
        RewardManager: process.env.LOCAL_REWARD_MANAGER_ADDRESS
      }
    },
    
    // Sepolia测试网
    sepolia: {
      rpcUrl: process.env.SEPOLIA_RPC_URL,
      contracts: {
        RealEstateSystem: process.env.SEPOLIA_REAL_ESTATE_SYSTEM_ADDRESS,
        PropertyManager: process.env.SEPOLIA_PROPERTY_MANAGER_ADDRESS,
        PropertyToken: process.env.SEPOLIA_PROPERTY_TOKEN_ADDRESS,
        RoleManager: process.env.SEPOLIA_ROLE_MANAGER_ADDRESS,
        TradingManager: process.env.SEPOLIA_TRADING_MANAGER_ADDRESS,
        RewardManager: process.env.SEPOLIA_REWARD_MANAGER_ADDRESS
      }
    }
  }
};

/**
 * 日志配置
 */
const logging = {
  level: process.env.LOG_LEVEL || 'info',
  file: process.env.LOG_FILE || 'logs/app.log'
};

/**
 * 导出配置
 */
module.exports = {
  server,
  env,
  api,
  blockchain,
  logging,
  
  // 派生的配置
  baseUrl: `http://${server.host}:${server.port}`,
  apiPath: '/api/v1'
}; 