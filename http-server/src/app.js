/**
 * 日本房地产资产通证化API服务器
 * Express应用配置
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');

// 导入中间件
const errorHandler = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');
const apiKeyAuth = require('./middlewares/apiKeyAuth');

// 导入路由
const apiRoutes = require('./routes');

// 创建Express应用
const app = express();

// 配置Swagger文档
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '日本房地产资产通证化API',
      version: '1.0.0',
      description: '基于区块链的房地产资产通证化API文档',
      contact: {
        name: '开发团队',
        email: 'dev@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'query',
          name: 'api_key',
          description: 'API密钥验证，通过URL参数api_key提供'
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ]
  },
  apis: [
    path.join(__dirname, 'routes/*.js'),
    path.join(__dirname, 'controllers/*.js')
  ]
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

// 应用中间件
app.use(helmet()); // 安全相关HTTP头
app.use(cors()); // 支持跨域请求
app.use(express.json()); // 解析JSON请求体
app.use(express.static(path.join(__dirname, '../public'))); // 静态文件

// 请求日志
app.use(requestLogger);

// API健康检查（不需要API密钥认证）
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Swagger文档（不需要API密钥认证）
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API路由 - 应用API密钥认证
app.use('/api', apiKeyAuth, apiRoutes);

// 首页
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>日本房地产资产通证化API</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 50px; line-height: 1.6; }
          h1 { color: #333; }
          .link-button { 
            display: inline-block; 
            background: #4CAF50; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>日本房地产资产通证化API服务器</h1>
        <p>区块链网络: <strong>${process.env.BLOCKCHAIN_NETWORK || 'localhost'}</strong></p>
        <p>API版本: <strong>v1</strong></p>
        <p>环境: <strong>${process.env.NODE_ENV || 'development'}</strong></p>
        <a href="/api-docs" class="link-button">API文档</a>
        <a href="/health" class="link-button">健康检查</a>
      </body>
    </html>
  `);
});

// 全局错误处理
app.use(errorHandler);

// 处理未匹配的路由
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