const express = require('express');
const router = express.Router();
const RentController = require('../controllers/rentController');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/rents:
 *   get:
 *     summary: 获取所有租金分配记录
 *     tags: [Rents]
 *     responses:
 *       200:
 *         description: 成功获取所有租金分配记录
 */
router.get('/', asyncHandler(RentController.getAllDistributions));

/**
 * @swagger
 * /api/rents/{distributionId}:
 *   get:
 *     summary: 获取特定租金分配记录详情
 *     tags: [Rents]
 *     parameters:
 *       - in: path
 *         name: distributionId
 *         schema:
 *           type: string
 *         required: true
 *         description: 分配记录ID
 *     responses:
 *       200:
 *         description: 成功获取租金分配记录详情
 *       404:
 *         description: 找不到租金分配记录
 */
router.get('/:distributionId', asyncHandler(RentController.getRentDistribution));

/**
 * @swagger
 * /api/rents/property/{propertyId}:
 *   get:
 *     summary: 按属性ID获取租金分配记录
 *     tags: [Rents]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID
 *     responses:
 *       200:
 *         description: 成功获取租金分配记录
 */
router.get('/property/:propertyId', asyncHandler(RentController.getDistributionsByPropertyId));

/**
 * @swagger
 * /api/rents/token/{tokenAddress}:
 *   get:
 *     summary: 按代币地址获取租金分配记录
 *     tags: [Rents]
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: 代币合约地址
 *     responses:
 *       200:
 *         description: 成功获取租金分配记录
 *       400:
 *         description: 无效的地址
 */
router.get('/token/:tokenAddress', asyncHandler(RentController.getDistributionsByToken));

/**
 * @swagger
 * /api/rents/{distributionId}/claimable/{account}:
 *   get:
 *     summary: 获取可领取的租金
 *     tags: [Rents]
 *     parameters:
 *       - in: path
 *         name: distributionId
 *         schema:
 *           type: string
 *         required: true
 *         description: 分配记录ID
 *       - in: path
 *         name: account
 *         schema:
 *           type: string
 *         required: true
 *         description: 账户地址
 *     responses:
 *       200:
 *         description: 成功获取可领取租金
 *       400:
 *         description: 无效的参数
 */
router.get('/:distributionId/claimable/:account', asyncHandler(RentController.getClaimableRent));

/**
 * @swagger
 * /api/rents:
 *   post:
 *     summary: 分配租金
 *     tags: [Rents]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenAddress
 *               - amount
 *               - propertyId
 *               - rentPeriodStart
 *               - rentPeriodEnd
 *             properties:
 *               tokenAddress:
 *                 type: string
 *                 description: 代币合约地址
 *               amount:
 *                 type: string
 *                 description: 租金金额
 *               snapshotId:
 *                 type: string
 *                 description: 快照ID (如果不指定则使用当前状态)
 *               propertyId:
 *                 type: string
 *                 description: 房产ID
 *               rentPeriodStart:
 *                 type: string
 *                 format: date-time
 *                 description: 租期开始时间
 *               rentPeriodEnd:
 *                 type: string
 *                 format: date-time
 *                 description: 租期结束时间
 *               description:
 *                 type: string
 *                 description: 分配说明
 *     responses:
 *       200:
 *         description: 租金分配成功
 *       400:
 *         description: 无效的请求参数
 */
router.post('/', authMiddleware(), asyncHandler(RentController.distributeRent));

/**
 * @swagger
 * /api/rents/{distributionId}/liquidate:
 *   post:
 *     summary: 清算未领取的租金
 *     tags: [Rents]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: distributionId
 *         schema:
 *           type: string
 *         required: true
 *         description: 分配记录ID
 *     responses:
 *       200:
 *         description: 未领取租金清算成功
 *       404:
 *         description: 找不到租金分配记录
 */
router.post('/:distributionId/liquidate', authMiddleware(), asyncHandler(RentController.liquidateUnclaimedRent));

module.exports = router; 