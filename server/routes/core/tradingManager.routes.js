/**
 * 交易管理路由
 */
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/core/tradingManager.controller');
const AuthMiddleware = require('../../middleware/auth');

// 应用API密钥验证中间件
router.use(AuthMiddleware.validateApiKey);

// 创建交易订单
router.post('/create-order', controller.createOrder.bind(controller));

// 取消订单
router.delete('/cancel-order/:orderId', controller.cancelOrder.bind(controller));

// 执行订单
router.post('/execute-order/:orderId', controller.executeOrder.bind(controller));

// 获取订单详情
router.get('/order/:orderId', controller.getOrder.bind(controller));

// 获取用户订单
router.get('/user-orders/:address', controller.getUserOrders.bind(controller));

// 获取交易详情
router.get('/trade/:tradeId', controller.getTrade.bind(controller));

// 获取用户交易
router.get('/user-trades/:address', controller.getUserTrades.bind(controller));

// 获取代币交易
router.get('/token-trades/:tokenAddress', controller.getTokenTrades.bind(controller));

module.exports = router; 