const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const { baseConfig, initializeConfig } = require('./config');
const { initializeAbis } = require('../../shared/utils/getAbis');
const { getContractAddresses } = require('../../shared/config/contracts');
const { initializeBlockchain, resetBlockchain } = require('../../shared/utils/blockchain');
const { closeLoggers } = require('../../shared/utils/logger');

// 创建 Express 应用
const app = express();
let server;

// 设置中间件
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 添加一个简单的测试路由
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API测试成功',
    apiKey: req.query.api_key || '未提供'
  });
});

// 挂载API路由
app.use('/api/v1', routes);

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
async function start() {
  try {
    logger.info('Starting server initialization...');
    
    // 初始化配置
    const contractAddresses = initializeConfig();
    logger.info('Configuration initialized', contractAddresses);
    
    // 加载合约地址
    const addresses = getContractAddresses();
    logger.info('Contract addresses loaded:', addresses);
    
    // 初始化合约 ABIs
    await initializeAbis(logger);
    logger.info('Contract ABIs initialized');
    
    // 初始化区块链连接
    await initializeBlockchain();
    logger.info('Blockchain connection initialized');
    
    // 启动服务器
    server = app.listen(baseConfig.port, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${baseConfig.port}`);
    });

    // 处理进程终止
    setupGracefulShutdown();
  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// 设置优雅关闭
function setupGracefulShutdown() {
  // 处理 SIGTERM 信号
  process.on('SIGTERM', gracefulShutdown);
  
  // 处理 SIGINT 信号 (Ctrl+C)
  process.on('SIGINT', gracefulShutdown);
  
  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    gracefulShutdown();
  });
  
  // 处理未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise rejection:', reason);
    gracefulShutdown();
  });
}

// 优雅关闭函数
function gracefulShutdown() {
  logger.info('Received shutdown signal, gracefully shutting down...');
  
  // 设置超时，防止卡住
  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
  
  try {
    // 关闭服务器
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed');
        cleanupAndExit();
      });
    } else {
      cleanupAndExit();
    }
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    clearTimeout(forceExit);
    process.exit(1);
  }
  
  // 清理资源并退出
  function cleanupAndExit() {
    try {
      // 重置区块链连接
      resetBlockchain();
      logger.info('Blockchain connections reset');
      
      // 关闭日志记录器
      closeLoggers();
      logger.info('Loggers closed');
      
      // 取消强制退出的定时器
      clearTimeout(forceExit);
      
      // 正常退出
      process.exit(0);
    } catch (error) {
      logger.error('Error during cleanup:', error);
      clearTimeout(forceExit);
      process.exit(1);
    }
  }
}

// 启动应用
start().catch(error => {
  logger.error(`Failed to start server: ${error.message}`);
  if (error.stack) {
    logger.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
});

module.exports = app; 