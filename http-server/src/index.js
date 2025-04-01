import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import helmet from 'helmet';
import utils from './utils/index.js';

// 导入路由
import roleManagerRoutes from './routes/roleManager.js';
import propertyManagerRoutes from './routes/propertyManager.js';
import tradingManagerRoutes from './routes/tradingManager.js';
import rewardManagerRoutes from './routes/rewardManager.js';
import systemRoutes from './routes/system.js';

// 导入中间件
import { apiKeyMiddleware } from './middlewares/auth.js';

// 创建环境配置实例
const EnvConfig = utils.EnvConfig;
const env = new EnvConfig();

// 创建Express应用
const app = express();
const PORT = env.getServerConfig().port || 3000;

// 配置跨域请求
app.use(cors());

// 安全增强中间件
app.use(helmet());

// 解析请求体
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// 注册API路由，并应用API密钥中间件进行保护
app.use('/api/role-manager', apiKeyMiddleware, roleManagerRoutes);
app.use('/api/property-manager', apiKeyMiddleware, propertyManagerRoutes);
app.use('/api/trading-manager', apiKeyMiddleware, tradingManagerRoutes);
app.use('/api/reward-manager', apiKeyMiddleware, rewardManagerRoutes);
app.use('/api/system', apiKeyMiddleware, systemRoutes);

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '服务器运行正常',
    time: new Date().toISOString()
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

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '内部服务器错误'
  });
});

// 创建HTTP服务器
const server = http.createServer(app);

// 只有在非测试环境才启动服务器
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`HTTP服务器运行在端口 ${PORT}`);
    console.log(`API文档地址: http://localhost:${PORT}/api-docs`);
  });
}

// 导出app实例用于测试
export { app }; 