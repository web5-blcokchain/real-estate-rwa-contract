/**
 * 配置模块索引
 * 统一导出所有配置
 */
const { validatePath, getHardhatConfigPath } = require('../utils/paths');
const logger = require('../utils/logger');
const { initializeEnvironment } = require('./environment');
const { getNetworkConfig, validateNetworkConfig } = require('./networks');
const { getAbi, getBytecode, updateContractAddress, saveToDeployState } = require('./contracts');
const { getPrivateKey, getAllPrivateKeys } = require('./keys');

class ConfigManager {
  constructor() {
    this.initialized = false;
    this.config = null;
  }

  /**
   * 初始化配置管理器
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // 初始化环境变量
      initializeEnvironment();

      // 加载网络配置
      const network = process.env.DEPLOY_NETWORK || 'bsc_testnet';
      const networkConfig = getNetworkConfig(network);
      if (!validateNetworkConfig(networkConfig)) {
        throw new Error('Invalid network configuration');
      }

      // 加载私钥
      const privateKeys = getAllPrivateKeys();

      // 加载合约配置
      const contractAddresses = {};
      const contractAbis = {};
      const contractBytecodes = {};

      // 保存配置
      this.config = {
        network: networkConfig,
        privateKeys,
        contractAddresses,
        contractAbis,
        contractBytecodes
      };

      this.initialized = true;
      logger.info('Configuration manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize configuration manager:', error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   * @returns {boolean} 是否已初始化
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * 获取合约地址
   * @param {string} contractName 合约名称
   * @returns {string} 合约地址
   */
  getContractAddress(contractName) {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return this.config.contractAddresses[contractName];
  }

  /**
   * 获取网络配置
   * @returns {Object} 网络配置
   */
  getNetworkConfig() {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return this.config.network;
  }

  /**
   * 获取Hardhat网络配置
   * @returns {Object} Hardhat网络配置
   */
  getHardhatNetworkConfig() {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return this.config.network.hardhatConfig;
  }

  /**
   * 获取网络原始RPC URL
   * @returns {string} RPC URL
   */
  getRpcUrl() {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return this.config.network.rpcUrl;
  }

  /**
   * 获取网络链ID
   * @returns {number} 链ID
   */
  getChainId() {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return this.config.network.chainId;
  }

  /**
   * 获取私钥
   * @param {string} role 角色
   * @returns {string} 私钥
   */
  getPrivateKey(role) {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return this.config.privateKeys[role];
  }

  /**
   * 获取合约ABI
   * @param {string} contractName 合约名称
   * @returns {Array} 合约ABI
   */
  getContractAbi(contractName) {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return this.config.contractAbis[contractName];
  }

  /**
   * 获取合约字节码
   * @param {string} contractName 合约名称
   * @returns {string} 合约字节码
   */
  getContractBytecode(contractName) {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    return this.config.contractBytecodes[contractName];
  }

  /**
   * 更新合约地址
   * @param {string} contractName 合约名称
   * @param {string} address 合约地址
   */
  async updateContractAddress(contractName, address) {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    await updateContractAddress(contractName, address);
    this.config.contractAddresses[contractName] = address;
  }

  /**
   * 保存部署状态
   * @param {Object} state 部署状态
   */
  async saveDeployState(state) {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }
    await saveToDeployState(state);
  }
}

const configManager = new ConfigManager();

module.exports = {
  configManager
}; 