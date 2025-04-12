const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
// 使用项目专门的Swagger配置
const swaggerSetup = require('./swagger/swagger');
const routes = require('./routes');
const ErrorMiddleware = require('./middleware/error');
const { Logger, EnvUtils } = require('../common');

// 创建Express应用
const app = express();

// 中间件 - 禁用helmet的CSP以便Swagger UI正常工作
app.use(helmet({
  contentSecurityPolicy: false
}));
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
  const apiKey = req.query.apiKey;
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

// 直接读取预生成的swagger-spec.json文件
let swaggerSpec;
try {
  const swaggerSpecPath = path.join(__dirname, 'swagger-spec.json');
  const swaggerContent = fs.readFileSync(swaggerSpecPath, 'utf8');
  swaggerSpec = JSON.parse(swaggerContent);
} catch (error) {
  console.error('无法读取swagger-spec.json文件:', error.message);
  swaggerSpec = {}; // 空对象作为备选
}

// 添加直接访问swagger.json的路由
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 设置Swagger文档 - 使用独立脚本生成的spec
const swaggerUi = require('swagger-ui-express');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

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
      authTest: '/api/auth-test',
      apiDocs: '/api-docs'
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
  console.log(`API文档可访问: http://localhost:${PORT}/api-docs`);
  console.log(`Swagger JSON可访问: http://localhost:${PORT}/swagger.json`);
  Logger.info(`服务器已启动，端口：${PORT}`);
});

module.exports = app; 