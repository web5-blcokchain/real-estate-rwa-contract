const { getNetworkConfigPath, validatePath } = require('../utils/paths');
const logger = require('../utils/logger');

/**
 * 获取网络配置
 * @param {string} network 网络名称
 * @returns {Object} 网络配置
 */
function getNetworkConfig(network) {
  try {
    const configPath = getNetworkConfigPath(network);
    if (!validatePath(configPath)) {
      throw new Error(`Network configuration not found for network: ${network}`);
    }

    const config = require(configPath);
    logger.info(`Network configuration loaded for ${network}`);
    return config;
  } catch (error) {
    logger.error(`Failed to load network configuration for ${network}:`, error);
    throw error;
  }
}

/**
 * 获取所有可用网络
 * @returns {string[]} 网络名称列表
 */
function getAvailableNetworks() {
  try {
    const networks = ['bsc_mainnet', 'bsc_testnet', 'polygon_mainnet', 'polygon_testnet'];
    const availableNetworks = networks.filter(network => {
      const configPath = getNetworkConfigPath(network);
      return validatePath(configPath);
    });
    
    logger.info(`Found ${availableNetworks.length} available networks`);
    return availableNetworks;
  } catch (error) {
    logger.error('Failed to get available networks:', error);
    throw error;
  }
}

/**
 * 验证网络配置
 * @param {Object} config 网络配置
 * @returns {boolean} 是否有效
 */
function validateNetworkConfig(config) {
  const requiredFields = ['rpcUrl', 'chainId', 'explorerUrl'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    logger.error(`Missing required fields in network config: ${missingFields.join(', ')}`);
    return false;
  }
  
  return true;
}

module.exports = {
  getNetworkConfig,
  getAvailableNetworks,
  validateNetworkConfig
}; 