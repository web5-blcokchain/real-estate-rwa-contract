/**
 * 日本房地产资产通证化HTTP服务器
 * 服务器入口文件
 */
const dotenv = require('dotenv');
const { Logger } = require('../../shared/src/utils');
const app = require('./app');
const blockchainService = require('./services/BlockchainService');
const serverConfig = require('./config');

// 加载环境变量
dotenv.config();

// 配置日志
Logger.setPath('server');

// 服务器配置
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 验证环境变量
    serverConfig.validateConfig();
    
    // 初始化区块链服务
    await blockchainService.initialize();
    
    // 启动HTTP服务器
    const server = app.listen(PORT, HOST, () => {
      Logger.info(`服务器已启动: http://${HOST}:${PORT}`);
      Logger.info(`API文档地址: http://${HOST}:${PORT}/api-docs`);
      Logger.info(`区块链网络: ${blockchainService.getNetworkType()}`);
    });
    
    // 处理进程退出
    setupGracefulShutdown(server);
    
  } catch (error) {
    Logger.error(`服务器启动失败: ${error.message}`, { error });
    process.exit(1);
  }
}

/**
 * 设置优雅退出
 * @param {Object} server - HTTP服务器实例
 */
function setupGracefulShutdown(server) {
  // 处理进程退出信号
  process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
  
  // 处理未捕获的异常和拒绝的Promise
  process.on('uncaughtException', (error) => {
    Logger.error(`未捕获的异常: ${error.message}`, { error });
    gracefulShutdown(server, 'uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    Logger.error(`未处理的Promise拒绝: ${reason}`, { reason, promise });
  });
}

/**
 * 优雅退出
 * @param {Object} server - HTTP服务器实例
 * @param {string} signal - 退出信号
 */
function gracefulShutdown(server, signal) {
  Logger.info(`收到${signal}信号，服务器正在关闭...`);
  
  server.close(() => {
    Logger.info('服务器已关闭');
    process.exit(0);
  });
  
  // 超时强制退出
  setTimeout(() => {
    Logger.error('强制关闭服务器');
    process.exit(1);
  }, 10000);
}

// 启动服务器
startServer(); 