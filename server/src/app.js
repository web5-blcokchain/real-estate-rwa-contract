/**
 * 日本房地产资产通证化HTTP服务器
 * Express应用配置
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { Logger } = require('../../shared/src/utils');
const serverConfig = require('./config');
const routes = require('./routes');
const middlewares = require('./middlewares');

// 创建Express应用
const app = express();

// 获取API配置
const apiConfig = serverConfig.getApiConfig();
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

// 请求日志中间件
app.use(middlewares.requestLogger);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API根路由
app.get('/', middlewares.apiKey, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: '日本房地产资产通证化API',
      version: '1.0.0',
      description: '提供区块链合约交互的RESTful API'
    }
  });
});

// API路由
app.use(basePath, routes);

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '日本房地产资产通证化API',
      version: '1.0.0',
      description: '提供区块链合约交互的RESTful API'
    },
    servers: [
      {
        url: `http://${apiConfig.host}:${apiConfig.port}${basePath}`,
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
    './server/src/routes/*.js',
    './server/src/routes/contracts/*.js' // 包含动态生成的合约路由
  ]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerDocs));

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