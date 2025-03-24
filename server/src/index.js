const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const { serverConfig } = require('./config');
const { initializeAbis } = require('./utils/getAbis');

// 创建 Express 应用
const app = express();

// 安全增强中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: serverConfig.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 请求体解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));

// 注册API路由
app.use('/', routes);

// 404处理中间件
app.use(notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

// 启动服务器
const start = async () => {
  try {
    // 初始化合约ABIs
    initializeAbis();
    
    // 监听端口
    app.listen(serverConfig.port, () => {
      logger.info(`Server running in ${serverConfig.environment} mode on port ${serverConfig.port}`);
    });
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

// 启动应用
start();

// 优雅退出处理
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 