/**
 * Wallet管理模块
 * 提供区块链钱包相关的工具方法
 */
const { ethers } = require('ethers');
const Logger = require('../logger');
const EnvUtils = require('../env');
const ProviderManager = require('./provider');

/**
 * 系统支持的角色类型
 */
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator'
};

/**
 * 钱包管理类
 */
class WalletManager {
  // 缓存Wallet实例
  static #defaultWallet = null;
  static #wallets = new Map();
  
  /**
   * 获取系统支持的角色类型
   * @returns {Object} 角色类型常量
   */
  static getRoles() {
    return ROLES;
  }

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
          throw new Error(`未配置网络[${networkConfig.name}]的默认私钥`);
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
   * 获取角色钱包实例
   * @param {string} role - 角色名称（admin/manager/operator）
   * @param {string} [networkName] - 网络名称，不传则使用当前网络
   * @returns {ethers.Wallet} 角色钱包实例
   */
  static getRoleWallet(role, networkName) {
    if (!role) {
      throw new Error('角色名称不能为空');
    }
    
    // 验证是否为有效角色
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      throw new Error(`无效的角色名称: ${role}，有效角色: ${validRoles.join(', ')}`);
    }
    
    const cacheKey = `role:${role}:${networkName || 'default'}`;
    
    if (!this.#wallets.has(cacheKey)) {
      try {
        // 获取指定网络配置
        const networkConfig = EnvUtils.getNetworkConfig(networkName);
        
        if (!networkConfig.privateKeys || !networkConfig.privateKeys[role]) {
          throw new Error(`未配置网络[${networkConfig.name}]中角色[${role}]的私钥`);
        }
        
        // 获取Provider
        const provider = networkName
          ? ProviderManager.getNetworkProvider(networkName)
          : ProviderManager.getDefaultProvider();
          
        Logger.debug(`初始化角色钱包: ${role}@${networkConfig.name}`);
        
        this.#wallets.set(cacheKey, new ethers.Wallet(networkConfig.privateKeys[role], provider));
      } catch (error) {
        Logger.error(`角色钱包[${role}@${networkName || 'default'}]初始化失败`, { 
          error: error.message,
          stack: error.stack
        });
        throw new Error(`角色钱包[${role}@${networkName || 'default'}]初始化失败: ${error.message}`);
      }
    }
    
    return this.#wallets.get(cacheKey);
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
   * @param {string} name - 钱包名称、网络名称或角色名称
   * @param {string} [type='custom'] - 类型：custom/network/role
   */
  static resetWallet(name, type = 'custom') {
    if (!name) {
      this.#defaultWallet = null;
      Logger.debug('已重置默认钱包');
      return;
    }
    
    let cacheKey;
    switch (type) {
      case 'role':
        // 重置所有网络下的该角色钱包
        for (const key of this.#wallets.keys()) {
          if (key.startsWith(`role:${name}:`)) {
            this.#wallets.delete(key);
            Logger.debug(`已重置角色钱包: ${key}`);
          }
        }
        return;
      case 'network':
        cacheKey = `network:${name}`;
        break;
      case 'custom':
      default:
        cacheKey = `custom:${name}`;
        break;
    }
    
    this.#wallets.delete(cacheKey);
    Logger.debug(`已重置钱包: ${cacheKey}`);
  }
  
  /**
   * 获取所有已初始化的Wallet名称
   * @returns {Object} 包含roles、networks和customs三个数组的对象
   */
  static getWalletNames() {
    const result = {
      roles: {},
      networks: [],
      customs: []
    };
    
    for (const key of this.#wallets.keys()) {
      if (key.startsWith('role:')) {
        // 格式: role:roleName:networkName
        const parts = key.split(':');
        if (parts.length >= 3) {
          const role = parts[1];
          const network = parts[2] === 'default' ? 'default' : parts[2];
          
          if (!result.roles[role]) {
            result.roles[role] = [];
          }
          result.roles[role].push(network);
        }
      } else if (key.startsWith('network:')) {
        result.networks.push(key.substring(8));
      } else if (key.startsWith('custom:')) {
        result.customs.push(key.substring(7));
      }
    }
    
    return result;
  }
  
  /**
   * 获取钱包地址
   * @param {string} [name] - 钱包名称、网络名称或角色名称
   * @param {string} [type='custom'] - 类型：custom/network/role
   * @returns {string} 钱包地址
   */
  static getAddress(name, type = 'custom') {
    try {
      let wallet;
      
      if (!name) {
        wallet = this.getDefaultWallet();
      } else {
        switch (type) {
          case 'role':
            wallet = this.getRoleWallet(name);
            break;
          case 'network':
            wallet = this.getNetworkWallet(name);
            break;
          case 'custom':
          default:
            // 尝试从缓存获取
            const cacheKey = `custom:${name}`;
            const cachedWallet = this.#wallets.get(cacheKey);
            wallet = cachedWallet || this.getDefaultWallet();
            break;
        }
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