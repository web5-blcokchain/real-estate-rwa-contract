const dotenv = require('dotenv');
const path = require('path');
const { EnvError } = require('./errors');
const validation = require('./validation');

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
  HOST: 'HOST'
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
   * 加载环境变量
   * @returns {Object} 环境变量配置
   */
  static load() {
    try {
      // 加载.env文件
      dotenv.config();

      // 合并默认配置
      const config = { ...this._defaultConfig, ...process.env };

      // 验证必需的环境变量
      this._validateRequiredEnv(config);

      // 转换配置类型
      return this._convertConfigTypes(config);
    } catch (error) {
      throw new EnvError(`加载环境变量失败: ${error.message}`);
    }
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
        throw new EnvError(`缺少必需的环境变量: ${env}`);
      }
    }

    // 验证网络类型
    const validNetworks = ['localhost', 'testnet', 'mainnet'];
    if (!validNetworks.includes(config[ENV_KEYS.BLOCKCHAIN_NETWORK])) {
      throw new EnvError(`无效的网络类型: ${config[ENV_KEYS.BLOCKCHAIN_NETWORK]}`);
    }

    // 验证私钥格式
    if (!validation.isValidPrivateKey(config[ENV_KEYS.ADMIN_PRIVATE_KEY])) {
      throw new EnvError('无效的管理员私钥格式');
    }
    if (!validation.isValidPrivateKey(config[ENV_KEYS.MANAGER_PRIVATE_KEY])) {
      throw new EnvError('无效的管理者私钥格式');
    }
    if (!validation.isValidPrivateKey(config[ENV_KEYS.OPERATOR_PRIVATE_KEY])) {
      throw new EnvError('无效的操作者私钥格式');
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
      throw new EnvError(`${networkType}网络配置不完整`);
    }

    return config[networkType];
  }

  /**
   * 获取管理员私钥
   * @returns {string} 管理员私钥
   */
  static getAdminPrivateKey() {
    const privateKey = process.env[ENV_KEYS.ADMIN_PRIVATE_KEY];
    if (!privateKey) {
      throw new EnvError('管理员私钥未配置');
    }
    return privateKey;
  }

  /**
   * 获取合约管理员私钥
   * @returns {string} 合约管理员私钥
   */
  static getContractManagerPrivateKey() {
    const privateKey = process.env[ENV_KEYS.CONTRACT_MANAGER_PRIVATE_KEY];
    if (!privateKey) {
      throw new EnvError('合约管理员私钥未配置');
    }
    return privateKey;
  }

  /**
   * 获取合约配置
   * @param {string} [contractName] - 合约名称
   * @returns {Object} 合约配置
   */
  static getContractConfig(contractName) {
    try {
      // 如果没有指定合约名称，抛出错误
      if (!contractName) {
        throw new EnvError('合约名称不能为空');
      }

      // 获取指定合约的配置
      const prefix = ENV_KEYS.CONTRACT_ADDRESS_PREFIX;
      const suffix = ENV_KEYS.CONTRACT_ADDRESS_SUFFIX;
      const addressKey = `${prefix}${contractName.toUpperCase()}${suffix}`;
      const abiKey = `${addressKey}_ABI`;
      
      const address = process.env[addressKey];
      const abi = process.env[abiKey];

      if (!address) {
        throw new EnvError(`合约 ${contractName} 地址未配置`);
      }

      if (!abi) {
        throw new EnvError(`合约 ${contractName} ABI未配置`);
      }

      try {
        return {
          address,
          abi: JSON.parse(abi)
        };
      } catch (e) {
        throw new EnvError(`合约 ${contractName} ABI格式无效: ${e.message}`);
      }
    } catch (error) {
      throw new EnvError(`获取合约配置失败: ${error.message}`);
    }
  }

  /**
   * 获取物业管理员私钥
   * @returns {string} 物业管理员私钥
   */
  static getPropertyManagerPrivateKey() {
    const privateKey = process.env[ENV_KEYS.PROPERTY_MANAGER_PRIVATE_KEY];
    if (!privateKey) {
      throw new EnvError('物业管理员私钥未配置');
    }
    return privateKey;
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
   * @param {string} keyType - 私钥类型，例如：'ADMIN', 'MANAGER', 'OPERATOR'等
   * @returns {string} 私钥
   */
  static getPrivateKey(keyType) {
    if (!keyType) {
      throw new EnvError('私钥类型不能为空');
    }
    
    // 构造环境变量键名
    const envKey = `${keyType.toUpperCase()}_PRIVATE_KEY`;
    const privateKey = process.env[envKey];
    
    if (!privateKey) {
      throw new EnvError(`${keyType}私钥未配置`);
    }
    
    return privateKey;
  }

  /**
   * 获取所有环境变量
   * @returns {Object} 所有环境变量的键值对
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
      throw new EnvError('合约名称不能为空');
    }

    // 构造环境变量键名
    const key = `${ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${contractName}${ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
    const address = this.getEnv(key);
    
    if (!address) {
      throw new EnvError(`合约 ${contractName} 的地址未配置，请检查环境变量: ${key}`);
    }
    
    return address;
  }
}

// 导出常量和类
module.exports = EnvConfig;
module.exports.ENV_KEYS = ENV_KEYS; 