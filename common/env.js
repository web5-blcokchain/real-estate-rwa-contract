const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Logger = require('./logger');
const Paths = require('./paths');

// 加载环境变量
dotenv.config({ path: path.join(Paths.ROOT, '.env') });

/**
 * 环境变量键名常量
 * 用于统一管理所有环境变量的键名
 */
const ENV_KEYS = {
  // 系统配置
  NODE_ENV: 'NODE_ENV',
  
  // 区块链网络配置
  BLOCKCHAIN_NETWORK: 'BLOCKCHAIN_NETWORK',
  
  // 服务器配置
  PORT: 'PORT',
  HOST: 'HOST',
  API_KEY: 'API_KEY',
  
  // 角色私钥配置
  ADMIN_PRIVATE_KEY: 'ADMIN_PRIVATE_KEY',
  MANAGER_PRIVATE_KEY: 'MANAGER_PRIVATE_KEY',
  OPERATOR_PRIVATE_KEY: 'OPERATOR_PRIVATE_KEY',
  
  // 合约地址配置
  CONTRACT_REALESTATEFACADE_ADDRESS: 'CONTRACT_REALESTATEFACADE_ADDRESS',
  CONTRACT_PROPERTYMANAGER_ADDRESS: 'CONTRACT_PROPERTYMANAGER_ADDRESS',
  CONTRACT_PROPERTYTOKEN_ADDRESS: 'CONTRACT_PROPERTYTOKEN_ADDRESS',
  CONTRACT_TRADING_ADDRESS: 'CONTRACT_TRADING_ADDRESS',
  CONTRACT_REWARD_ADDRESS: 'CONTRACT_REWARD_ADDRESS',
  CONTRACT_ROLE_ADDRESS: 'CONTRACT_ROLE_ADDRESS',
  CONTRACT_TRADINGMANAGER_ADDRESS: 'CONTRACT_TRADINGMANAGER_ADDRESS',
  CONTRACT_REWARDMANAGER_ADDRESS: 'CONTRACT_REWARDMANAGER_ADDRESS',
  
  // 日志配置
  LOG_LEVEL: 'LOG_LEVEL',
  LOG_FORMAT: 'LOG_FORMAT'
};

/**
 * 环境变量工具类
 */
class EnvUtils {
  /**
   * 获取环境变量值
   * @param {string} key - 环境变量键名
   * @param {string|number|boolean|Array|Object} [defaultValue] - 默认值
   * @param {string} [type='string'] - 值类型：string|number|boolean|array|json
   * @returns {string|number|boolean|Array|Object} 环境变量值
   */
  static get(key, defaultValue = '', type = 'string') {
    const value = process.env[key];

    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    // 根据指定类型转换值
    switch (type.toLowerCase()) {
      case 'number':
        return Number(value);
      
      case 'boolean':
        return value === 'true' || value === '1';
      
      case 'array':
        try {
          return value.split(',').map(item => item.trim());
        } catch (error) {
          Logger.warn(`环境变量${key}解析为数组失败，返回默认值`, { error: error.message });
          return defaultValue;
        }
      
      case 'json':
        try {
          return JSON.parse(value);
        } catch (error) {
          Logger.warn(`环境变量${key}解析为JSON失败，返回默认值`, { error: error.message });
          return defaultValue;
        }
      
      case 'string':
      default:
        return value;
    }
  }

  /**
   * 获取字符串类型的环境变量
   * @param {string} key - 环境变量键名
   * @param {string} [defaultValue=''] - 默认值
   * @returns {string} 环境变量值
   */
  static getString(key, defaultValue = '') {
    return this.get(key, defaultValue, 'string');
  }

  /**
   * 获取数字类型的环境变量
   * @param {string} key - 环境变量键名
   * @param {number} [defaultValue=0] - 默认值
   * @returns {number} 环境变量值
   */
  static getNumber(key, defaultValue = 0) {
    return this.get(key, defaultValue, 'number');
  }

  /**
   * 获取布尔类型的环境变量
   * @param {string} key - 环境变量键名
   * @param {boolean} [defaultValue=false] - 默认值
   * @returns {boolean} 环境变量值
   */
  static getBoolean(key, defaultValue = false) {
    return this.get(key, defaultValue, 'boolean');
  }

  /**
   * 获取数组类型的环境变量
   * @param {string} key - 环境变量键名
   * @param {Array} [defaultValue=[]] - 默认值
   * @returns {Array} 环境变量值
   */
  static getArray(key, defaultValue = []) {
    return this.get(key, defaultValue, 'array');
  }

  /**
   * 获取JSON类型的环境变量
   * @param {string} key - 环境变量键名
   * @param {Object} [defaultValue={}] - 默认值
   * @returns {Object} 环境变量值
   */
  static getJson(key, defaultValue = {}) {
    return this.get(key, defaultValue, 'json');
  }

  /**
   * 获取当前区块链网络名称
   * @returns {string} 网络名称
   */
  static getCurrentNetwork() {
    return this.getString(ENV_KEYS.BLOCKCHAIN_NETWORK, 'hardhat');
  }

  /**
   * 获取网络配置
   * @param {string} [network] - 网络名称，不传则使用当前网络
   * @returns {Object} 网络配置对象
   */
  static getNetworkConfig(network) {
    const currentNetwork = network || this.getCurrentNetwork();
    
    // 获取当前网络下的角色私钥
    const adminPrivateKey = this.getString(ENV_KEYS.ADMIN_PRIVATE_KEY, '');
    const managerPrivateKey = this.getString(ENV_KEYS.MANAGER_PRIVATE_KEY, '');
    const operatorPrivateKey = this.getString(ENV_KEYS.OPERATOR_PRIVATE_KEY, '');
    

    // 网络配置映射
    const networks = {
      // 本地开发网络
      hardhat: {
        name: 'hardhat',
        chainId: 31337,
        rpcUrl: 'http://127.0.0.1:8545',
        // 为不同角色配置私钥
        privateKeys: {
          admin: adminPrivateKey || '', // hardhat默认账户0私钥
          manager: managerPrivateKey || '', // hardhat默认账户1私钥
          operator: operatorPrivateKey || '', // hardhat默认账户2私钥
        },
        // 默认角色的私钥（向后兼容）
        privateKey: adminPrivateKey || '',
        explorer: ''
      },
      
      localhost: {
        name: 'localhost',
        chainId: 31337,
        rpcUrl: 'http://127.0.0.1:8545',
        // 为不同角色配置私钥
        privateKeys: {
          admin: adminPrivateKey || '',
          manager: managerPrivateKey || '',
          operator: operatorPrivateKey || '',
        },
        privateKey: adminPrivateKey || '',
        explorer: ''
      },
      
      // 测试网络
      testnet: {
        name: 'testnet',
        chainId: 11155111,
        rpcUrl: this.getString('TESTNET_RPC_URL', 'https://rpc.sepolia.org'),
        // 为不同角色配置私钥
        privateKeys: {
          admin: adminPrivateKey || '',
          manager: managerPrivateKey || '',
          operator: operatorPrivateKey || '',
        },
        privateKey: adminPrivateKey || '',
        explorer: 'https://sepolia.etherscan.io'
      },
      
      // 主网
      mainnet: {
        name: 'mainnet',
        chainId: 1,
        rpcUrl: this.getString('MAINNET_RPC_URL', 'https://mainnet.infura.io/v3/your-api-key'),
        // 为不同角色配置私钥
        privateKeys: {
          admin: adminPrivateKey || '',
          manager: managerPrivateKey || '',
          operator: operatorPrivateKey || '',
        },
        privateKey: adminPrivateKey || '',
        explorer: 'https://etherscan.io'
      }
    };
    
    // 返回指定网络配置，如果不存在则返回hardhat配置
    return networks[currentNetwork] || networks.hardhat;
  }

  /**
   * 获取服务器端口号
   * @returns {number} 端口号
   */
  static getPort() {
    return this.getNumber(ENV_KEYS.PORT, 3000);
  }

  /**
   * 获取服务器主机地址
   * @returns {string} 主机地址
   */
  static getHost() {
    return this.getString(ENV_KEYS.HOST, 'localhost');
  }

  /**
   * 获取API密钥
   * @returns {string} API密钥
   */
  static getApiKey() {
    return this.getString(ENV_KEYS.API_KEY, '');
  }

  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称，不含Controller后缀
   * @returns {string} 合约地址
   */
  static getContractAddress(contractName) {
    if (!contractName) {
      throw new Error('合约名称不能为空');
    }
    
    // 转换为大写并移除非字母数字字符，用于构建环境变量键名
    const normalizedName = contractName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const envKey = `CONTRACT_${normalizedName}_ADDRESS`;
    
    // 检查是否存在于ENV_KEYS中
    const isDefinedKey = Object.values(ENV_KEYS).includes(envKey);
    if (!isDefinedKey) {
      Logger.warn(`合约地址环境变量 ${envKey} 未在ENV_KEYS中定义`);
    }
    
    return this.getString(envKey, '');
  }

  /**
   * 检查是否是开发环境
   * @returns {boolean} 是否是开发环境
   */
  static isDevelopment() {
    return this.getString(ENV_KEYS.NODE_ENV, 'development') === 'development';
  }

  /**
   * 检查是否是生产环境
   * @returns {boolean} 是否是生产环境
   */
  static isProduction() {
    return this.getString(ENV_KEYS.NODE_ENV, 'development') === 'production';
  }

  /**
   * 检查是否是测试环境
   * @returns {boolean} 是否是测试环境
   */
  static isTest() {
    return this.getString(ENV_KEYS.NODE_ENV, 'development') === 'test';
  }

  /**
   * 获取日志级别
   * @returns {string} 日志级别
   */
  static getLogLevel() {
    return this.getString(ENV_KEYS.LOG_LEVEL, 'info');
  }

  /**
   * 获取日志格式
   * @returns {string} 日志格式
   */
  static getLogFormat() {
    return this.getString(ENV_KEYS.LOG_FORMAT, 'json');
  }
}

module.exports = EnvUtils; 