/**
 * Wallet管理模块
 * 提供区块链钱包相关的工具方法
 */
const { ethers } = require('ethers');
const Logger = require('../logger');
const EnvUtils = require('../env');
const ProviderManager = require('./provider');

/**
 * 钱包管理类
 */
class WalletManager {
  // 缓存Wallet实例
  static #defaultWallet = null;
  static #wallets = new Map();

  /**
   * 获取默认Wallet实例
   * @returns {ethers.Wallet} Wallet实例
   */
  static getDefaultWallet() {
    if (!this.#defaultWallet) {
      try {
        // 获取当前网络配置，包含私钥
        const networkConfig = EnvUtils.getNetworkConfig();
        
        if (!networkConfig.privateKey || networkConfig.privateKey === '') {
          throw new Error(`未配置网络[${networkConfig.name}]的私钥`);
        }
        
        // 获取默认Provider
        const provider = ProviderManager.getDefaultProvider();
        Logger.debug('初始化默认钱包', { network: networkConfig.name });
        
        this.#defaultWallet = new ethers.Wallet(networkConfig.privateKey, provider);
      } catch (error) {
        Logger.error('默认钱包初始化失败', { 
          error: error.message,
          stack: error.stack
        });
        throw new Error(`默认钱包初始化失败: ${error.message}`);
      }
    }
    return this.#defaultWallet;
  }
  
  /**
   * 获取网络钱包实例
   * @param {string} networkName - 网络名称
   * @returns {ethers.Wallet} Wallet实例
   */
  static getNetworkWallet(networkName) {
    if (!networkName) {
      throw new Error('网络名称不能为空');
    }
    
    const cacheKey = `network:${networkName}`;
    
    if (!this.#wallets.has(cacheKey)) {
      try {
        // 获取指定网络配置
        const networkConfig = EnvUtils.getNetworkConfig(networkName);
        
        if (!networkConfig || !networkConfig.privateKey || networkConfig.privateKey === '') {
          throw new Error(`未配置网络[${networkName}]的私钥`);
        }
        
        // 获取网络Provider
        const provider = ProviderManager.getNetworkProvider(networkName);
        Logger.debug(`初始化网络钱包: ${networkName}`);
        
        this.#wallets.set(cacheKey, new ethers.Wallet(networkConfig.privateKey, provider));
      } catch (error) {
        Logger.error(`网络钱包[${networkName}]初始化失败`, { 
          error: error.message,
          stack: error.stack
        });
        throw new Error(`网络钱包[${networkName}]初始化失败: ${error.message}`);
      }
    }
    return this.#wallets.get(cacheKey);
  }
  
  /**
   * 获取自定义钱包实例
   * @param {string} name - 钱包名称
   * @param {string} privateKey - 私钥
   * @param {string|object} [provider] - Provider名称或实例，默认使用默认Provider
   * @returns {ethers.Wallet} Wallet实例
   */
  static getCustomWallet(name, privateKey, provider) {
    if (!name) {
      throw new Error('钱包名称不能为空');
    }
    
    if (!privateKey || privateKey === '') {
      throw new Error(`未提供钱包[${name}]的私钥`);
    }
    
    const cacheKey = `custom:${name}`;
    
    if (!this.#wallets.has(cacheKey)) {
      try {
        // 处理provider参数
        let providerInstance;
        if (typeof provider === 'string') {
          // 如果provider是字符串，视为网络名称
          providerInstance = provider ? ProviderManager.getNetworkProvider(provider) : ProviderManager.getDefaultProvider();
        } else if (provider && typeof provider.getBlockNumber === 'function') {
          // 如果provider是对象，直接使用
          providerInstance = provider;
        } else {
          // 默认使用默认Provider
          providerInstance = ProviderManager.getDefaultProvider();
        }
        
        Logger.debug(`初始化自定义钱包: ${name}`);
        this.#wallets.set(cacheKey, new ethers.Wallet(privateKey, providerInstance));
      } catch (error) {
        Logger.error(`自定义钱包[${name}]初始化失败`, { 
          error: error.message,
          stack: error.stack
        });
        throw new Error(`自定义钱包[${name}]初始化失败: ${error.message}`);
      }
    }
    return this.#wallets.get(cacheKey);
  }

  /**
   * 创建临时钱包
   * @param {string} privateKey - 私钥
   * @param {string|object} [provider] - Provider名称或实例，默认使用默认Provider
   * @returns {ethers.Wallet} 临时钱包实例
   */
  static createWallet(privateKey, provider) {
    try {
      if (!privateKey || privateKey === '') {
        throw new Error('私钥不能为空');
      }
      
      // 处理provider参数
      let providerInstance;
      if (typeof provider === 'string') {
        // 如果是字符串，视为网络名称
        providerInstance = provider ? ProviderManager.getNetworkProvider(provider) : ProviderManager.getDefaultProvider();
      } else if (provider && typeof provider.getBlockNumber === 'function') {
        providerInstance = provider;
      } else {
        providerInstance = ProviderManager.getDefaultProvider();
      }
      
      Logger.debug('创建临时钱包');
      return new ethers.Wallet(privateKey, providerInstance);
    } catch (error) {
      Logger.error('临时钱包创建失败', { 
        error: error.message,
        stack: error.stack
      });
      throw new Error(`临时钱包创建失败: ${error.message}`);
    }
  }

  /**
   * 重置所有Wallet
   */
  static resetAll() {
    this.#defaultWallet = null;
    this.#wallets.clear();
    Logger.debug('已重置所有钱包');
  }
  
  /**
   * 重置特定Wallet
   * @param {string} name - 钱包名称或网络名称
   * @param {boolean} [isNetwork=false] - 是否为网络名称
   */
  static resetWallet(name, isNetwork = false) {
    if (!name) {
      this.#defaultWallet = null;
      Logger.debug('已重置默认钱包');
      return;
    }
    
    const cacheKey = isNetwork ? `network:${name}` : `custom:${name}`;
    this.#wallets.delete(cacheKey);
    Logger.debug(`已重置钱包: ${cacheKey}`);
  }
  
  /**
   * 获取所有已初始化的Wallet名称
   * @returns {Object} 包含networks和customs两个数组的对象
   */
  static getWalletNames() {
    const result = {
      networks: [],
      customs: []
    };
    
    for (const key of this.#wallets.keys()) {
      if (key.startsWith('network:')) {
        result.networks.push(key.substring(8));
      } else if (key.startsWith('custom:')) {
        result.customs.push(key.substring(7));
      }
    }
    
    return result;
  }
  
  /**
   * 获取钱包地址
   * @param {string} [name] - 钱包名称或网络名称
   * @param {boolean} [isNetwork=false] - 是否为网络名称
   * @returns {string} 钱包地址
   */
  static getAddress(name, isNetwork = false) {
    try {
      let wallet;
      
      if (!name) {
        wallet = this.getDefaultWallet();
      } else if (isNetwork) {
        wallet = this.getNetworkWallet(name);
      } else {
        // 尝试从缓存获取
        const cacheKey = `custom:${name}`;
        const cachedWallet = this.#wallets.get(cacheKey);
        wallet = cachedWallet || this.getDefaultWallet();
      }
      
      return wallet.address;
    } catch (error) {
      Logger.error(`获取钱包地址失败: ${name || 'default'}`, { 
        error: error.message 
      });
      throw new Error(`获取钱包地址失败: ${error.message}`);
    }
  }
}

module.exports = WalletManager; 