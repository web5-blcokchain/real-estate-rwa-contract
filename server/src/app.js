/**
 * 日本房地产资产通证化HTTP服务器
 * Express应用配置
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// 导入共享模块和配置
const { Logger, PerformanceMonitor } = require('./lib/shared');
const config = require('./config');

// 创建Express应用
const app = express();

// 获取API配置
const apiConfig = config.getApiConfig();
const basePath = apiConfig.basePath;
const swaggerPath = apiConfig.swaggerPath;

// 基础中间件
app.use(helmet());
app.use(cors({
  origin: apiConfig.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 导入中间件
const middlewares = require('./middlewares');

// 请求日志中间件
app.use(middlewares.requestLogger);

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '日本房地产资产通证化API',
      version: '1.0.0',
      description: '提供区块链合约交互的RESTful API',
      contact: {
        name: '开发团队',
        email: 'dev@example.com'
      }
    },
    servers: [
      {
        url: `http://${config.getServerConfig().host}:${config.getServerConfig().port}${basePath}`,
        description: 'API服务器'
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
    },
    security: [
      { ApiKeyAuth: [] }
    ]
  },
  apis: [
    path.join(__dirname, 'routes', '*.js'),
    path.join(__dirname, 'routes', 'contracts', '*.js'),
    path.join(__dirname, 'controllers', '*.js')
  ]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API根路由
app.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>日本房地产资产通证化API服务器</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 50px; line-height: 1.6; }
          h1 { color: #333; }
          .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>日本房地产资产通证化API服务器</h1>
        <p>服务器状态: <strong>运行中</strong></p>
        <p>区块链网络: <strong>${process.env.BLOCKCHAIN_NETWORK || 'localhost'}</strong></p>
        <p>API健康检查: <a href="/health">/health</a></p>
        <p>API文档: <a href="${swaggerPath}">Swagger文档</a></p>
        <p>API版本: <a href="${basePath}/blockchain/status">v1</a></p>
      </body>
    </html>
  `);
});

// 导入和使用路由
const routes = require('./routes');
app.use(basePath, routes);

// 错误处理中间件
app.use(middlewares.errorHandler);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在'
    }
  });
});

module.exports = app; 