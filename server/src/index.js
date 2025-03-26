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