const path = require('path');
const { getContractAddresses } = require('./contracts');
const { getNetworkConfig } = require('./networks');
const { getAllPrivateKeys } = require('./keys');
const logger = require('../utils/logger');

class ConfigManager {
  constructor() {
    this.initialized = false;
    this.config = {
      contracts: null,
      network: null,
      keys: null
    };
  }

  /**
   * 初始化配置管理器
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing config manager...');

      // 加载合约地址
      this.config.contracts = getContractAddresses();
      logger.info('Contract addresses loaded');

      // 加载网络配置
      this.config.network = getNetworkConfig();
      logger.info('Network config loaded');

      // 加载私钥
      this.config.keys = getAllPrivateKeys();
      logger.info('Private keys loaded');

      this.initialized = true;
      logger.info('Config manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize config manager:', error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   * @private
   */
  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('Config manager not initialized');
    }
  }

  /**
   * 获取合约地址
   * @param {string} contractName 合约名称
   * @returns {string} 合约地址
   */
  getContractAddress(contractName) {
    this._checkInitialized();
    const address = this.config.contracts[contractName];
    if (!address) {
      throw new Error(`Contract address not found for ${contractName}`);
    }
    return address;
  }

  /**
   * 获取网络配置
   * @returns {Object} 网络配置
   */
  getNetworkConfig() {
    this._checkInitialized();
    return this.config.network;
  }

  /**
   * 获取私钥
   * @param {string} role 角色名称
   * @returns {string} 私钥
   */
  getPrivateKey(role) {
    this._checkInitialized();
    const key = this.config.keys[role];
    if (!key) {
      throw new Error(`Private key not found for role: ${role}`);
    }
    return key;
  }

  /**
   * 获取所有私钥
   * @returns {Object} 角色私钥映射
   */
  getAllPrivateKeys() {
    this._checkInitialized();
    return this.config.keys;
  }
}

// 创建单例实例
const configManager = new ConfigManager();

module.exports = configManager; 