/**
 * 配置模块
 * 集中管理所有配置项目
 */

const path = require('path');
const { configManager } = require('../../../shared/config');
const { getContractAddresses } = require('../../../shared/config/contracts');
const { getLogPath } = require('../../../shared/utils/paths');
const logger = require('../utils/logger');

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
 * 初始化配置
 * @returns {Promise<Object>} 配置对象
 */
const initializeConfig = async () => {
  try {
    if (!configManager.isInitialized()) {
      await configManager.initialize();
      logger.info('Shared configuration manager initialized');
      
      // 输出当前使用的网络配置
      const networkConfig = configManager.getNetworkConfig();
      logger.info(`Using network: ${networkConfig.name}, ChainId: ${networkConfig.chainId}, RPC: ${networkConfig.rpcUrl}`);
    }
    
    // 验证合约地址
    const addresses = getContractAddresses();
    if (!addresses) {
      logger.warn('No contract addresses found in configuration');
    } else {
      logger.info(`Loaded ${Object.keys(addresses).length} contract addresses`);
    }
    
    return configManager;
  } catch (error) {
    logger.error('Failed to initialize configuration:', error);
    throw error;
  }
};

/**
 * 获取基础配置
 * @returns {Object} 基础配置对象
 */
const getBaseConfig = () => ({
  port: process.env.SERVER_PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '*'
});

// 导出配置
module.exports = {
  getBaseConfig,
  operationRoles,
  initializeConfig,
  configManager
};