/**
 * 私钥管理模块
 * 安全地管理各个角色的私钥
 */
const dotenv = require('dotenv');
const path = require('path');
const logger = require('../utils/logger');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// 角色私钥映射
const roleKeys = {
  admin: '',
  operator: '',
  user: '',
  finance: '',
  emergency: '',
  deployer: '',
  superAdmin: '',
  propertyManager: '',
  feeCollector: ''
};

/**
 * 从环境变量加载私钥
 */
function loadFromEnv() {
  const envMapping = {
    admin: 'ADMIN_PRIVATE_KEY',
    operator: 'OPERATOR_PRIVATE_KEY',
    user: 'USER_PRIVATE_KEY',
    finance: 'FINANCE_PRIVATE_KEY',
    emergency: 'EMERGENCY_PRIVATE_KEY',
    deployer: 'DEPLOYER_PRIVATE_KEY',
    superAdmin: 'SUPER_ADMIN_PRIVATE_KEY',
    propertyManager: 'PROPERTY_MANAGER_PRIVATE_KEY',
    feeCollector: 'FEE_COLLECTOR_PRIVATE_KEY'
  };

  // 直接从环境变量加载私钥
  Object.entries(envMapping).forEach(([role, envKey]) => {
    const privateKey = process.env[envKey];
    if (!privateKey || privateKey.trim() === '') {
      logger.warn(`环境变量 ${envKey} 未设置或为空`);
      return;
    }
    
    // 验证私钥格式，但只发出警告而不阻止使用
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      logger.warn(`私钥格式可能不正确: ${role}，但仍将使用它`);
    }
    
    roleKeys[role] = privateKey;
    logger.info(`已从环境变量加载 ${role} 私钥`);
  });
}

/**
 * 获取角色私钥
 * @param {string} role 角色名称
 * @returns {string} 私钥
 */
function getPrivateKey(role) {
  const key = roleKeys[role];
  if (!key) {
    logger.warn(`未找到角色 ${role} 的私钥，返回空值`);
    return null; // 返回null而不是抛出错误
  }
  return key;
}

/**
 * 获取所有角色的私钥
 * @returns {Object} 角色私钥映射
 */
function getAllPrivateKeys() {
  return { ...roleKeys };
}

// 初始化时从环境变量加载私钥
loadFromEnv();

module.exports = {
  getPrivateKey,
  getAllPrivateKeys
}; 