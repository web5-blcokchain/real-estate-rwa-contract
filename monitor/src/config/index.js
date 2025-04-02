/**
 * 配置文件
 */

const sharedEnv = require('../../../shared/src/config/env');

// 数据库配置
const database = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'blockchain_monitor',
  ssl: process.env.DB_SSL === 'true',
};

// 区块链配置
const blockchain = {
  // 重用shared中的provider配置
  provider: sharedEnv.blockchain.provider,
  // 扫描间隔（毫秒）
  scanInterval: parseInt(process.env.SCAN_INTERVAL || '60000', 10),
  // 每次扫描的区块数量
  blocksPerScan: parseInt(process.env.BLOCKS_PER_SCAN || '100', 10),
  // 确认次数
  confirmations: parseInt(process.env.CONFIRMATIONS || '12', 10),
  // 重试次数
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  // 重试间隔（毫秒）
  retryInterval: parseInt(process.env.RETRY_INTERVAL || '5000', 10),
};

// 日志配置
const logging = {
  level: process.env.LOG_LEVEL || 'info',
  directory: process.env.LOG_DIR || 'logs',
  maxSize: process.env.LOG_MAX_SIZE || '10m',
  maxFiles: process.env.LOG_MAX_FILES || '7d',
};

module.exports = {
  env: process.env.NODE_ENV || 'development',
  database,
  blockchain,
  logging,
  // 服务器配置（如果需要API)
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
  },
}; 