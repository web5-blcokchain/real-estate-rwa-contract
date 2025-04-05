/**
 * 日本房地产资产通证化HTTP服务器
 * 服务器入口文件
 */
require('dotenv').config();
const app = require('./app');
const { Logger, configureLogger, initialize: initializeShared } = require('./lib/shared');
const config = require('./config');

// 设置项目信息
console.log(`===== 服务器启动 =====`);
console.log(`项目根目录路径: ${process.env.PROJECT_PATH}`);
console.log(`当前工作目录: ${process.cwd()}`);
console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
console.log(`区块链网络: ${process.env.BLOCKCHAIN_NETWORK || 'localhost'}`);

// 配置日志
try {
  configureLogger(config.getLogConfig());
  Logger.info('日志系统初始化成功');
} catch (error) {
  console.error('日志系统初始化失败:', error.message);
}

// 初始化shared模块
try {
  console.log('初始化shared模块...');
  initializeShared();
  console.log('shared模块初始化成功');
} catch (error) {
  console.error('shared模块初始化失败:', error.message);
  process.exit(1);
}

// 初始化区块链服务
const { blockchainService } = require('./services');
if (blockchainService && typeof blockchainService.initialize === 'function') {
  console.log('正在初始化区块链服务...');
  blockchainService.initialize()
    .then(() => {
      Logger.info('区块链服务初始化成功');
    })
    .catch(error => {
      Logger.warn(`区块链服务初始化失败: ${error.message}`);
    });
} else {
  Logger.warn('区块链服务不可用或未提供初始化方法');
}

// 启动服务器
const PORT = config.getServerConfig().port;
app.listen(PORT, () => {
  Logger.info(`服务器已启动，端口: ${PORT}`);
  
  // 打印服务器信息
  console.log('======== 服务器配置信息 ========');
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`区块链网络: ${process.env.BLOCKCHAIN_NETWORK || 'localhost'}`);
  console.log(`API文档: http://localhost:${PORT}/api-docs`);
  console.log(`API基础路径: ${config.getApiConfig().basePath}`);
  console.log('================================');
}); 