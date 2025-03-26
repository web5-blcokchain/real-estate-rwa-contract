const { getLogger } = require('../../../shared/utils/logger');

// 创建监控模块特定的日志记录器
const logger = getLogger('monitor');

// 记录模块启动信息
logger.info('Monitor logger initialized');

module.exports = logger; 