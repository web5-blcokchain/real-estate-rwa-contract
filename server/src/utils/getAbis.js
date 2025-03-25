const sharedAbis = require('../../../shared/utils/getAbis');
const logger = require('./logger');

/**
 * 初始化加载所有主要合约的ABIs
 */
const initializeAbis = () => {
  try {
    // 使用共享模块初始化ABI
    sharedAbis.initializeAbis(logger);
    logger.info('服务器ABI初始化完成');
  } catch (error) {
    logger.error(`服务器ABI初始化失败: ${error.message}`);
  }
};

// 重新导出共享模块的函数
module.exports = {
  getAbi: sharedAbis.getAbi,
  loadAbi: sharedAbis.loadAbi,
  initializeAbis,
  contractAbis: sharedAbis.contractAbis
}; 