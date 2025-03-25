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

// 创建 Express 应用
const app = express();

// 启动服务器
async function start() {
  try {
    logger.info('Starting server initialization...');
    
    // 初始化配置
    const contractAddresses = initializeConfig();
    logger.info('Configuration initialized',contractAddresses);
    
    // 加载合约地址
    const addresses = getContractAddresses();
    logger.info('Contract addresses loaded:', addresses);
    
    // 初始化合约 ABIs
    await initializeAbis(logger);
    logger.info('Contract ABIs initialized');
    
    // 启动服务器
    app.listen(baseConfig.port, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${baseConfig.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
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