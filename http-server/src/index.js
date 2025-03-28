/**
 * HTTP服务器入口
 * 自动从ABI生成区块链智能合约接口的HTTP服务
 */

// 初始化模块别名
require('../../shared/utils/moduleAlias').initializeAliases();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const config = require('./config');
const { logger } = require('./utils/logger');
const { initializeBlockchain } = require('./utils/blockchain');
const abiService = require('./services/abiService');

// 创建Express应用
const app = express();
let server;

// 设置中间件
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 添加简单的健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API状态端点 - 用于测试脚本
app.get('/api/status', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API服务正常运行',
    data: { 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// 挂载API路由
app.use('/api/v1', routes);

// 兼容测试脚本的路由 - 将/api路径映射到/api/v1
app.use('/api', routes);

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
async function start() {
  try {
    logger.info('启动服务器...');
    
    // 尝试初始化区块链连接，但即使失败也继续
    try {
      await initializeBlockchain();
      logger.info('区块链连接初始化成功');
    } catch (error) {
      logger.warn('区块链连接初始化失败，但服务器仍将继续启动', { error: error.message });
      logger.warn('某些需要区块链连接的功能可能不可用');
    }
    
    // 尝试初始化ABI服务，但即使失败也继续
    try {
      await abiService.initialize();
      logger.info('ABI服务初始化成功');
    } catch (error) {
      logger.warn('ABI服务初始化失败，但服务器仍将继续启动', { error: error.message });
      logger.warn('API功能可能受限');
    }
    
    // 启动HTTP服务器
    server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`服务器在 ${config.server.host}:${config.server.port} 上运行`);
      logger.info(`API密钥: ${config.server.apiKey}`);
      logger.info(`环境: ${config.server.nodeEnv}`);
    });
    
    // 配置优雅关闭
    setupGracefulShutdown();
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 配置优雅关闭
function setupGracefulShutdown() {
  // 处理SIGTERM信号
  process.on('SIGTERM', gracefulShutdown);
  
  // 处理SIGINT信号 (Ctrl+C)
  process.on('SIGINT', gracefulShutdown);
  
  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常:', error);
    gracefulShutdown();
  });
  
  // 处理未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝:', reason);
    gracefulShutdown();
  });
}

// 优雅关闭服务器
function gracefulShutdown() {
  logger.info('收到关闭信号，正在优雅关闭服务器...');
  
  const forceExit = setTimeout(() => {
    logger.error('强制关闭超时，直接退出');
    process.exit(1);
  }, 10000);
  
  if (server) {
    server.close(() => {
      logger.info('服务器已关闭');
      clearTimeout(forceExit);
      process.exit(0);
    });
  } else {
    clearTimeout(forceExit);
    process.exit(0);
  }
}

// 启动服务器
start().catch(error => {
  logger.error('未捕获的启动错误:', error);
  process.exit(1);
});

module.exports = app; 