/**
 * 重置部署状态脚本
 * 用于在重新部署前清除旧的部署状态
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDeployStatePath } = require('../shared/utils/paths');
const logger = require('../shared/utils/logger').getLogger('reset-deploy');

/**
 * 重置部署状态文件
 * @param {Object} options 重置选项
 * @param {boolean} options.backup 是否备份旧的部署状态
 * @param {boolean} options.create 是否创建一个空的部署状态文件
 */
function resetDeployState(options = { backup: true, create: true }) {
  try {
    const deployStatePath = getDeployStatePath();
    logger.info(`部署状态文件路径: ${deployStatePath}`);
    
    // 检查文件是否存在
    if (fs.existsSync(deployStatePath)) {
      // 如果存在并需要备份
      if (options.backup) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupPath = `${deployStatePath}.${timestamp}.bak`;
        fs.copyFileSync(deployStatePath, backupPath);
        logger.info(`已备份部署状态文件到: ${backupPath}`);
      }
      
      // 删除原文件
      fs.unlinkSync(deployStatePath);
      logger.info('已删除原部署状态文件');
    } else {
      logger.info('部署状态文件不存在，无需删除');
    }
    
    // 如果需要创建新的空文件
    if (options.create) {
      const emptyState = {
        contracts: {}
      };
      
      // 确保目录存在
      const deployStateDir = path.dirname(deployStatePath);
      if (!fs.existsSync(deployStateDir)) {
        fs.mkdirSync(deployStateDir, { recursive: true });
      }
      
      // 写入新文件
      fs.writeFileSync(deployStatePath, JSON.stringify(emptyState, null, 2));
      logger.info('已创建新的空部署状态文件');
    }
    
    logger.info('部署状态重置完成');
    return true;
  } catch (error) {
    logger.error(`重置部署状态失败: ${error.message}`);
    return false;
  }
}

// 如果直接运行脚本，则执行重置操作
if (require.main === module) {
  const result = resetDeployState();
  process.exit(result ? 0 : 1);
}

module.exports = resetDeployState; 