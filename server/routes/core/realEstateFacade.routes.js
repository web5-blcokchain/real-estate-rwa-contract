/**
 * 房地产门面路由
 */
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/core/realEstateFacade.controller');
const AuthMiddleware = require('../../middleware/auth');

// 应用API密钥验证中间件
router.use(AuthMiddleware.validateApiKey);

// 注册新房产
router.post('/register-property', controller.registerProperty.bind(controller));

// 获取房产信息
router.get('/property/:propertyId', controller.getProperty.bind(controller));

// 获取房产列表
router.get('/list-properties', controller.listProperties.bind(controller));

// 更新房产状态
router.put('/update-property-status', controller.updatePropertyStatus.bind(controller));

// 创建卖单
router.post('/create-sell-order', controller.createSellOrder.bind(controller));

// 购买代币
router.post('/buy-tokens', controller.buyTokens.bind(controller));

module.exports = router; 