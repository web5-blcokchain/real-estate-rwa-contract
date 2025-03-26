const path = require('path');
const { configManager } = require('../../../shared/config');
const { getLogPath } = require('../../../shared/utils/paths');
const logger = require('../utils/logger');

// 确保配置管理器已初始化
const initializeConfig = async () => {
  try {
    if (!configManager.isInitialized()) {
      await configManager.initialize();
      logger.info('Shared configuration manager initialized');
    }
    return configManager;
  } catch (error) {
    logger.error('Failed to initialize configuration manager:', error);
    throw error;
  }
};

// 监控模块特定配置
const monitorConfig = {
  // 连接设置
  connection: {
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '5000', 10), // 重连延迟，毫秒
    connectionCheckInterval: parseInt(process.env.CONNECTION_CHECK_INTERVAL || '30000', 10), // 连接检查间隔，毫秒
    maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '10', 10), // 最大重连尝试次数
    enableWebsocket: process.env.ENABLE_WEBSOCKET !== 'false' // 是否启用WebSocket连接
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: getLogPath(), // 使用共享日志路径
    filename: 'events-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    // 是否记录对象到日志
    logObjects: process.env.LOG_OBJECTS === 'true',
    // 是否在控制台显示详细事件内容
    consoleDetailedEvents: process.env.CONSOLE_DETAILED_EVENTS !== 'false',
  },

  // 区块监控配置
  monitor: {
    // 是否启用历史事件扫描
    enableHistoricalEvents: process.env.ENABLE_HISTORICAL_EVENTS !== 'false',
    // 是否启用实时事件监听
    enableRealTimeEvents: process.env.ENABLE_REAL_TIME_EVENTS !== 'false',
    // 初始化时获取的历史块数量
    blocksToFetch: parseInt(process.env.BLOCKS_TO_FETCH || '5000', 10),
    // 历史事件轮询间隔，毫秒
    pollingInterval: parseInt(process.env.POLLING_INTERVAL || '15000', 10),
    // 是否将历史事件写入单独文件
    saveEventsToFile: process.env.SAVE_EVENTS_TO_FILE === 'true',
    // 是否合并相同块的事件，减少冗余
    mergeBlockEvents: process.env.MERGE_BLOCK_EVENTS === 'true',
  }
};

// 获取RPC URL
const getRpcUrl = () => {
  try {
    if (configManager.isInitialized()) {
      const networkConfig = configManager.getNetworkConfig();
      return networkConfig.rpcUrl;
    }
    // 回退到环境变量
    return process.env.ETH_RPC_URL;
  } catch (error) {
    logger.warn('Failed to get RPC URL from config manager:', error.message);
    return process.env.ETH_RPC_URL;
  }
};

// 获取WebSocket URL
const getWsUrl = () => {
  try {
    if (configManager.isInitialized()) {
      const networkConfig = configManager.getNetworkConfig();
      return networkConfig.wsUrl || process.env.ETH_WS_URL || getRpcUrl();
    }
    // 回退到环境变量
    return process.env.ETH_WS_URL || getRpcUrl();
  } catch (error) {
    logger.warn('Failed to get WebSocket URL from config manager:', error.message);
    return process.env.ETH_WS_URL || getRpcUrl();
  }
};

// 获取合约地址
const getContractAddresses = () => {
  try {
    if (configManager.isInitialized()) {
      return require('../../../shared/config/contracts').getContractAddresses();
    }
    // 回退到环境变量定义的合约地址
    return {
      roleManager: process.env.ROLE_MANAGER_ADDRESS,
      feeManager: process.env.FEE_MANAGER_ADDRESS,
      propertyRegistry: process.env.PROPERTY_REGISTRY_ADDRESS,
      tokenFactory: process.env.TOKEN_FACTORY_ADDRESS,
      marketplace: process.env.MARKETPLACE_ADDRESS,
      rentDistributor: process.env.RENT_DISTRIBUTOR_ADDRESS,
      redemptionManager: process.env.REDEMPTION_MANAGER_ADDRESS,
      tokenHolderQuery: process.env.TOKEN_HOLDER_QUERY_ADDRESS,
      realEstateSystem: process.env.REAL_ESTATE_SYSTEM_ADDRESS
    };
  } catch (error) {
    logger.warn('Failed to get contract addresses from config manager:', error.message);
    // 回退到环境变量定义的合约地址
    return {
      roleManager: process.env.ROLE_MANAGER_ADDRESS,
      feeManager: process.env.FEE_MANAGER_ADDRESS,
      propertyRegistry: process.env.PROPERTY_REGISTRY_ADDRESS,
      tokenFactory: process.env.TOKEN_FACTORY_ADDRESS,
      marketplace: process.env.MARKETPLACE_ADDRESS,
      rentDistributor: process.env.RENT_DISTRIBUTOR_ADDRESS,
      redemptionManager: process.env.REDEMPTION_MANAGER_ADDRESS,
      tokenHolderQuery: process.env.TOKEN_HOLDER_QUERY_ADDRESS,
      realEstateSystem: process.env.REAL_ESTATE_SYSTEM_ADDRESS
    };
  }
};

module.exports = {
  ...monitorConfig,
  initializeConfig,
  getRpcUrl,
  getWsUrl,
  getContractAddresses
}; 