import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import propertyRoutes from './property.routes';
import tokenRoutes from './token.routes';
import rentRoutes from './rent.routes';
import redemptionRoutes from './redemption.routes';

const router = Router();

// 应用认证中间件到所有路由
router.use(authMiddleware);

// 注册路由
router.use('/properties', propertyRoutes);
router.use('/tokens', tokenRoutes);
router.use('/rents', rentRoutes);
router.use('/redemptions', redemptionRoutes);

export default router; 