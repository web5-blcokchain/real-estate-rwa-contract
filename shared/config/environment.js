const dotenv = require('dotenv');
const { getEnvPath, validatePath } = require('../utils/paths');
const logger = require('../utils/logger');

/**
 * 加载环境变量
 */
function loadEnvironment() {
  try {
    const envPath = getEnvPath();
    if (!validatePath(envPath)) {
      logger.warn('No .env file found, using default environment variables');
      return;
    }

    const result = dotenv.config({ path: envPath });
    if (result.error) {
      logger.warn('Error loading .env file:', result.error);
    } else {
      logger.info('Environment variables loaded successfully');
    }
  } catch (error) {
    logger.error('Failed to load environment variables:', error);
    throw error;
  }
}

/**
 * 环境变量验证
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
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * 获取环境变量
 * @param {string} name 变量名
 * @param {*} defaultValue 默认值
 * @returns {*} 环境变量值
 */
function getEnvVar(name, defaultValue = null) {
  const value = process.env[name];
  if (value === undefined && defaultValue === null) {
    throw new Error(`Environment variable not found: ${name}`);
  }
  return value || defaultValue;
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
    throw new Error(`Private key not found for role: ${role}`);
  }
  return key;
}

/**
 * 初始化环境
 */
function initializeEnvironment() {
  loadEnvironment();
  validateEnvironment();
}

module.exports = {
  loadEnvironment,
  validateEnvironment,
  getEnvVar,
  getNetworkEnv,
  getPrivateKey,
  initializeEnvironment
}; 