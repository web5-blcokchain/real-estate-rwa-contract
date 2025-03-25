/**
 * 配置模块索引
 * 统一导出所有配置
 */
const contracts = require('./contracts');
const keys = require('./keys');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 尝试读取部署状态文件
 * @returns {Object} 部署的合约地址
 */
function getDeployedContracts() {
  return contracts.getContractAddresses();
}

// 合约地址配置
const contractAddresses = getDeployedContracts();

// 网络配置
const networkConfig = {
  rpcUrl: process.env.RPC_URL || process.env.ETH_RPC_URL || 'http://localhost:8545',
  wsUrl: process.env.WS_URL || process.env.ETH_WS_URL || '',
  chainId: parseInt(process.env.CHAIN_ID || '31337'),
  deployNetwork: process.env.DEPLOY_NETWORK || 'hardhat'
};

// 日志配置
const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  directory: process.env.LOG_DIRECTORY || './logs',
  filename: process.env.LOG_FILENAME || 'app-%DATE%.log',
  datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  logObjects: process.env.LOG_OBJECTS === 'true'
};

// 费用配置
const feeConfig = {
  tradingFee: parseInt(process.env.TRADING_FEE || '50'),     // 基点，100 = 1%
  tokenizationFee: parseInt(process.env.TOKENIZATION_FEE || '100'),
  redemptionFee: parseInt(process.env.REDEMPTION_FEE || '30'),
  platformFee: parseInt(process.env.PLATFORM_FEE || '20'),
  maintenanceFee: parseInt(process.env.MAINTENANCE_FEE || '15')
};

// 角色地址配置
const roleAddresses = {
  superAdmin: process.env.SUPER_ADMIN_ADDRESS || '',
  propertyManager: process.env.PROPERTY_MANAGER_ADDRESS || '',
  feeCollector: process.env.FEE_COLLECTOR_ADDRESS || ''
};

// 部署配置
const deployConfig = {
  forceRedeploy: process.env.FORCE_DEPLOY === 'true',
  verifyContracts: process.env.VERIFY_CONTRACTS !== 'false',
  bscScanApiKey: process.env.BSCSCAN_API_KEY || ''
};

// 服务器配置
const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  environment: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// 导出所有配置
module.exports = {
  contractAddresses,
  networkConfig,
  loggingConfig,
  feeConfig,
  roleAddresses,
  deployConfig,
  serverConfig,
  getDeployedContracts,
  contracts,
  keys
}; 