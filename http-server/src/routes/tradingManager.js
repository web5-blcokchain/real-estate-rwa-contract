/**
 * 交易管理路由
 * 处理与TradingManager合约相关的API请求
 */
const express = require('express');
const router = express.Router();
const tradingManagerController = require('../controllers/tradingManagerController');
const { apiKey } = require('../middlewares');

/**
 * @swagger
 * tags:
 *   name: Trading Manager
 *   description: 房产交易管理相关API
 */

/**
 * @swagger
 * /api/v1/trading-manager/order:
 *   post:
 *     summary: 创建交易订单
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - tokenAmount
 *               - pricePerToken
 *               - expireTime
 *               - privateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 资产ID
 *               tokenAmount:
 *                 type: string
 *                 description: 交易代币数量
 *               pricePerToken:
 *                 type: string
 *                 description: 单个代币价格
 *               expireTime:
 *                 type: string
 *                 format: date-time
 *                 description: 订单过期时间
 *               privateKey:
 *                 type: string
 *                 description: 卖家私钥
 *     responses:
 *       201:
 *         description: 成功，订单已创建
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/order', tradingManagerController.createOrder);

/**
 * @swagger
 * /api/v1/trading-manager/order/{orderId}:
 *   get:
 *     summary: 获取订单信息
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 订单ID
 *     responses:
 *       200:
 *         description: 成功，返回订单信息
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/order/:orderId', tradingManagerController.getOrderInfo);

/**
 * @swagger
 * /api/v1/trading-manager/execute:
 *   post:
 *     summary: 执行订单交易
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - privateKey
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: 订单ID
 *               privateKey:
 *                 type: string
 *                 description: 买家私钥
 *     responses:
 *       200:
 *         description: 成功，订单已执行
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/execute', tradingManagerController.executeOrder);

/**
 * @swagger
 * /api/v1/trading-manager/cancel:
 *   post:
 *     summary: 取消订单
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - privateKey
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: 订单ID
 *               privateKey:
 *                 type: string
 *                 description: 卖家私钥
 *     responses:
 *       200:
 *         description: 成功，订单已取消
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/cancel', tradingManagerController.cancelOrder);

/**
 * @swagger
 * /api/v1/trading-manager/active-orders:
 *   get:
 *     summary: 获取所有活跃订单
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回活跃订单列表
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/active-orders', tradingManagerController.getActiveOrders);

/**
 * @swagger
 * /api/v1/trading-manager/user-orders/{address}:
 *   get:
 *     summary: 获取用户订单
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户地址
 *     responses:
 *       200:
 *         description: 成功，返回用户订单列表
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/user-orders/:address', tradingManagerController.getUserOrders);

/**
 * @swagger
 * /api/v1/trading-manager/available-orders:
 *   get:
 *     summary: 获取可用交易订单列表
 *     tags: [Trading Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: 房产ID (可选，如果提供则按房产ID筛选)
 *     responses:
 *       200:
 *         description: 返回可用交易订单列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     propertyId:
 *                       type: string
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/available-orders', apiKey, tradingManagerController.getAvailableTradeOrders);

/**
 * @swagger
 * /api/v1/trading-manager/user-history/{userAddress}:
 *   get:
 *     summary: 获取用户交易历史
 *     tags: [Trading Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户地址
 *     responses:
 *       200:
 *         description: 返回用户交易历史
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userAddress:
 *                       type: string
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/user-history/:userAddress', apiKey, tradingManagerController.getUserTradeHistory);

/**
 * @swagger
 * /api/v1/trading-manager/offers:
 *   get:
 *     summary: 获取所有交易报价
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回所有交易报价
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/offers', tradingManagerController.getAllOffers);

/**
 * @swagger
 * /api/v1/trading-manager/offers/{offerId}:
 *   get:
 *     summary: 获取特定交易报价
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: offerId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 报价ID
 *     responses:
 *       200:
 *         description: 成功，返回报价详情
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       404:
 *         description: 报价不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/offers/:offerId', tradingManagerController.getOfferById);

/**
 * @swagger
 * /api/v1/trading-manager/offers/property/{propertyId}:
 *   get:
 *     summary: 获取特定房产的所有报价
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: propertyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 房产ID
 *     responses:
 *       200:
 *         description: 成功，返回房产的所有报价
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/offers/property/:propertyId', tradingManagerController.getOffersByProperty);

/**
 * @swagger
 * /api/v1/trading-manager/offers/user/{userAddress}:
 *   get:
 *     summary: 获取用户的所有报价
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: userAddress
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户地址
 *     responses:
 *       200:
 *         description: 成功，返回用户的所有报价
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/offers/user/:userAddress', tradingManagerController.getOffersByUser);

/**
 * @swagger
 * /api/v1/trading-manager/create-offer:
 *   post:
 *     summary: 创建新的交易报价
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - tokenAmount
 *               - pricePerToken
 *               - expiryDate
 *               - privateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产ID
 *               tokenAmount:
 *                 type: integer
 *                 description: 代币数量
 *               pricePerToken:
 *                 type: string
 *                 description: 每个代币的价格
 *               expiryDate:
 *                 type: string
 *                 description: 报价过期日期
 *               privateKey:
 *                 type: string
 *                 description: 卖家的私钥
 *     responses:
 *       200:
 *         description: 成功，报价已创建
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/create-offer', tradingManagerController.createOffer);

/**
 * @swagger
 * /api/v1/trading-manager/accept-offer:
 *   post:
 *     summary: 接受交易报价
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offerId
 *               - privateKey
 *             properties:
 *               offerId:
 *                 type: string
 *                 description: 报价ID
 *               privateKey:
 *                 type: string
 *                 description: 买家的私钥
 *     responses:
 *       200:
 *         description: 成功，报价已接受
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       404:
 *         description: 报价不存在或已过期
 *       500:
 *         description: 服务器错误
 */
router.post('/accept-offer', tradingManagerController.acceptOffer);

/**
 * @swagger
 * /api/v1/trading-manager/cancel-offer:
 *   post:
 *     summary: 取消交易报价
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offerId
 *               - privateKey
 *             properties:
 *               offerId:
 *                 type: string
 *                 description: 报价ID
 *               privateKey:
 *                 type: string
 *                 description: 卖家的私钥
 *     responses:
 *       200:
 *         description: 成功，报价已取消
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       404:
 *         description: 报价不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/cancel-offer', tradingManagerController.cancelOffer);

/**
 * @swagger
 * /api/v1/trading-manager/transaction-history:
 *   get:
 *     summary: 获取交易历史
 *     tags: [TradingManager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回交易历史
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/transaction-history', tradingManagerController.getTransactionHistory);

module.exports = router; 