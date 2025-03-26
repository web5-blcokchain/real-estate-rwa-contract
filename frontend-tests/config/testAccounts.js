const { logger } = require('../../shared/utils/logger');
const { getAllKeys } = require('../../shared/config/keys');

/**
 * 获取测试账户配置
 * @returns {Promise<Object>} 测试账户配置
 */
async function getTestAccounts() {
  try {
    // 从共享配置加载私钥
    const accounts = getAllKeys();

    // 验证所有私钥是否存在
    const missingKeys = [];
    for (const [role, privateKey] of Object.entries(accounts)) {
      if (!privateKey || privateKey.trim() === '') {
        missingKeys.push(role);
      } else {
        logger.info(`已从环境变量加载 ${role} 私钥`);
      }
    }

    if (missingKeys.length > 0) {
      const errorMessage = `以下角色的私钥未设置或为空: ${missingKeys.join(', ')}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return accounts;
  } catch (error) {
    logger.error('加载测试账户配置失败:', error);
    throw error;
  }
}

module.exports = {
  getTestAccounts
}; 