/**
 * 服务器配置模块
 */
const fs = require('fs');
const path = require('path');
const { Logger } = require('../../../shared/src/utils');

// 配置缓存
let configCache = null;

/**
 * 服务器配置
 */
const serverConfig = {
  /**
   * 验证配置
   */
  validateConfig() {
    try {
      // 验证环境变量
      if (!process.env.PORT) {
        Logger.warn('未设置PORT环境变量，使用默认值3000');
      }

      if (!process.env.HOST) {
        Logger.warn('未设置HOST环境变量，使用默认值localhost');
      }

      if (!process.env.API_KEY) {
        Logger.warn('未设置API_KEY环境变量，API将不受保护');
      }

      // 验证当前工作目录中的HTTPS证书文件（如果启用HTTPS）
      if (process.env.USE_HTTPS === 'true') {
        if (!process.env.SSL_CERT_PATH || !process.env.SSL_KEY_PATH) {
          throw new Error('启用HTTPS但未设置SSL_CERT_PATH或SSL_KEY_PATH');
        }

        if (!fs.existsSync(process.env.SSL_CERT_PATH)) {
          throw new Error(`SSL证书文件不存在: ${process.env.SSL_CERT_PATH}`);
        }

        if (!fs.existsSync(process.env.SSL_KEY_PATH)) {
          throw new Error(`SSL密钥文件不存在: ${process.env.SSL_KEY_PATH}`);
        }
      }

      return true;
    } catch (error) {
      Logger.error(`配置验证失败: ${error.message}`);
      throw error;
    }
  },

  /**
   * 获取API配置
   * @returns {Object} API配置
   */
  getApiConfig() {
    return {
      port: process.env.PORT || 3000,
      host: process.env.HOST || 'localhost',
      basePath: process.env.API_BASE_PATH || '/api/v1',
      swaggerPath: process.env.SWAGGER_PATH || '/api-docs',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      useHttps: process.env.USE_HTTPS === 'true',
      apiKey: process.env.API_KEY,
      requiresAuth: process.env.REQUIRES_AUTH !== 'false'
    };
  },

  /**
   * 获取区块链配置
   * @returns {Object} 区块链配置
   */
  getBlockchainConfig() {
    return {
      networkType: process.env.BLOCKCHAIN_NETWORK || 'localhost',
      gasLimit: process.env.GAS_LIMIT || '3000000',
      gasPrice: process.env.GAS_PRICE || 'auto',
      confirmations: parseInt(process.env.CONFIRMATIONS || '1', 10)
    };
  },

  /**
   * 获取日志配置
   * @returns {Object} 日志配置
   */
  getLogConfig() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      directory: process.env.LOG_DIR || 'logs',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d'
    };
  },

  /**
   * 获取认证配置
   * @returns {Object} 认证配置
   */
  getAuthConfig() {
    return {
      apiKey: process.env.API_KEY || 'default-api-key',
      requireAuth: process.env.API_REQUIRE_AUTH !== 'false' // 默认启用认证
    };
  },

  /**
   * 获取合约地址
   * @returns {Object} 合约地址映射
   */
  getContractAddresses() {
    const addresses = {};
    
    // 遍历环境变量，查找合约地址
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(/^CONTRACT_([A-Z0-9_]+)_ADDRESS$/);
      if (match) {
        const contractName = match[1];
        addresses[contractName] = value;
      }
    }
    
    return addresses;
  }
};

module.exports = serverConfig; 