/**
 * 日本房地产资产通证化HTTP服务器应用
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const { errorHandler, requestLogger, apiKey } = require('./middlewares');
const config = require('./config');

// 初始化Express应用
const app = express();

// 配置环境变量
const PORT = config.server.port;
const HOST = config.server.host;

// 配置中间件
app.use(helmet());
app.use(requestLogger);
app.use(cors({
  origin: config.server.corsOrigin
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API根路由
app.get('/', apiKey, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Japan RWA API Service',
      version: config.api.version
    }
  });
});

// API路由
app.use(config.apiPath, routes);

// Swagger文档配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '日本房地产资产通证化API',
      version: config.api.version,
      description: '提供区块链合约交互的REST API接口'
    },
    servers: [
      {
        url: config.baseUrl,
        description: config.env.isDevelopment ? 'Development Server' : 'Production Server'
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
    error: {
      name: 'NotFound',
      message: '请求的资源未找到'
    }
  });
});

module.exports = app; 