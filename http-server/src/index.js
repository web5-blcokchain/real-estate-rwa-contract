/**
 * HTTP API服务器入口文件
 * 设置Express应用，加载中间件和路由
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { logger, requestLogger } = require('./utils/logger');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const blockchainService = require('./services/blockchainService');
const fs = require('fs');

// 直接写入输出文件
fs.writeFileSync('http-server-start.log', 'HTTP服务器正在启动...\n');

// 创建Express应用
const app = express();

// 安全头部
app.use(helmet());

// CORS配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP请求日志
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev', {
    stream: {
      write: message => logger.info(message.trim())
    }
  }));
}

// 自定义请求日志
app.use(requestLogger);

// 速率限制
const limiter = rateLimit({
  windowMs: config.api.rateLimit.windowMs,
  max: config.api.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: '请求次数过多，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use(limiter);

// 加载路由
app.use(routes);

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const PORT = config.server.port;
const HOST = config.server.host;

// 直接写入文件
fs.appendFileSync('http-server-start.log', `尝试启动服务器在 ${HOST}:${PORT}...\n`);

const server = app.listen(PORT, HOST, () => {
  // 输出到控制台
  console.error(`\n\n=== HTTP API服务器启动成功: http://${HOST}:${PORT} ===\n\n`);
  console.error(`=== 环境: ${config.server.env} ===\n\n`);
  
  // 也输出到日志
  logger.info(`HTTP API服务器启动成功: http://${HOST}:${PORT}`);
  logger.info(`环境: ${config.server.env}`);
  
  // 写入文件
  fs.appendFileSync('http-server-start.log', `HTTP API服务器启动成功: http://${HOST}:${PORT}\n`);
  fs.appendFileSync('http-server-start.log', `环境: ${config.server.env}\n`);
  
  // 注释掉尝试连接区块链的代码
  /*
  // 尝试连接区块链
  try {
    // 初始化Provider
    blockchainService.initProvider();
    
    // 检查连接状态
    const status = await blockchainService.checkConnection();
    
    if (status.connected) {
      logger.info(`已连接到区块链网络 (Chain ID: ${status.chainId}), 当前区块: ${status.blockNumber}`);
    } else {
      logger.warn(`无法连接到区块链网络: ${status.error}`);
    }
  } catch (error) {
    logger.error('初始化区块链连接失败', error);
  }
  */
});

// 处理进程终止信号
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 优雅关闭服务器
function gracefulShutdown() {
  logger.info('正在关闭HTTP API服务器...');
  server.close(() => {
    logger.info('HTTP API服务器已关闭');
    process.exit(0);
  });
  
  // 如果10秒内未关闭，强制退出
  setTimeout(() => {
    logger.error('HTTP API服务器关闭超时，强制退出');
    process.exit(1);
  }, 10000);
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', error);
  
  // 发生未捕获异常时尝试优雅关闭服务器
  gracefulShutdown();
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', { reason });
});

module.exports = { app, server }; 