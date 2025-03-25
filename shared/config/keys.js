/**
 * 私钥管理模块
 * 安全地管理各个角色的私钥
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { logger } = require('../utils/logger');

// 秘钥文件路径
const KEYS_FILE = path.join(process.cwd(), '.keys.json');

// 角色私钥映射
let roleKeys = {
  admin: '',
  operator: '',
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
    finance: 'FINANCE_PRIVATE_KEY',
    emergency: 'EMERGENCY_PRIVATE_KEY',
    deployer: 'PRIVATE_KEY',
    superAdmin: 'SUPER_ADMIN_PRIVATE_KEY',
    propertyManager: 'PROPERTY_MANAGER_PRIVATE_KEY',
    feeCollector: 'FEE_COLLECTOR_PRIVATE_KEY'
  };

  // 直接从环境变量加载私钥
  Object.entries(envMapping).forEach(([role, envKey]) => {
    if (process.env[envKey]) {
      roleKeys[role] = process.env[envKey];
      logger.info(`已从环境变量加载 ${role} 私钥`);
    }
  });
}

/**
 * 获取角色私钥
 * @param {string} role 角色名称
 * @returns {string} 私钥
 */
function getKey(role) {
  if (!roleKeys.hasOwnProperty(role)) {
    logger.error(`未知角色: ${role}`);
    return '';
  }
  
  return roleKeys[role];
}

/**
 * 获取所有角色的私钥
 * @returns {Object} 角色私钥映射
 */
function getAllKeys() {
  return { ...roleKeys };
}

/**
 * 设置角色私钥
 * @param {string} role 角色名称
 * @param {string} privateKey 私钥
 * @returns {boolean} 是否成功
 */
function setKey(role, privateKey) {
  if (!roleKeys.hasOwnProperty(role)) {
    logger.error(`未知角色: ${role}`);
    return false;
  }
  
  roleKeys[role] = privateKey;
  return true;
}

// 初始化时从环境变量加载私钥
loadFromEnv();

module.exports = {
  getKey,
  getAllKeys,
  setKey,
  loadFromEnv
}; 