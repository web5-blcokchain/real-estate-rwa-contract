/**
 * 环境变量配置代理模块
 * 这个模块用于替代原始的env.js，将process.env的值直接暴露给依赖原始env.js的代码
 */

const dotenv = require('dotenv');
const path = require('path');

// 确保加载.env文件
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 环境变量键名常量
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
  
  // 路径配置
  PROJECT_PATH: 'PROJECT_PATH',
  
  // 合约配置前缀和后缀
  CONTRACT_ADDRESS_PREFIX: 'CONTRACT_',
  CONTRACT_ADDRESS_SUFFIX: '_ADDRESS',
};

/**
 * 环境变量配置类
 */
class EnvConfig {
  static _initialized = true;
  
  static isInitialized() {
    return this._initialized;
  }
  
  static load() {
    console.log('代理模块: env.js的load方法被调用');
    return true;
  }
  
  static getEnv(key) {
    return process.env[key];
  }
  
  static getAllEnv() {
    return process.env;
  }
  
  static setEnv(key, value) {
    process.env[key] = value;
  }
  
  static getNetworkType() {
    return process.env.BLOCKCHAIN_NETWORK || 'localhost';
  }
  
  static getNetworkConfig() {
    const networkType = this.getNetworkType();
    
    // 提供一个默认的网络配置
    const defaultConfig = {
      url: process.env.RPC_URL || 'http://localhost:8545',
      chainId: parseInt(process.env.HARDHAT_CHAIN_ID || '31337'),
      name: networkType
    };
    
    return defaultConfig;
  }
  
  static getContractInitParams() {
    return {
      trading: {
        tradingFeeRate: parseInt(process.env.TRADING_FEE_RATE || "100"), // 默认1%
        tradingFeeReceiver: process.env.TRADING_FEE_RECEIVER || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      },
      reward: {
        platformFeeRate: parseInt(process.env.PLATFORM_FEE_RATE || "500"), // 默认5%
        maintenanceFeeRate: parseInt(process.env.MAINTENANCE_FEE_RATE || "200"), // 默认2%
        rewardFeeReceiver: process.env.REWARD_FEE_RECEIVER || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        minDistributionThreshold: process.env.MIN_DISTRIBUTION_THRESHOLD || "0.01"
      },
      tokenFactory: {
        name: process.env.TOKEN_FACTORY_NAME || "Token Factory",
        symbol: process.env.TOKEN_FACTORY_SYMBOL || "TF",
        initialSupply: process.env.TOKEN_FACTORY_INITIAL_SUPPLY || "0"
      }
    };
  }
  
  static getPrivateKey(keyType = 'ADMIN') {
    const key = `${keyType.toUpperCase()}_PRIVATE_KEY`;
    return process.env[key];
  }
  
  static getAllPrivateKeys() {
    const keys = {};
    for (const key in process.env) {
      if (key.endsWith('_PRIVATE_KEY')) {
        const keyType = key.replace('_PRIVATE_KEY', '');
        keys[keyType] = process.env[key];
      }
    }
    return keys;
  }
}

// 将属性附加到EnvConfig类
EnvConfig.ENV_KEYS = ENV_KEYS;

// 为向后兼容，将一些常用变量也作为EnvConfig的属性
for (const key in process.env) {
  EnvConfig[key] = process.env[key];
}

module.exports = EnvConfig; 