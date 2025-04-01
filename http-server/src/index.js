/**
 * HTTP服务器入口文件
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const helmet = require('helmet');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const propertyManagerRouter = require('./routes/propertyManager');
const contractInteractionRouter = require('./routes/contractInteraction');

// 初始化环境变量
dotenv.config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 配置跨域请求
app.use(cors());

// 安全增强中间件
app.use(helmet());

// 解析请求体
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 添加请求日志中间件
app.use(logger.request);

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '不动产系统API',
      version: '1.0.0',
      description: '不动产系统合约功能封装API',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'query',
          name: 'api_key',
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // 路由文件路径
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API密钥中间件
const apiKeyMiddleware = (req, res, next) => {
  try {
    // 从请求头或查询参数中获取API Key
    const apiKey = req.header('x-api-key') || req.query.api_key;
    
    // 检查API Key是否存在
    if (!apiKey) {
      logger.warn('请求缺少API Key');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '未提供API密钥'
      });
    }
    
    // 检查API Key是否有效
    const validApiKey = process.env.API_KEY || 'dev-api-key';
    if (apiKey !== validApiKey) {
      logger.warn('API Key验证失败');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'API密钥无效'
      });
    }
    
    // API Key验证通过
    next();
  } catch (error) {
    logger.error('API Key验证发生错误:', error);
    // 确保认证错误总是返回401而不是500
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API认证失败'
    });
  }
};

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '服务器运行正常',
    status: 'ok',
    time: new Date().toISOString()
  });
});

// 注册API路由
// 先应用API密钥中间件
app.use('/api', apiKeyMiddleware);

// 注册路由
app.use('/api/property-manager', propertyManagerRouter);
app.use('/api/contract', contractInteractionRouter);

// 示例角色管理路由
app.get('/api/role-manager/roles/:address', (req, res) => {
  const { address } = req.params;
  res.status(200).json({
    success: true,
    address,
    roles: ['admin', 'user']
  });
});

// 404处理中间件 - 在所有其他路由之后添加
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '未找到',
    message: `路径 ${req.path} 不存在`
  });
});

// 添加全局错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误:', err.stack);
  
  // 根据环境返回不同的错误信息
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: '服务器内部错误',
    ...(isDevelopment && { stack: err.stack }) // 只在开发环境返回堆栈信息
  });
});

// 创建HTTP服务器
const server = http.createServer(app);

// 只有在非测试环境才启动服务器
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`HTTP服务器运行在端口 ${PORT}`);
    logger.info(`API文档地址: http://localhost:${PORT}/api-docs`);
  });
}

// 导出app实例用于测试
module.exports = app; 