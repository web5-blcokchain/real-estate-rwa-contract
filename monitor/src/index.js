/**
 * 区块链监控系统入口
 */

const { createLogger } = require('./utils/logger');
const db = require('./db');
const monitorService = require('./services/monitor');

const logger = createLogger('app');

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', { error: error.message, stack: error.stack });
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝', { reason: reason.message, stack: reason.stack });
});

// 处理应用程序退出
process.on('SIGINT', async () => {
  logger.info('接收到 SIGINT 信号，应用程序正在退出...');
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('接收到 SIGTERM 信号，应用程序正在退出...');
  await gracefulShutdown();
  process.exit(0);
});

/**
 * 优雅退出
 */
async function gracefulShutdown() {
  try {
    // 停止监控服务
    monitorService.stopMonitor();
    logger.info('监控服务已停止');

    // 关闭数据库连接
    await db.closeDatabase();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('应用程序退出时发生错误', { error: error.message });
  }
}

/**
 * 启动应用程序
 */
async function start() {
  try {
    logger.info('正在启动区块链监控系统...');

    // 初始化数据库
    await db.initDatabase();
    logger.info('数据库已初始化');

    // 启动监控服务
    await monitorService.startMonitor();
    logger.info('区块链监控系统已启动');
  } catch (error) {
    logger.error('应用程序启动失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// 启动应用程序
if (require.main === module) {
  start();
}

module.exports = {
  start,
  gracefulShutdown
}; 