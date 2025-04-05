/**
 * 交易相关路由
 */
const express = require('express');
const router = express.Router();
const tradingController = require('../controllers/trading.controller');

/**
 * @swagger
 * /api/v1/trading/orders:
 *   get:
 *     summary: 获取所有交易订单
 *     description: 返回所有交易订单的列表
 *     tags: [Trading]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页记录数
 *       - in: query
 *         name: property
 *         schema:
 *           type: string
 *         description: 按房产ID哈希过滤
 *     responses:
 *       200:
 *         description: 成功获取订单列表
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           orderId:
 *                             type: string
 *                             example: "1"
 *                           seller:
 *                             type: string
 *                             example: "0x..."
 *                           token:
 *                             type: string
 *                             example: "0x..."
 *                           amount:
 *                             type: string
 *                             example: "100000"
 *                           price:
 *                             type: string
 *                             example: "50000000000000000000"
 *                           active:
 *                             type: boolean
 *                             example: true
 *                           tokenSymbol:
 *                             type: string
 *                             example: "JPTOK1"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         pageSize:
 *                           type: integer
 *                           example: 10
 *                         totalItems:
 *                           type: integer
 *                           example: 100
 *                         totalPages:
 *                           type: integer
 *                           example: 10
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/orders', tradingController.getAllOrders);

/**
 * @swagger
 * /api/v1/trading/orders/{orderId}:
 *   get:
 *     summary: 获取订单详情
 *     description: 根据订单ID获取订单详细信息
 *     tags: [Trading]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: 订单ID
 *     responses:
 *       200:
 *         description: 成功获取订单详情
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
 *                     orderId:
 *                       type: string
 *                       example: "1"
 *                     seller:
 *                       type: string
 *                       example: "0x..."
 *                     token:
 *                       type: string
 *                       example: "0x..."
 *                     amount:
 *                       type: string
 *                       example: "100000"
 *                     price:
 *                       type: string
 *                       example: "50000000000000000000"
 *                     active:
 *                       type: boolean
 *                       example: true
 *                     tokenSymbol:
 *                       type: string
 *                       example: "JPTOK1"
 *                     tokenName:
 *                       type: string
 *                       example: "Tokyo Property 1"
 *                     propertyIdHash:
 *                       type: string
 *                       example: "0x..."
 *                     propertyId:
 *                       type: string
 *                       example: "JP-TOKYO-001"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 订单未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/orders/:orderId', tradingController.getOrderById);

/**
 * @swagger
 * /api/v1/trading/orders:
 *   post:
 *     summary: 创建出售订单
 *     description: 创建通证出售订单
 *     tags: [Trading]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - amount
 *               - price
 *               - privateKey
 *             properties:
 *               token:
 *                 type: string
 *                 example: "0x..."
 *                 description: 通证合约地址
 *               amount:
 *                 type: string
 *                 example: "100000"
 *                 description: 出售数量
 *               price:
 *                 type: string
 *                 example: "50000000000000000000"
 *                 description: 出售价格（以wei为单位）
 *               privateKey:
 *                 type: string
 *                 description: 卖家私钥
 *     responses:
 *       201:
 *         description: 订单创建成功
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
 *                     orderId:
 *                       type: string
 *                       example: "1"
 *                     txHash:
 *                       type: string
 *                       example: "0x..."
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/orders', tradingController.createOrder);

/**
 * @swagger
 * /api/v1/trading/orders/{orderId}/execute:
 *   post:
 *     summary: 执行交易订单
 *     description: 购买订单中的通证
 *     tags: [Trading]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: 订单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - privateKey
 *             properties:
 *               privateKey:
 *                 type: string
 *                 description: 买家私钥
 *     responses:
 *       200:
 *         description: 交易执行成功
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
 *                     txHash:
 *                       type: string
 *                       example: "0x..."
 *                     blockNumber:
 *                       type: integer
 *                       example: 1234567
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 订单未找到
 *       500:
 *         description: 服务器内部错误
 */
router.post('/orders/:orderId/execute', tradingController.executeOrder);

/**
 * @swagger
 * /api/v1/trading/orders/{orderId}:
 *   delete:
 *     summary: 取消订单
 *     description: 取消通证出售订单
 *     tags: [Trading]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: 订单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - privateKey
 *             properties:
 *               privateKey:
 *                 type: string
 *                 description: 卖家私钥
 *     responses:
 *       200:
 *         description: 订单取消成功
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
 *                     txHash:
 *                       type: string
 *                       example: "0x..."
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 订单未找到
 *       500:
 *         description: 服务器内部错误
 */
router.delete('/orders/:orderId', tradingController.cancelOrder);

module.exports = router; 