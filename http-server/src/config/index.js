/**
 * 配置文件
 * 包含HTTP服务器的所有配置项
 */

require('dotenv').config();
const path = require('path');

// 默认配置
const config = {
  // 服务器设置
  server: {
    port: process.env.HTTP_SERVER_PORT || 3030,
    host: process.env.HTTP_SERVER_HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },
  
  // API设置
  api: {
    prefix: 'api',
    version: 'v1',
    key: process.env.API_KEY || 'default-api-key',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100 // 每个IP在windowMs时间内的最大请求数
    }
  },
  
  // 区块链设置
  blockchain: {
    rpcUrl: process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545',
    chainId: parseInt(process.env.HARDHAT_CHAIN_ID || '31337', 10),
    privateKeys: {
      admin: process.env.ADMIN_PRIVATE_KEY,
      propertyAdmin: process.env.PROPERTY_ADMIN_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY,
      tokenAdmin: process.env.TOKEN_ADMIN_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY,
      systemAdmin: process.env.SYSTEM_ADMIN_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY
    },
    contracts: {
      addressesPath: path.resolve(__dirname, '../../../scripts/deploy-state.json')
    },
    transactionConfirmations: 1,
    gasMultiplier: 1.2
  },
  
  // 日志设置
  logs: {
    dir: path.resolve(__dirname, '../../../logs/http-server'),
    level: process.env.LOG_LEVEL || 'info',
    maxSize: '20m',
    maxFiles: '14d'
  },
  
  // 缓存设置
  cache: {
    stdTTL: 60 * 5, // 5分钟
    checkPeriod: 60 * 2 // 2分钟
  }
};

module.exports = config; 