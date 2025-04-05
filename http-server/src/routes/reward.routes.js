/**
 * 收益分配相关路由
 */
const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/reward.controller');

/**
 * @swagger
 * /api/v1/rewards/distributions:
 *   get:
 *     summary: 获取收益分配列表
 *     description: 返回所有收益分配的列表
 *     tags: [Reward]
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
 *         description: 成功获取收益分配列表
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
 *                           distributionId:
 *                             type: string
 *                             example: "1"
 *                           propertyIdHash:
 *                             type: string
 *                             example: "0x..."
 *                           amount:
 *                             type: string
 *                             example: "1000000000000000000"
 *                           description:
 *                             type: string
 *                             example: "2023年第1季度租金收益"
 *                           timestamp:
 *                             type: integer
 *                             example: 1680000000
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
router.get('/distributions', rewardController.getAllDistributions);

/**
 * @swagger
 * /api/v1/rewards/distributions/{distributionId}:
 *   get:
 *     summary: 获取收益分配详情
 *     description: 根据分配ID获取收益分配详细信息
 *     tags: [Reward]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: distributionId
 *         schema:
 *           type: string
 *         required: true
 *         description: 分配ID
 *     responses:
 *       200:
 *         description: 成功获取收益分配详情
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
 *                     distributionId:
 *                       type: string
 *                       example: "1"
 *                     propertyIdHash:
 *                       type: string
 *                       example: "0x..."
 *                     propertyId:
 *                       type: string
 *                       example: "JP-TOKYO-001"
 *                     amount:
 *                       type: string
 *                       example: "1000000000000000000"
 *                     description:
 *                       type: string
 *                       example: "2023年第1季度租金收益"
 *                     timestamp:
 *                       type: integer
 *                       example: 1680000000
 *                     tokenAddress:
 *                       type: string
 *                       example: "0x..."
 *                     tokenSymbol:
 *                       type: string
 *                       example: "JPTOK1"
 *                     claimableTotal:
 *                       type: string
 *                       example: "1000000000000000000"
 *                     claimedTotal:
 *                       type: string
 *                       example: "500000000000000000"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 分配记录未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/distributions/:distributionId', rewardController.getDistributionById);

/**
 * @swagger
 * /api/v1/rewards/distributions:
 *   post:
 *     summary: 创建收益分配
 *     description: 创建新的收益分配
 *     tags: [Reward]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyIdHash
 *               - amount
 *               - description
 *               - privateKey
 *             properties:
 *               propertyIdHash:
 *                 type: string
 *                 example: "0x..."
 *                 description: 房产ID哈希
 *               amount:
 *                 type: string
 *                 example: "1000000000000000000"
 *                 description: 分配金额（以wei为单位）
 *               description:
 *                 type: string
 *                 example: "2023年第1季度租金收益"
 *                 description: 分配描述
 *               applyFees:
 *                 type: boolean
 *                 example: true
 *                 description: 是否应用费用
 *               paymentToken:
 *                 type: string
 *                 example: "0x0000000000000000000000000000000000000000"
 *                 description: 支付通证地址（0地址表示ETH）
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       201:
 *         description: 收益分配创建成功
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
 *                     distributionId:
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
router.post('/distributions', rewardController.createDistribution);

/**
 * @swagger
 * /api/v1/rewards/distributions/{distributionId}/claim:
 *   post:
 *     summary: 领取收益
 *     description: 领取指定分配ID的收益
 *     tags: [Reward]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: distributionId
 *         schema:
 *           type: string
 *         required: true
 *         description: 分配ID
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
 *                 description: 用户私钥
 *     responses:
 *       200:
 *         description: 收益领取成功
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
 *                     amount:
 *                       type: string
 *                       example: "100000000000000000"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 分配记录未找到
 *       500:
 *         description: 服务器内部错误
 */
router.post('/distributions/:distributionId/claim', rewardController.claimRewards);

/**
 * @swagger
 * /api/v1/rewards/distributions/{distributionId}/claimable/{address}:
 *   get:
 *     summary: 查询可领取收益
 *     description: 查询指定地址在指定分配ID中可领取的收益
 *     tags: [Reward]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: distributionId
 *         schema:
 *           type: string
 *         required: true
 *         description: 分配ID
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: 用户地址
 *     responses:
 *       200:
 *         description: 成功获取可领取收益
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
 *                     claimable:
 *                       type: string
 *                       example: "100000000000000000"
 *                     claimed:
 *                       type: string
 *                       example: "0"
 *                     total:
 *                       type: string
 *                       example: "100000000000000000"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 分配记录未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/distributions/:distributionId/claimable/:address', rewardController.getClaimableAmount);

module.exports = router; 