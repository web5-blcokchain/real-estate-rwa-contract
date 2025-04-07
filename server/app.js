const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const routes = require('./routes');
const ErrorMiddleware = require('./middleware/error');
const { Logger, EnvUtils } = require('../common');

// 创建Express应用
const app = express();

// 中间件
app.use(helmet()); // 安全头
app.use(cors()); // 跨域
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码

// 日志中间件
app.use(morgan('combined', {
  stream: {
    write: (message) => Logger.info(message.trim())
  }
}));

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real Estate Tokenization API',
      version: '1.0.0',
      description: '房产代币化系统API文档'
    },
    servers: [
      {
        url: EnvUtils.getString('API_BASE_URL', 'http://localhost:3000'),
        description: 'API服务器'
      }
    ]
  },
  apis: ['./server/routes/**/*.js'] // API文档路径
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 路由
app.use(routes);

// 404处理
app.use(ErrorMiddleware.handleNotFound);

// 错误处理
app.use(ErrorMiddleware.handleError);

// 设置端口
const PORT = EnvUtils.getPort();
app.set('port', PORT);

// 启动服务器
app.listen(PORT, () => {
  Logger.info(`服务器已启动，端口：${PORT}`);
});

module.exports = app; 