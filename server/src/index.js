/**
 * 日本房地产资产通证化HTTP服务器
 * 服务器入口文件
 */
const dotenv = require('dotenv');
const path = require('path');
const { Logger } = require('../../shared/src/utils');
const { EnvConfig, AddressConfig, ABIConfig } = require('../../shared/src/config');
const app = require('./app');
const { blockchainService } = require('./services');
const serverConfig = require('./config');

// 加载环境变量
dotenv.config();

// 初始化Shared模块配置
// 1. 加载环境变量配置
EnvConfig.load();

// 2. 设置部署文件路径
const deploymentPath = path.resolve(process.cwd(), 'config/deployment.json');
if (require('fs').existsSync(deploymentPath)) {
  AddressConfig.setDeploymentPath(deploymentPath);
  Logger.info('已加载部署文件配置', { path: deploymentPath });
} else {
  Logger.warn('部署文件不存在，将使用环境变量中的合约地址', { path: deploymentPath });
}

// 3. 加载ABI目录
const abiDirPath = path.resolve(process.cwd(), 'config/abi');
if (require('fs').existsSync(abiDirPath)) {
  try {
    const abis = ABIConfig.loadAllContractAbis(abiDirPath);
    const abiCount = Object.keys(abis).length;
    Logger.info(`已加载${abiCount}个合约ABI`, { path: abiDirPath });
  } catch (error) {
    Logger.warn(`加载ABI文件失败: ${error.message}`, { path: abiDirPath });
  }
} else {
  Logger.warn('ABI目录不存在，将在需要时尝试加载单个ABI文件', { path: abiDirPath });
}

// 配置日志
// 使用服务器特定的日志配置，而不是默认配置
Logger.configure(serverConfig.getLoggerConfig());
// 为了向后兼容仍然设置模块路径
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