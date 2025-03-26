const logger = require('./logger');
const { ApiError } = require('../../server/src/middlewares/errorHandler');
const { getNetworkConfigPath } = require('./paths');

/**
 * 网络工具类
 * 提供与区块链网络配置相关的功能
 */
class Network {
  constructor() {
    this.configs = new Map();
  }
  
  /**
   * 获取网络配置
   * @param {string} network 网络名称
   * @returns {Promise<object>} 网络配置
   */
  async getNetworkConfig(network) {
    try {
      if (!network) {
        throw new ApiError(400, '网络名称不能为空');
      }
      
      // 检查缓存
      if (this.configs.has(network)) {
        return this.configs.get(network);
      }
      
      // 获取配置文件路径
      const configPath = getNetworkConfigPath(network);
      if (!configPath) {
        throw new ApiError(500, `未找到网络配置文件 - network: ${network}`);
      }
      
      // 加载配置文件
      const config = require(configPath);
      
      // 验证配置
      this.validateConfig(config);
      
      // 缓存配置
      this.configs.set(network, config);
      
      return config;
    } catch (error) {
      logger.error(`获取网络配置失败 - network: ${network}, error: ${error.message}`);
      throw new ApiError(500, '获取网络配置失败', error.message);
    }
  }
  
  /**
   * 验证网络配置
   * @param {object} config 网络配置
   */
  validateConfig(config) {
    if (!config) {
      throw new ApiError(500, '网络配置不能为空');
    }
    
    if (!config.rpcUrl) {
      throw new ApiError(500, '网络配置缺少RPC URL');
    }
    
    if (!config.chainId) {
      throw new ApiError(500, '网络配置缺少链ID');
    }
    
    if (!config.explorerUrl) {
      throw new ApiError(500, '网络配置缺少区块浏览器URL');
    }
    
    if (!config.networkName) {
      throw new ApiError(500, '网络配置缺少网络名称');
    }
    
    if (!config.nativeCurrency) {
      throw new ApiError(500, '网络配置缺少原生货币信息');
    }
    
    if (!config.nativeCurrency.name) {
      throw new ApiError(500, '网络配置缺少原生货币名称');
    }
    
    if (!config.nativeCurrency.symbol) {
      throw new ApiError(500, '网络配置缺少原生货币符号');
    }
    
    if (!config.nativeCurrency.decimals) {
      throw new ApiError(500, '网络配置缺少原生货币精度');
    }
    
    if (config.confirmations === undefined) {
      throw new ApiError(500, '网络配置缺少确认数');
    }
    
    if (config.defaultGasLimit === undefined) {
      throw new ApiError(500, '网络配置缺少默认gas限制');
    }
    
    if (config.defaultGasPrice === undefined) {
      throw new ApiError(500, '网络配置缺少默认gas价格');
    }
  }
  
  /**
   * 清除网络配置缓存
   * @param {string} network 网络名称
   */
  clearConfig(network) {
    if (network) {
      this.configs.delete(network);
    } else {
      this.configs.clear();
    }
  }
}

module.exports = new Network(); 