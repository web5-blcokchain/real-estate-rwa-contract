/**
 * 日本房地产资产通证化HTTP服务器入口文件
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { Logger } = require('../../shared/src');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

// 初始化Express应用
const app = express();

// 配置环境变量
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// 配置中间件
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API根路由
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Japan RWA API Service',
    version: '1.0.0'
  });
});

// API路由
app.use('/api/v1', routes);

// Swagger文档配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '日本房地产资产通证化API',
      version: '1.0.0',
      description: '提供区块链合约交互的REST API接口'
    },
    servers: [
      {
        url: `http://${HOST}:${PORT}`,
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 错误处理中间件
app.use(errorHandler);

// 未找到的路由处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: '请求的资源不存在'
  });
});

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

module.exports = app; 