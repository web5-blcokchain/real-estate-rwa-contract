const dotenv = require('dotenv');
const path = require('path');
const { ConfigError } = require('../utils/errors');

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
    NODE_ENV: 'development',
    BLOCKCHAIN_NETWORK: 'localhost',

    // 日志配置
    LOG_LEVEL: 'debug',
    LOG_DIR: 'logs',

    // Chain IDs
    HARDHAT_CHAIN_ID: '31337',
    LOCALHOST_CHAIN_ID: '31337',
    TESTNET_CHAIN_ID: '11155111',
    MAINNET_CHAIN_ID: '1',

    // RPC URLs
    LOCALHOST_RPC_URL: 'http://localhost:8545',
    
    // Gas配置
    GAS_LIMIT: '3000000',
    GAS_PRICE: 'auto',
    REPORT_GAS: 'true'
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
      throw new ConfigError(`加载环境变量失败: ${error.message}`);
    }
  }

  /**
   * 验证必需的环境变量
   * @private
   * @param {Object} config - 配置对象
   */
  static _validateRequiredEnv(config) {
    const requiredEnv = [
      'BLOCKCHAIN_NETWORK',
      'ADMIN_PRIVATE_KEY',
      'MANAGER_PRIVATE_KEY',
      'OPERATOR_PRIVATE_KEY'
    ];

    for (const env of requiredEnv) {
      if (!config[env]) {
        throw new ConfigError(`缺少必需的环境变量: ${env}`);
      }
    }

    // 验证网络类型
    const validNetworks = ['localhost', 'testnet', 'mainnet'];
    if (!validNetworks.includes(config.BLOCKCHAIN_NETWORK)) {
      throw new ConfigError(`无效的网络类型: ${config.BLOCKCHAIN_NETWORK}`);
    }

    // 验证私钥格式
    const isValidPrivateKey = (key) => {
      if (!key) return false;
      const cleanKey = key.replace('0x', '');
      return /^[0-9a-fA-F]{64}$/.test(cleanKey);
    };

    if (!isValidPrivateKey(config.ADMIN_PRIVATE_KEY)) {
      throw new ConfigError('无效的管理员私钥格式');
    }
    if (!isValidPrivateKey(config.MANAGER_PRIVATE_KEY)) {
      throw new ConfigError('无效的管理者私钥格式');
    }
    if (!isValidPrivateKey(config.OPERATOR_PRIVATE_KEY)) {
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
      HARDHAT_CHAIN_ID: parseInt(config.HARDHAT_CHAIN_ID),
      LOCALHOST_CHAIN_ID: parseInt(config.LOCALHOST_CHAIN_ID),
      TESTNET_CHAIN_ID: parseInt(config.TESTNET_CHAIN_ID),
      MAINNET_CHAIN_ID: parseInt(config.MAINNET_CHAIN_ID),
      REPORT_GAS: config.REPORT_GAS === 'true'
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
   * @returns {string} 网络类型 (local|testnet|mainnet)
   */
  static getNetworkType() {
    const networkType = process.env.NETWORK_TYPE?.toLowerCase();
    if (!networkType || !['local', 'testnet', 'mainnet'].includes(networkType)) {
      throw new ConfigError('无效的网络类型配置');
    }
    return networkType;
  }

  /**
   * 获取网络配置
   * @returns {Object} 网络配置
   */
  static getNetworkConfig() {
    const networkType = this.getNetworkType();
    const config = {
      local: {
        rpcUrl: process.env.LOCAL_RPC_URL,
        chainId: parseInt(process.env.LOCAL_CHAIN_ID),
        name: 'Local Network'
      },
      testnet: {
        rpcUrl: process.env.TESTNET_RPC_URL,
        chainId: parseInt(process.env.TESTNET_CHAIN_ID),
        name: 'Test Network'
      },
      mainnet: {
        rpcUrl: process.env.MAINNET_RPC_URL,
        chainId: parseInt(process.env.MAINNET_CHAIN_ID),
        name: 'Main Network'
      }
    };

    if (!config[networkType].rpcUrl || !config[networkType].chainId) {
      throw new ConfigError(`${networkType}网络配置不完整`);
    }

    return config[networkType];
  }

  /**
   * 获取管理员私钥
   * @returns {string} 管理员私钥
   */
  static getAdminPrivateKey() {
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new ConfigError('管理员私钥未配置');
    }
    return privateKey;
  }

  /**
   * 获取合约管理员私钥
   * @returns {string} 合约管理员私钥
   */
  static getContractManagerPrivateKey() {
    const privateKey = process.env.CONTRACT_MANAGER_PRIVATE_KEY;
    if (!privateKey) {
      throw new ConfigError('合约管理员私钥未配置');
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
      // 如果没有指定合约名称，返回默认合约配置
      if (!contractName) {
        return {
          address: process.env.DEFAULT_CONTRACT_ADDRESS,
          abi: JSON.parse(process.env.DEFAULT_CONTRACT_ABI || '[]')
        };
      }

      // 获取指定合约的配置
      const address = process.env[`${contractName.toUpperCase()}_CONTRACT_ADDRESS`];
      const abi = process.env[`${contractName.toUpperCase()}_CONTRACT_ABI`];

      if (!address || !abi) {
        throw new ConfigError(`合约 ${contractName} 配置不完整`);
      }

      return {
        address,
        abi: JSON.parse(abi)
      };
    } catch (error) {
      throw new ConfigError(`获取合约配置失败: ${error.message}`);
    }
  }

  /**
   * 获取物业管理员私钥
   * @returns {string} 物业管理员私钥
   */
  static getPropertyManagerPrivateKey() {
    const privateKey = process.env.PROPERTY_MANAGER_PRIVATE_KEY;
    if (!privateKey) {
      throw new ConfigError('物业管理员私钥未配置');
    }
    return privateKey;
  }

  /**
   * 获取钱包配置
   * @returns {Object} 钱包配置
   */
  static getWalletConfig() {
    return {
      WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
      WALLET_MNEMONIC: process.env.WALLET_MNEMONIC,
      WALLET_PATH: process.env.WALLET_PATH || "m/44'/60'/0'/0/0"
    };
  }

  /**
   * 获取日志配置
   * @returns {Object} 日志配置
   */
  static getLoggerConfig() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      dir: path.join(process.cwd(), 'logs'),
      filename: 'blockchain.log'
    };
  }
}

module.exports = EnvConfig; 