const dotenv = require('dotenv');
const path = require('path');
const { ConfigError } = require('../utils/errors');
const validation = require('./validation');
const Logger = require('../utils/logger');

/**
 * 环境变量键名常量
 * @enum {string}
 */
const ENV_KEYS = {
  // 环境配置
  NODE_ENV: 'NODE_ENV',
  BLOCKCHAIN_NETWORK: 'BLOCKCHAIN_NETWORK',
  
  // 日志配置
  LOG_LEVEL: 'LOG_LEVEL',
  LOG_DIR: 'LOG_DIR',
  
  // Chain IDs
  HARDHAT_CHAIN_ID: 'HARDHAT_CHAIN_ID',
  LOCALHOST_CHAIN_ID: 'LOCALHOST_CHAIN_ID',
  TESTNET_CHAIN_ID: 'TESTNET_CHAIN_ID',
  MAINNET_CHAIN_ID: 'MAINNET_CHAIN_ID',
  
  // RPC URLs
  RPC_URL: 'RPC_URL', // 通用RPC URL，优先级高于网络特定RPC
  LOCALHOST_RPC_URL: 'LOCALHOST_RPC_URL',
  
  TESTNET_RPC_URL: 'TESTNET_RPC_URL',
  MAINNET_RPC_URL: 'MAINNET_RPC_URL',
  
  // Gas配置
  GAS_LIMIT: 'GAS_LIMIT',
  GAS_PRICE: 'GAS_PRICE',
  REPORT_GAS: 'REPORT_GAS',
  
  // 私钥配置
  ADMIN_PRIVATE_KEY: 'ADMIN_PRIVATE_KEY',
  MANAGER_PRIVATE_KEY: 'MANAGER_PRIVATE_KEY',
  OPERATOR_PRIVATE_KEY: 'OPERATOR_PRIVATE_KEY',
  CONTRACT_MANAGER_PRIVATE_KEY: 'CONTRACT_MANAGER_PRIVATE_KEY',
  PROPERTY_MANAGER_PRIVATE_KEY: 'PROPERTY_MANAGER_PRIVATE_KEY',
  DEPLOYER_PRIVATE_KEY: 'DEPLOYER_PRIVATE_KEY',
  
  // 钱包配置
  WALLET_PRIVATE_KEY: 'WALLET_PRIVATE_KEY',
  WALLET_MNEMONIC: 'WALLET_MNEMONIC',
  WALLET_PATH: 'WALLET_PATH',
  
  // 合约配置前缀和后缀
  CONTRACT_ADDRESS_PREFIX: 'CONTRACT_',
  CONTRACT_ADDRESS_SUFFIX: '_ADDRESS',
  
  // API配置
  API_KEY: 'API_KEY',
  
  // 服务器配置
  PORT: 'PORT',
  HOST: 'HOST',
  
  // 模拟区块链配置
  MOCK_BLOCKCHAIN: 'MOCK_BLOCKCHAIN',
  
  // 日志配置
  LOG_CONSOLE: 'LOG_CONSOLE',
  MAX_LOG_SIZE: 'MAX_LOG_SIZE',
  MAX_LOG_FILES: 'MAX_LOG_FILES',
  
  // 合约地址前缀和后缀
  CONTRACT_ADDRESS_PREFIX: 'CONTRACT_',
  CONTRACT_ADDRESS_SUFFIX: '_ADDRESS',
  
  // 私钥类型映射
  ADMIN_PRIVATE_KEY: 'ADMIN_PRIVATE_KEY',
  DEPLOYER_PRIVATE_KEY: 'DEPLOYER_PRIVATE_KEY',
  BLOCKCHAIN_PRIVATE_KEY: 'BLOCKCHAIN_PRIVATE_KEY',
  SERVICE_ACCOUNT_PRIVATE_KEY: 'SERVICE_ACCOUNT_PRIVATE_KEY',
  OPERATOR_PRIVATE_KEY: 'OPERATOR_PRIVATE_KEY',
  
  // API配置
  API_PORT: 'API_PORT',
  API_HOST: 'API_HOST',
  
  // 服务器配置
  SERVER_PORT: 'SERVER_PORT',
  SERVER_HOST: 'SERVER_HOST',
  
  // 路径配置
  PROJECT_PATH: 'PROJECT_PATH'
};

/**
 * 私钥类型映射
 */
const KEY_TYPES = {
  ADMIN: ENV_KEYS.ADMIN_PRIVATE_KEY,
  DEPLOYER: ENV_KEYS.DEPLOYER_PRIVATE_KEY,
  SERVICE: ENV_KEYS.SERVICE_ACCOUNT_PRIVATE_KEY,
  OPERATOR: ENV_KEYS.OPERATOR_PRIVATE_KEY,
  DEFAULT: ENV_KEYS.BLOCKCHAIN_PRIVATE_KEY
};

/**
 * 环境变量配置类
 */
class EnvConfig {
  /**
   * 默认配置
   * @private
   */
  static _defaultConfig = {
    // 环境配置
    [ENV_KEYS.NODE_ENV]: 'development',
    [ENV_KEYS.BLOCKCHAIN_NETWORK]: 'localhost',

    // 日志配置
    [ENV_KEYS.LOG_LEVEL]: 'debug',
    [ENV_KEYS.LOG_DIR]: 'logs',

    // Chain IDs
    [ENV_KEYS.HARDHAT_CHAIN_ID]: '31337',
    [ENV_KEYS.LOCALHOST_CHAIN_ID]: '31337',
    [ENV_KEYS.TESTNET_CHAIN_ID]: '11155111',
    [ENV_KEYS.MAINNET_CHAIN_ID]: '1',

    // RPC URLs
    [ENV_KEYS.LOCALHOST_RPC_URL]: 'http://localhost:8545',
    
    // Gas配置
    [ENV_KEYS.GAS_LIMIT]: '3000000',
    [ENV_KEYS.GAS_PRICE]: 'auto',
    [ENV_KEYS.REPORT_GAS]: 'true'
  };

  /**
   * 是否已初始化标志
   * @private
   */
  static _initialized = false;

  /**
   * 检查是否已初始化
   * @returns {boolean} 是否已初始化
   */
  static isInitialized() {
    return this._initialized;
  }

  /**
   * 加载环境变量
   * @returns {Object} 环境变量配置
   */
  static load() {
    try {
      console.log('加载环境配置...');
      // 记录PROJECT_PATH的初始值
      console.log('加载前PROJECT_PATH值:', process.env[ENV_KEYS.PROJECT_PATH]);
            
      // 确保网络类型配置存在
      const networkType = process.env[ENV_KEYS.BLOCKCHAIN_NETWORK];
      if (!networkType) {
        console.warn('警告: 未设置BLOCKCHAIN_NETWORK环境变量，将使用默认网络类型(localhost)');
        process.env[ENV_KEYS.BLOCKCHAIN_NETWORK] = 'localhost';
      }
            
      // 确保日志目录配置存在
      if (!process.env[ENV_KEYS.LOG_DIR]) {
        console.warn('警告: 未设置LOG_DIR环境变量，将使用默认日志目录(logs)');
        process.env[ENV_KEYS.LOG_DIR] = 'logs';
      }
            
      // 检查PROJECT_PATH是否存在，确保以'/'结尾
      if (process.env[ENV_KEYS.PROJECT_PATH]) {
        // 确保PROJECT_PATH路径以'/'结尾
        if (!process.env[ENV_KEYS.PROJECT_PATH].endsWith('/')) {
          process.env[ENV_KEYS.PROJECT_PATH] += '/';
          console.log('已修正PROJECT_PATH末尾添加斜杠:', process.env[ENV_KEYS.PROJECT_PATH]);
        }
      } else {
        console.warn('警告: 未设置PROJECT_PATH环境变量，某些功能可能无法正常工作');
      }

      // 打印最终的PROJECT_PATH
      console.log('最终的PROJECT_PATH值:', process.env[ENV_KEYS.PROJECT_PATH]);
      
      console.log('环境配置加载成功');
      return true;
    } catch (error) {
      console.error('加载环境配置失败:', error.message);
      return false;
    }
  }

  /**
   * 设置环境变量
   * @param {string} key - 环境变量名
   * @param {string} value - 环境变量值
   */
  static setEnv(key, value) {
    if (!key) {
      throw new ConfigError('环境变量名不能为空');
    }
    process.env[key] = value;
  }

  /**
   * 验证必需的环境变量
   * @private
   * @param {Object} config - 配置对象
   */
  static _validateRequiredEnv(config) {
    const requiredEnv = [
      ENV_KEYS.BLOCKCHAIN_NETWORK,
      ENV_KEYS.ADMIN_PRIVATE_KEY,
      ENV_KEYS.MANAGER_PRIVATE_KEY,
      ENV_KEYS.OPERATOR_PRIVATE_KEY
    ];

    for (const env of requiredEnv) {
      if (!config[env]) {
        throw new ConfigError(`缺少必需的环境变量: ${env}`);
      }
    }

    // 验证网络类型
    const validNetworks = ['localhost', 'testnet', 'mainnet'];
    if (!validNetworks.includes(config[ENV_KEYS.BLOCKCHAIN_NETWORK])) {
      throw new ConfigError(`无效的网络类型: ${config[ENV_KEYS.BLOCKCHAIN_NETWORK]}`);
    }

    // 验证私钥格式
    if (!validation.isValidPrivateKey(config[ENV_KEYS.ADMIN_PRIVATE_KEY])) {
      throw new ConfigError('无效的管理员私钥格式');
    }
    if (!validation.isValidPrivateKey(config[ENV_KEYS.MANAGER_PRIVATE_KEY])) {
      throw new ConfigError('无效的管理者私钥格式');
    }
    if (!validation.isValidPrivateKey(config[ENV_KEYS.OPERATOR_PRIVATE_KEY])) {
      throw new ConfigError('无效的操作者私钥格式');
    }
  }

  /**
   * 转换配置类型
   * @private
   * @param {Object} config - 配置对象
   * @returns {Object} 转换后的配置对象
   */
  static _convertConfigTypes(config) {
    return {
      ...config,
      [ENV_KEYS.HARDHAT_CHAIN_ID]: parseInt(config[ENV_KEYS.HARDHAT_CHAIN_ID]),
      [ENV_KEYS.LOCALHOST_CHAIN_ID]: parseInt(config[ENV_KEYS.LOCALHOST_CHAIN_ID]),
      [ENV_KEYS.TESTNET_CHAIN_ID]: parseInt(config[ENV_KEYS.TESTNET_CHAIN_ID]),
      [ENV_KEYS.MAINNET_CHAIN_ID]: parseInt(config[ENV_KEYS.MAINNET_CHAIN_ID]),
      [ENV_KEYS.REPORT_GAS]: config[ENV_KEYS.REPORT_GAS] === 'true'
    };
  }

  /**
   * 获取默认配置
   * @returns {Object} 默认配置
   */
  static getDefaultConfig() {
    return { ...this._defaultConfig };
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  static updateConfig(newConfig) {
    Object.assign(process.env, newConfig);
  }

  /**
   * 获取网络类型
   * @returns {string} 网络类型
   */
  static getNetworkType() {
    const networkType = process.env[ENV_KEYS.BLOCKCHAIN_NETWORK]?.toLowerCase();
    
    // 处理空值或无效网络类型
    if (!networkType || !['localhost', 'testnet', 'mainnet'].includes(networkType)) {
      console.warn(`未知的网络类型: ${networkType}，将使用localhost`);
      return 'localhost';
    }
    
    // 统一将local返回为localhost
    return networkType === 'local' ? 'localhost' : networkType;
  }

  /**
   * 获取网络配置
   * @returns {Object} 网络配置
   */
  static getNetworkConfig() {
    const networkType = this.getNetworkType();
    
    // 检查是否有全局RPC_URL配置，如果有则优先使用
    const globalRpcUrl = process.env[ENV_KEYS.RPC_URL];
    
    const config = {
      localhost: {
        rpcUrl: globalRpcUrl || process.env[ENV_KEYS.LOCALHOST_RPC_URL] || 'http://localhost:8545',
        chainId: parseInt(process.env[ENV_KEYS.LOCALHOST_CHAIN_ID] || '31337'),
        name: 'Localhost Network'
      },
      testnet: {
        rpcUrl: globalRpcUrl || process.env[ENV_KEYS.TESTNET_RPC_URL],
        chainId: parseInt(process.env[ENV_KEYS.TESTNET_CHAIN_ID]),
        name: 'Test Network'
      },
      mainnet: {
        rpcUrl: globalRpcUrl || process.env[ENV_KEYS.MAINNET_RPC_URL],
        chainId: parseInt(process.env[ENV_KEYS.MAINNET_CHAIN_ID]),
        name: 'Main Network'
      }
    };

    // 如果未找到指定网络类型，使用本地网络配置
    if (!config[networkType]) {
      console.warn(`未知的网络类型: ${networkType}，将使用localhost配置`);
      return config.localhost;
    }

    if (!config[networkType].rpcUrl || !config[networkType].chainId) {
      throw new ConfigError(`${networkType}网络配置不完整`);
    }

    return config[networkType];
  }

  /**
   * 获取环境变量值
   * @param {string} keyName - 环境变量名称
   * @param {*} [defaultValue=null] - 默认值（当环境变量不存在时返回）
   * @returns {string|null} 环境变量值，如不存在且未提供默认值则返回null
   */
  static getEnv(keyName, defaultValue = null) {
    if (!keyName) return defaultValue;
    return process.env[keyName] || defaultValue;
  }

  /**
   * 获取钱包配置
   * @returns {Object} 钱包配置
   */
  static getWalletConfig() {
    return {
      [ENV_KEYS.WALLET_PRIVATE_KEY]: process.env[ENV_KEYS.WALLET_PRIVATE_KEY],
      [ENV_KEYS.WALLET_MNEMONIC]: process.env[ENV_KEYS.WALLET_MNEMONIC],
      [ENV_KEYS.WALLET_PATH]: process.env[ENV_KEYS.WALLET_PATH] || "m/44'/60'/0'/0/0"
    };
  }

  /**
   * 获取日志配置
   * @returns {Object} 日志配置
   */
  static getLoggerConfig() {
    return {
      level: this.getEnv(ENV_KEYS.LOG_LEVEL, 'info'),
      dir: this.getEnv(ENV_KEYS.LOG_DIR, 'logs'),
      maxSize: parseInt(this.getEnv('MAX_LOG_SIZE', (10 * 1024 * 1024).toString())),
      maxFiles: parseInt(this.getEnv('MAX_LOG_FILES', '5')),
      console: this.getEnv('LOG_CONSOLE', 'true') === 'true'
    };
  }

  /**
   * 获取私钥
   * @param {string} keyType - 私钥类型
   * @returns {string} 私钥
   * @throws {ConfigError} 配置错误
   */
  static getPrivateKey(keyType) {
    const envKey = KEY_TYPES[keyType.toUpperCase()];
    if (!envKey) {
      throw new ConfigError(`未知的私钥类型: ${keyType}`);
    }
    
    const privateKey = process.env[envKey];
    if (!privateKey) {
      throw new ConfigError(`未设置${keyType}私钥`);
    }
    
    return privateKey;
  }

  /**
   * 获取所有可用的私钥
   * @returns {Object} 私钥映射表 {keyType: privateKey}
   */
  static getAllPrivateKeys() {
    const privateKeys = {};
    
    Object.keys(KEY_TYPES).forEach(keyType => {
      try {
        const privateKey = this.getPrivateKey(keyType);
        privateKeys[keyType] = privateKey;
      } catch (error) {
        // 忽略不存在的私钥
        console.debug(`私钥${keyType}不存在: ${error.message}`);
      }
    });
    
    return privateKeys;
  }

  /**
   * 获取所有环境变量
   * @returns {Object} 环境变量
   */
  static getAllEnv() {
    // 返回process.env的浅拷贝，避免直接返回引用
    return { ...process.env };
  }

  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称
   * @returns {string} 合约地址
   */
  static getContractAddress(contractName) {
    if (!contractName) {
      throw new ConfigError('合约名称不能为空');
    }

    // 构造环境变量键名
    const key = `${ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${contractName}${ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
    const address = this.getEnv(key);
    
    if (!address) {
      throw new ConfigError(`合约 ${contractName} 的地址未配置，请检查环境变量: ${key}`);
    }
    
    return address;
  }
}

// 导出常量和类
module.exports = EnvConfig;
module.exports.ENV_KEYS = ENV_KEYS;
module.exports.KEY_TYPES = KEY_TYPES; 