const express = require('express');
const router = express.Router();
const PropertyController = require('../controllers/propertyController');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: 获取所有房产
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: 成功获取所有房产列表
 */
router.get('/', asyncHandler(PropertyController.getAllProperties));

/**
 * @swagger
 * /api/properties/{propertyId}:
 *   get:
 *     summary: 获取特定房产详情
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID
 *     responses:
 *       200:
 *         description: 成功获取房产详情
 *       404:
 *         description: 找不到房产
 */
router.get('/:propertyId', asyncHandler(PropertyController.getProperty));

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: 注册新房产
 *     tags: [Properties]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - country
 *               - metadataURI
 *             properties:
 *               propertyId:
 *                 type: string
 *               country:
 *                 type: string
 *               metadataURI:
 *                 type: string
 *     responses:
 *       201:
 *         description: 房产注册成功
 *       400:
 *         description: 无效的请求参数
 */
router.post('/', authMiddleware(), asyncHandler(PropertyController.registerProperty));

/**
 * @swagger
 * /api/properties/{propertyId}/approve:
 *   post:
 *     summary: 批准房产
 *     tags: [Properties]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID
 *     responses:
 *       200:
 *         description: 房产批准成功
 *       404:
 *         description: 找不到房产
 */
router.post('/:propertyId/approve', authMiddleware(), asyncHandler(PropertyController.approveProperty));

/**
 * @swagger
 * /api/properties/{propertyId}/reject:
 *   post:
 *     summary: 拒绝房产
 *     tags: [Properties]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID
 *     responses:
 *       200:
 *         description: 房产拒绝成功
 *       404:
 *         description: 找不到房产
 */
router.post('/:propertyId/reject', authMiddleware(), asyncHandler(PropertyController.rejectProperty));

/**
 * @swagger
 * /api/properties/{propertyId}/delist:
 *   post:
 *     summary: 下架房产
 *     tags: [Properties]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID
 *     responses:
 *       200:
 *         description: 房产下架成功
 *       404:
 *         description: 找不到房产
 */
router.post('/:propertyId/delist', authMiddleware(), asyncHandler(PropertyController.delistProperty));

/**
 * @swagger
 * /api/properties/{propertyId}/status:
 *   put:
 *     summary: 设置房产状态
 *     tags: [Properties]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: integer
 *                 description: 房产状态 (0=Pending, 1=Approved, 2=Rejected, 3=Delisted)
 *     responses:
 *       200:
 *         description: 房产状态设置成功
 *       400:
 *         description: 无效的请求参数
 *       404:
 *         description: 找不到房产
 */
router.put('/:propertyId/status', authMiddleware(), asyncHandler(PropertyController.setPropertyStatus));

module.exports = router; 