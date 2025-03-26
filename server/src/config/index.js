/**
 * 配置模块
 * 集中管理所有配置项目
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { web3Provider } = require('../../../shared/utils/web3Provider');
const { contractService } = require('../../../shared/utils/contractService');
const { getContractAddresses } = require('../../../shared/config/contracts');
const logger = require('../utils/logger');

// 基础配置
const baseConfig = {
  port: process.env.SERVER_PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// 区块链网络配置
const networkConfig = {
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  chainId: parseInt(process.env.CHAIN_ID || '31337'),
  privateKey: process.env.ADMIN_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000'
};

// 操作权限配置 - 定义每种操作需要的角色
const operationRoles = {
  // 房产管理
  registerProperty: 'operator',
  approveProperty: 'admin',
  rejectProperty: 'admin',
  delistProperty: 'admin',
  setPropertyStatus: 'admin',
  
  // 代币管理
  createToken: 'admin',
  updateTokenImplementation: 'admin',
  addToWhitelist: 'operator',
  batchAddToWhitelist: 'operator',
  removeFromWhitelist: 'operator',
  batchRemoveFromWhitelist: 'operator',
  
  // 赎回管理
  approveRedemption: 'finance',
  rejectRedemption: 'finance',
  completeRedemption: 'finance',
  addSupportedStablecoin: 'admin',
  removeSupportedStablecoin: 'admin',
  emergencyWithdraw: 'emergency',
  
  // 租金管理
  distributeRent: 'finance',
  liquidateUnclaimedRent: 'finance'
};

/**
 * 将 camelCase 转换为 PascalCase
 * @param {string} str camelCase 字符串
 * @returns {string} PascalCase 字符串
 */
function camelToPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 初始化配置
 * @returns {Object} 配置对象
 */
function initializeConfig() {
  logger.info('Starting configuration initialization...');
  
  // 加载合约地址
  const addresses = getContractAddresses();
  
  // 验证合约地址
  Object.entries(addresses).forEach(([name, address]) => {
    const contractName = camelToPascalCase(name);
    if (!address) {
      logger.warn(`Warning: Contract address for ${contractName} is not configured`);
    } else {
      logger.info(`Loaded contract address for ${contractName}: ${address}`);
    }
  });
  
  logger.info('Configuration initialized successfully');
  return addresses;
}

// 导出配置
module.exports = {
  baseConfig,
  networkConfig,
  operationRoles,
  web3Provider,
  contractService,
  initializeConfig
};