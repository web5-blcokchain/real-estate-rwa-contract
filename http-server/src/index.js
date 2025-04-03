/**
 * 日本房地产资产通证化HTTP服务器入口文件
 */
const { Logger } = require('../../shared/src');
const app = require('./app');

// 配置环境变量
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// 启动服务器
const server = app.listen(PORT, HOST, () => {
  Logger.info(`服务器已启动: http://${HOST}:${PORT}`);
  Logger.info(`API文档地址: http://${HOST}:${PORT}/api-docs`);
});

// 处理进程退出
process.on('SIGTERM', () => {
  Logger.info('SIGTERM信号已接收，正在关闭服务器');
  server.close(() => {
    Logger.info('服务器已关闭');
    process.exit(0);
  });
});

// 处理未捕获的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('未处理的Promise拒绝', { reason, promise });
  // 对于严重错误，可以考虑优雅地关闭应用
  // server.close(() => process.exit(1));
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  Logger.error('未捕获的异常', { error });
  // 对于未捕获的异常，建议优雅地关闭应用，因为进程可能处于不稳定状态
  server.close(() => process.exit(1));
}); 