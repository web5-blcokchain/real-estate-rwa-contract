import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
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

// 初始化Express应用
const app = express();
const PORT = env.getServerConfig().port || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

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

// API鉴权中间件
app.use(apiKeyMiddleware);

// 路由
app.use('/api/role-manager', roleManagerRoutes);
app.use('/api/property-manager', propertyManagerRoutes);
app.use('/api/trading-manager', tradingManagerRoutes);
app.use('/api/reward-manager', rewardManagerRoutes);
app.use('/api/system', systemRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`API文档可在 http://localhost:${PORT}/api-docs 访问`);
});

export default app; 