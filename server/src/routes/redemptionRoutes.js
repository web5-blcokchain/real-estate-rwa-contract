const express = require('express');
const router = express.Router();
const RedemptionController = require('../controllers/redemptionController');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/redemptions:
 *   get:
 *     summary: 获取所有赎回请求
 *     tags: [Redemptions]
 *     responses:
 *       200:
 *         description: 成功获取所有赎回请求
 */
router.get('/', asyncHandler(RedemptionController.getAllRedemptionRequests));

/**
 * @swagger
 * /api/redemptions/{requestId}:
 *   get:
 *     summary: 获取特定赎回请求详情
 *     tags: [Redemptions]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         schema:
 *           type: string
 *         required: true
 *         description: 赎回请求ID
 *     responses:
 *       200:
 *         description: 成功获取赎回请求详情
 *       404:
 *         description: 找不到赎回请求
 */
router.get('/:requestId', asyncHandler(RedemptionController.getRedemptionRequest));

/**
 * @swagger
 * /api/redemptions/stablecoin/{stablecoinAddress}:
 *   get:
 *     summary: 检查稳定币是否受支持
 *     tags: [Redemptions]
 *     parameters:
 *       - in: path
 *         name: stablecoinAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: 稳定币合约地址
 *     responses:
 *       200:
 *         description: 成功检查稳定币支持状态
 */
router.get('/stablecoin/:stablecoinAddress', asyncHandler(RedemptionController.isSupportedStablecoin));

/**
 * @swagger
 * /api/redemptions/{requestId}/approve:
 *   post:
 *     summary: 批准赎回请求
 *     tags: [Redemptions]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         schema:
 *           type: string
 *         required: true
 *         description: 赎回请求ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stablecoinAmount
 *             properties:
 *               stablecoinAmount:
 *                 type: string
 *                 description: 稳定币金额（以wei为单位）
 *     responses:
 *       200:
 *         description: 赎回请求批准成功
 *       404:
 *         description: 找不到赎回请求
 */
router.post('/:requestId/approve', authMiddleware(), asyncHandler(RedemptionController.approveRedemption));

/**
 * @swagger
 * /api/redemptions/{requestId}/reject:
 *   post:
 *     summary: 拒绝赎回请求
 *     tags: [Redemptions]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         schema:
 *           type: string
 *         required: true
 *         description: 赎回请求ID
 *     responses:
 *       200:
 *         description: 赎回请求拒绝成功
 *       404:
 *         description: 找不到赎回请求
 */
router.post('/:requestId/reject', authMiddleware(), asyncHandler(RedemptionController.rejectRedemption));

/**
 * @swagger
 * /api/redemptions/{requestId}/complete:
 *   post:
 *     summary: 完成赎回请求
 *     tags: [Redemptions]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         schema:
 *           type: string
 *         required: true
 *         description: 赎回请求ID
 *     responses:
 *       200:
 *         description: 赎回请求完成成功
 *       404:
 *         description: 找不到赎回请求
 */
router.post('/:requestId/complete', authMiddleware(), asyncHandler(RedemptionController.completeRedemption));

/**
 * @swagger
 * /api/redemptions/stablecoin:
 *   post:
 *     summary: 添加支持的稳定币
 *     tags: [Redemptions]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stablecoinAddress
 *             properties:
 *               stablecoinAddress:
 *                 type: string
 *                 description: 稳定币合约地址
 *     responses:
 *       200:
 *         description: 稳定币添加成功
 *       400:
 *         description: 无效的请求参数
 */
router.post('/stablecoin', authMiddleware(), asyncHandler(RedemptionController.addSupportedStablecoin));

/**
 * @swagger
 * /api/redemptions/stablecoin:
 *   delete:
 *     summary: 移除支持的稳定币
 *     tags: [Redemptions]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stablecoinAddress
 *             properties:
 *               stablecoinAddress:
 *                 type: string
 *                 description: 稳定币合约地址
 *     responses:
 *       200:
 *         description: 稳定币移除成功
 *       400:
 *         description: 无效的请求参数
 */
router.delete('/stablecoin', authMiddleware(), asyncHandler(RedemptionController.removeSupportedStablecoin));

/**
 * @swagger
 * /api/redemptions/withdraw:
 *   post:
 *     summary: 紧急提款
 *     tags: [Redemptions]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - to
 *               - amount
 *             properties:
 *               token:
 *                 type: string
 *                 description: 代币合约地址
 *               to:
 *                 type: string
 *                 description: 接收者地址
 *               amount:
 *                 type: string
 *                 description: 提款金额
 *     responses:
 *       200:
 *         description: 紧急提款成功
 *       400:
 *         description: 无效的请求参数
 */
router.post('/withdraw', authMiddleware(), asyncHandler(RedemptionController.emergencyWithdraw));

module.exports = router; 