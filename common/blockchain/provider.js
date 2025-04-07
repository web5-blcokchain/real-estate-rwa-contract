/**
 * Provider管理模块
 * 提供区块链Provider相关的工具方法
 */
const { ethers } = require('ethers');
const Logger = require('../logger');
const EnvUtils = require('../env');

/**
 * Provider管理类
 */
class ProviderManager {
  // 缓存Provider实例
  static #defaultProvider = null;
  static #providers = new Map();
  
  /**
   * 获取默认Provider实例
   * @returns {ethers.Provider} Provider实例
   */
  static getDefaultProvider() {
    if (!this.#defaultProvider) {
      try {
        const networkConfig = EnvUtils.getNetworkConfig();
        Logger.debug('初始化默认Provider', { 
          network: networkConfig.name,
          rpcUrl: networkConfig.rpcUrl 
        });
        this.#defaultProvider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      } catch (error) {
        Logger.error('默认Provider初始化失败', { 
          error: error.message,
          stack: error.stack
        });
        throw new Error(`默认Provider初始化失败: ${error.message}`);
      }
    }
    return this.#defaultProvider;
  }
  
  /**
   * 获取Provider实例（根据网络名称）
   * @param {string} networkName - 网络名称 
   * @returns {ethers.Provider} Provider实例
   */
  static getNetworkProvider(networkName) {
    if (!networkName) {
      throw new Error('网络名称不能为空');
    }
    
    const cacheKey = `network:${networkName}`;
    
    if (!this.#providers.has(cacheKey)) {
      try {
        const networkConfig = EnvUtils.getNetworkConfig(networkName);
        
        if (!networkConfig || !networkConfig.rpcUrl) {
          throw new Error(`未找到网络配置或RPC URL: ${networkName}`);
        }
        
        Logger.debug(`初始化网络Provider: ${networkName}`, { 
          rpcUrl: networkConfig.rpcUrl,
          chainId: networkConfig.chainId
        });
        
        this.#providers.set(cacheKey, new ethers.JsonRpcProvider(networkConfig.rpcUrl));
      } catch (error) {
        Logger.error(`网络Provider[${networkName}]初始化失败`, { 
          error: error.message,
          stack: error.stack
        });
        throw new Error(`网络Provider[${networkName}]初始化失败: ${error.message}`);
      }
    }
    return this.#providers.get(cacheKey);
  }
  
  /**
   * 获取Provider实例（根据自定义RPC URL）
   * @param {string} name - Provider名称 
   * @param {string} url - RPC URL
   * @returns {ethers.Provider} Provider实例
   */
  static getProvider(name, url) {
    if (!name) {
      throw new Error('Provider名称不能为空');
    }
    
    if (!url) {
      throw new Error('RPC URL不能为空');
    }
    
    const cacheKey = `custom:${name}`;
    
    if (!this.#providers.has(cacheKey)) {
      try {
        Logger.debug(`初始化自定义Provider: ${name}`, { url });
        this.#providers.set(cacheKey, new ethers.JsonRpcProvider(url));
      } catch (error) {
        Logger.error(`自定义Provider[${name}]初始化失败`, { 
          error: error.message,
          stack: error.stack
        });
        throw new Error(`自定义Provider[${name}]初始化失败: ${error.message}`);
      }
    }
    return this.#providers.get(cacheKey);
  }

  /**
   * 重置所有Provider
   */
  static resetAll() {
    this.#defaultProvider = null;
    this.#providers.clear();
    Logger.debug('已重置所有Provider');
  }
  
  /**
   * 重置特定Provider
   * @param {string} name - Provider名称或网络名称
   * @param {boolean} [isNetwork=false] - 是否是网络名称
   */
  static resetProvider(name, isNetwork = false) {
    if (!name) {
      this.#defaultProvider = null;
      Logger.debug('已重置默认Provider');
      return;
    }
    
    const cacheKey = isNetwork ? `network:${name}` : `custom:${name}`;
    this.#providers.delete(cacheKey);
    Logger.debug(`已重置Provider: ${cacheKey}`);
  }
  
  /**
   * 获取所有已初始化的Provider名称
   * @returns {Object} Provider名称对象，包含networks和customs两个数组
   */
  static getProviderNames() {
    const result = {
      networks: [],
      customs: []
    };
    
    for (const key of this.#providers.keys()) {
      if (key.startsWith('network:')) {
        result.networks.push(key.substring(8));
      } else if (key.startsWith('custom:')) {
        result.customs.push(key.substring(7));
      }
    }
    
    return result;
  }
  
  /**
   * 检查Provider是否可用
   * @param {string|ethers.Provider} provider - Provider名称、网络名称或实例
   * @param {boolean} [isNetwork=false] - 如果provider是字符串，此参数指示它是否是网络名称
   * @returns {Promise<boolean>} 是否可用
   */
  static async isProviderAvailable(provider, isNetwork = false) {
    try {
      let providerInstance;
      
      if (typeof provider === 'string') {
        if (isNetwork) {
          providerInstance = this.getNetworkProvider(provider);
        } else {
          // 尝试从缓存获取
          const cacheKey = `custom:${provider}`;
          providerInstance = this.#providers.get(cacheKey) || this.getDefaultProvider();
        }
      } else if (provider && typeof provider.getBlockNumber === 'function') {
        providerInstance = provider;
      } else {
        throw new Error('无效的Provider参数');
      }
      
      // 尝试获取区块号
      await providerInstance.getBlockNumber();
      return true;
    } catch (error) {
      Logger.error('Provider可用性检查失败', { 
        provider: typeof provider === 'string' ? provider : 'instance',
        error: error.message
      });
      return false;
    }
  }
}

module.exports = ProviderManager; 