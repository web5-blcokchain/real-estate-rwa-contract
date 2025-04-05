/**
 * 日本房地产资产通证化API服务器
 * 服务器入口文件
 */
require('dotenv').config();
const path = require('path');
const { Logger } = require('../../shared/src');
const app = require('./app');
const blockchainService = require('./services/blockchainService');

// 确保项目路径设置正确
if (!process.env.PROJECT_PATH) {
  process.env.PROJECT_PATH = path.resolve(__dirname, '../..');
  if (!process.env.PROJECT_PATH.endsWith('/')) {
    process.env.PROJECT_PATH += '/';
  }
}

// 配置Logger
Logger.configure({
  level: process.env.LOG_LEVEL || 'info',
  directory: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
  maxSize: process.env.LOG_MAX_SIZE || '10m',
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  console: process.env.LOG_CONSOLE !== 'false'
});

// 服务器启动信息
console.log(`===== 服务器启动 =====`);
console.log(`项目根目录: ${process.env.PROJECT_PATH}`);
console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
console.log(`区块链网络: ${process.env.BLOCKCHAIN_NETWORK || 'localhost'}`);

// 初始化区块链服务
async function startServer() {
  try {
    // 初始化区块链服务
    console.log('正在初始化区块链服务...');
    await blockchainService.initialize();
    Logger.info('区块链服务初始化成功');

    // 启动HTTP服务器
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      Logger.info(`服务器已启动，端口: ${PORT}`);
      
      console.log('======== 服务器信息 ========');
      console.log(`项目根目录: ${process.env.PROJECT_PATH}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`区块链网络: ${process.env.BLOCKCHAIN_NETWORK || 'localhost'}`);
      console.log(`API文档: http://localhost:${PORT}/api-docs`);
      console.log('=============================');
    });
  } catch (error) {
    Logger.error(`服务器启动失败: ${error.message}`, { error });
    console.error('服务器启动失败:', error.message);
    process.exit(1);
  }
}

// 启动服务器
startServer(); 