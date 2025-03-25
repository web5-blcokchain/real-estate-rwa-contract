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
// 环境变量中的主密钥名称
const MASTER_KEY_ENV = 'MASTER_KEY';

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

  Object.entries(envMapping).forEach(([role, envKey]) => {
    if (process.env[envKey]) {
      roleKeys[role] = process.env[envKey];
    }
  });
}

/**
 * 获取加密用的主密钥
 * @returns {string} 加密密钥
 */
function getMasterKey() {
  const masterKey = process.env[MASTER_KEY_ENV];
  if (!masterKey) {
    logger.warn('主密钥未设置，将使用默认密钥。生产环境中请设置MASTER_KEY环境变量');
    return 'default-master-key-do-not-use-in-production';
  }
  return masterKey;
}

/**
 * 加密私钥
 * @param {string} privateKey 明文私钥
 * @returns {string} 加密后的私钥
 */
function encryptKey(privateKey) {
  try {
    const masterKey = getMasterKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      crypto.createHash('sha256').update(masterKey).digest('base64').substring(0, 32),
      iv
    );
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error(`加密私钥失败: ${error.message}`);
    return '';
  }
}

/**
 * 解密私钥
 * @param {string} encryptedKey 加密后的私钥
 * @returns {string} 明文私钥
 */
function decryptKey(encryptedKey) {
  try {
    const [ivHex, encryptedHex] = encryptedKey.split(':');
    const masterKey = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.createHash('sha256').update(masterKey).digest('base64').substring(0, 32),
      iv
    );
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error(`解密私钥失败: ${error.message}`);
    return '';
  }
}

/**
 * 保存加密的私钥到文件
 */
function saveKeys() {
  try {
    // 创建加密的私钥对象
    const encryptedKeys = {};
    Object.entries(roleKeys).forEach(([role, key]) => {
      if (key) {
        encryptedKeys[role] = encryptKey(key);
      }
    });
    
    // 写入文件
    fs.writeFileSync(KEYS_FILE, JSON.stringify(encryptedKeys, null, 2));
    logger.info('已保存加密的私钥到文件');
    
    return true;
  } catch (error) {
    logger.error(`保存私钥失败: ${error.message}`);
    return false;
  }
}

/**
 * 从文件加载加密的私钥
 */
function loadKeys() {
  try {
    if (!fs.existsSync(KEYS_FILE)) {
      logger.info('未找到私钥文件，将使用环境变量');
      return false;
    }
    
    const encryptedKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    
    // 解密私钥
    Object.entries(encryptedKeys).forEach(([role, encryptedKey]) => {
      if (encryptedKey && roleKeys.hasOwnProperty(role)) {
        roleKeys[role] = decryptKey(encryptedKey);
      }
    });
    
    logger.info('已从文件加载私钥');
    return true;
  } catch (error) {
    logger.error(`加载私钥失败: ${error.message}`);
    return false;
  }
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

// 初始化 - 优先从文件加载，然后从环境变量补充
const loaded = loadKeys();
if (!loaded) {
  loadFromEnv();
  // 如果从环境变量加载了私钥，则保存到文件
  if (Object.values(roleKeys).some(key => key)) {
    saveKeys();
  }
}

module.exports = {
  getKey,
  setKey,
  getAllKeys,
  saveKeys,
  loadKeys
}; 