import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger.js';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import roleManagerRouter from './roleManager.js';
import propertyManagerRouter from './propertyManager.js';
import tradingManagerRouter from './trading.js';
import contractInteractionRouter from './contractInteraction.js';
import systemRouter from './system.js';
import { validateApiKey } from '../middlewares/auth.js';

dotenv.config();

const router = express.Router();

// 健康检查端点
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'HTTP服务器正常运行',
    timestamp: new Date().toISOString()
  });
});

// API文档
router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerSpec));

// API路由
const apiRouter = express.Router();
router.use('/api', apiRouter);

// 应用全局中间件
apiRouter.use(cors());
apiRouter.use(bodyParser.json());
apiRouter.use(validateApiKey); // API密钥验证

// 注册路由
apiRouter.use('/role-manager', roleManagerRouter);
apiRouter.use('/property-manager', propertyManagerRouter);
apiRouter.use('/trading', tradingManagerRouter);
apiRouter.use('/contract', contractInteractionRouter);
apiRouter.use('/system', systemRouter);

// 添加404处理中间件 - 当没有路由匹配时返回404
router.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: '请求的路径不存在'
  });
});

export default router; 