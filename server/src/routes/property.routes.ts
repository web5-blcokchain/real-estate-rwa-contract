import { Router } from 'express';
import { PropertyController } from '../controllers/property.controller';

const router = Router();
const controller = new PropertyController();

// 注册房产
router.post('/', controller.registerProperty);

// 获取房产列表
router.get('/', controller.getProperties);

// 获取房产详情
router.get('/:id', controller.getProperty);

// 更新房产状态
router.patch('/:id/status', controller.updatePropertyStatus);

export default router; 