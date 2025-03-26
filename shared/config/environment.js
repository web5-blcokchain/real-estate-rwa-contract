const dotenv = require('dotenv');
const { getEnvPath, validatePath } = require('../utils/paths');
const logger = require('../utils/logger');

// 存储验证状态
let initialized = false;

/**
 * 加载环境变量
 * @returns {boolean} 是否成功加载
 */
function loadEnvironment() {
  if (initialized) {
    return true;
  }
  
  try {
    const envPath = getEnvPath();
    if (!validatePath(envPath)) {
      logger.warn('No .env file found, using default environment variables');
      initialized = true;
      return false;
    }

    const result = dotenv.config({ path: envPath });
    if (result.error) {
      logger.warn('Error loading .env file:', result.error);
      return false;
    } else {
      logger.info('Environment variables loaded successfully');
      return true;
    }
  } catch (error) {
    logger.error('Failed to load environment variables:', error);
    throw error;
  }
}

/**
 * 环境变量验证
 * @returns {Array<string>} 缺失的环境变量列表，为空表示所有必需变量都存在
 */
function validateEnvironment() {
  const requiredEnvVars = [
    'DEPLOY_NETWORK',
    'ADMIN_PRIVATE_KEY',
    'OPERATOR_PRIVATE_KEY',
    'USER_PRIVATE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  return missingVars;
}

/**
 * 获取环境变量
 * @param {string} name 变量名
 * @param {*} defaultValue 默认值
 * @param {boolean} required 是否必需
 * @returns {*} 环境变量值
 * @throws {Error} 如果变量必需但未定义
 */
function getEnvVar(name, defaultValue = null, required = false) {
  const value = process.env[name];
  
  if (value === undefined) {
    if (required && defaultValue === null) {
      const error = new Error(`Required environment variable not found: ${name}`);
      logger.error(error.message);
      throw error;
    }
    
    if (defaultValue !== null) {
      logger.debug(`Using default value for ${name}: ${defaultValue}`);
    } else {
      logger.warn(`Environment variable not found: ${name}`);
    }
  }
  
  return value !== undefined ? value : defaultValue;
}

/**
 * 获取网络环境
 * @returns {string} 网络环境
 */
function getNetworkEnv() {
  return getEnvVar('DEPLOY_NETWORK', 'bsc_testnet');
}

/**
 * 获取私钥
 * @param {string} role 角色
 * @returns {string} 私钥
 */
function getPrivateKey(role) {
  const key = getEnvVar(`${role.toUpperCase()}_PRIVATE_KEY`);
  if (!key) {
    logger.warn(`Private key not found for role: ${role}`);
  }
  return key;
}

/**
 * 初始化环境
 * @returns {boolean} 是否初始化成功
 */
function initializeEnvironment() {
  if (initialized) {
    return true;
  }
  
  // 加载环境变量
  const loaded = loadEnvironment();
  if (!loaded) {
    logger.warn('Failed to load environment variables, using existing environment');
  }
  
  // 验证环境变量
  const missingVars = validateEnvironment();
  if (missingVars.length > 0) {
    logger.warn(`Environment initialization completed with warnings: missing ${missingVars.length} variables`);
  } else {
    logger.info('Environment initialization completed successfully');
  }
  
  initialized = true;
  return missingVars.length === 0;
}

/**
 * 重置环境初始化状态
 * 主要用于测试
 */
function resetEnvironment() {
  initialized = false;
  logger.info('Environment initialization state reset');
}

module.exports = {
  loadEnvironment,
  validateEnvironment,
  getEnvVar,
  getNetworkEnv,
  getPrivateKey,
  initializeEnvironment,
  resetEnvironment
}; 