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

// 请求记录中间件，帮助调试
app.use((req, res, next) => {
  console.log(`请求: ${req.method} ${req.url}`);
  Logger.info(`请求: ${req.method} ${req.url}`, {
    headers: req.headers,
    query: req.query,
    params: req.params
  });
  next();
});

// 添加根路由测试
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Real Estate Tokenization API',
    timestamp: new Date().toISOString()
  });
});

// 添加API测试路由
app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API测试成功',
    timestamp: new Date().toISOString()
  });
});

// API Key 测试路由
app.get('/api/auth-test', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = EnvUtils.getApiKey() || '123456';
  
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({
      success: false,
      error: '无效的API密钥',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    message: 'API Key 验证成功',
    timestamp: new Date().toISOString()
  });
});

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

// 添加更详细的路由错误处理
app.use((req, res, next) => {
  Logger.warn(`未找到路由: ${req.method} ${req.url}`, {
    headers: req.headers,
    query: req.query,
    body: req.body
  });
  
  res.status(404).json({
    success: false,
    error: `未找到路由: ${req.method} ${req.url}`,
    availableRoutes: {
      root: '/',
      apiTest: '/api/test',
      authTest: '/api/auth-test'
    },
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use(ErrorMiddleware.handleNotFound);

// 错误处理
app.use(ErrorMiddleware.handleError);

// 设置端口
const PORT = EnvUtils.getPort();
app.set('port', PORT);

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，端口：${PORT}`);
  Logger.info(`服务器已启动，端口：${PORT}`);
});

module.exports = app; 