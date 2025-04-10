const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../../middleware/auth');
const ValidatorMiddleware = require('../../middleware/validator');
const TradingManagerController = require('../../controllers/core/TradingManagerController');

// 创建控制器实例
const tradingManagerController = new TradingManagerController();

/**
 * @swagger
 * tags:
 *   name: Trading Manager
 *   description: Trading manager operations
 */

// 创建订单
router.post('/orders',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateOrderCreation,
    (req, res) => tradingManagerController.createOrder(req, res)
);

// 取消订单
router.post('/orders/:orderId/cancel',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.cancelOrder(req, res)
);

// 执行订单
router.post('/orders/:orderId/execute',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.executeOrder(req, res)
);

// 设置手续费率
router.post('/fee-rate',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateFeeRate,
    (req, res) => tradingManagerController.setFeeRate(req, res)
);

// 设置最小交易金额
router.post('/min-trade-amount',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateMinTradeAmount,
    (req, res) => tradingManagerController.setMinTradeAmount(req, res)
);

// 暂停合约
router.post('/pause',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.pause(req, res)
);

// 恢复合约
router.post('/unpause',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.unpause(req, res)
);

// 获取订单信息
router.get('/orders/:orderId',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.getOrder(req, res)
);

// 获取所有订单
router.get('/orders',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.getAllOrders(req, res)
);

// 获取交易信息
router.get('/trades/:tradeId',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.getTrade(req, res)
);

// 获取所有交易
router.get('/trades',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.getAllTrades(req, res)
);

// 获取交易参数
router.get('/parameters',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.getTradingParameters(req, res)
);

// 发起紧急提现
router.post('/emergency-withdrawal/initiate',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateEmergencyWithdrawal,
    (req, res) => tradingManagerController.initiateEmergencyWithdrawal(req, res)
);

// 执行紧急提现
router.post('/emergency-withdrawal/execute',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateEmergencyWithdrawal,
    (req, res) => tradingManagerController.executeEmergencyWithdrawal(req, res)
);

// 获取紧急提现信息
router.get('/emergency-withdrawal/:propertyId',
    AuthMiddleware.validateApiKey,
    (req, res) => tradingManagerController.getEmergencyWithdrawal(req, res)
);

module.exports = router; 