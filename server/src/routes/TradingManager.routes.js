/**
 * TradingManager合约路由
 * 提供房产代币交易功能的API路由
 */
const express = require('express');
const TradingManagerController = require('../controllers/TradingManager.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 获取合约地址
router.get('/address', apiKey, TradingManagerController.getContractAddress);

// 创建卖单
router.post('/createOrder', apiKey, TradingManagerController.createOrder);

// 取消订单
router.post('/cancelOrder', apiKey, TradingManagerController.cancelOrder);

// 执行订单
router.post('/executeOrder', apiKey, TradingManagerController.executeOrder);

// 获取订单信息
router.get('/order/:orderId', apiKey, TradingManagerController.getOrder);

// 获取交易信息
router.get('/trade/:tradeId', apiKey, TradingManagerController.getTrade);

// 获取用户订单
router.get('/userOrders/:user', apiKey, TradingManagerController.getUserOrders);

// 获取用户交易
router.get('/userTrades/:user', apiKey, TradingManagerController.getUserTrades);

// 获取代币交易
router.get('/tokenTrades/:token', apiKey, TradingManagerController.getTokenTrades);

// 获取用户的所有代币地址
router.get('/userTokens/:user', apiKey, TradingManagerController.getUserTokens);

// 获取订单总数
router.get('/orderCount', apiKey, TradingManagerController.getOrderCount);

// 获取交易总数
router.get('/tradeCount', apiKey, TradingManagerController.getTradeCount);

// 获取代币当前价格
router.get('/price/:token', apiKey, TradingManagerController.getCurrentPrice);

// 设置代币初始价格
router.post('/setInitialPrice', apiKey, TradingManagerController.setInitialPrice);

// 设置代币当前价格
router.post('/setCurrentPrice', apiKey, TradingManagerController.setCurrentPrice);

// 获取代币交易量
router.get('/tradingVolume/:token', apiKey, TradingManagerController.getTokenTradingVolume);

module.exports = router; 