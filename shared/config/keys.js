/**
 * 私钥管理模块
 * 安全地管理各个角色的私钥
 */
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 找到项目根目录
function findRootDir() {
  let currentDir = process.cwd();
  
  // 向上查找，直到找到包含.env文件的目录，或者到达文件系统根目录
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, '.env'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  // 找不到.env文件，返回当前目录
  return process.cwd();
}

const rootDir = findRootDir();
const envPath = path.join(rootDir, '.env');

// 加载环境变量
let envLoaded = false;
if (fs.existsSync(envPath)) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      logger.info(`成功从 ${envPath} 加载环境变量`);
      envLoaded = true;
    } else {
      logger.warn(`加载.env文件出错: ${result.error.message}`);
    }
  } catch (error) {
    logger.warn(`加载.env文件时异常: ${error.message}`);
  }
}

if (!envLoaded) {
  logger.warn('无法加载.env文件，将使用已存在的环境变量');
  // 打印所有可能的目录位置，帮助调试
  logger.info(`当前工作目录: ${process.cwd()}`);
  logger.info(`尝试的.env路径: ${envPath}`);
  logger.info(`模块目录: ${__dirname}`);
}

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

  // 打印所有环境变量，帮助调试
  if (!envLoaded) {
    logger.debug('环境变量检查:');
    Object.values(envMapping).forEach(key => {
      logger.debug(`${key}: ${process.env[key] ? '已设置' : '未设置'}`);
    });
  }

  // 计数加载的私钥数量
  let loadedCount = 0;

  // 直接从环境变量加载私钥
  Object.entries(envMapping).forEach(([role, envKey]) => {
    const privateKey = process.env[envKey];
    if (!privateKey || privateKey.trim() === '') {
      logger.debug(`环境变量 ${envKey} 未设置或为空`);
      return;
    }
    
    // 验证私钥格式
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      logger.warn(`私钥格式不正确: ${role}，预期格式为0x开头的66位字符`);
    }
    
    roleKeys[role] = privateKey;
    loadedCount++;
  });
  
  if (loadedCount > 0) {
    logger.info(`成功加载了 ${loadedCount} 个角色私钥`);
  } else {
    logger.warn('未能加载任何角色私钥，系统将以只读模式运行');
  }
}

/**
 * 获取角色私钥
 * @param {string} role 角色名称
 * @returns {string} 私钥
 */
function getPrivateKey(role) {
  const key = roleKeys[role];
  if (!key) {
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