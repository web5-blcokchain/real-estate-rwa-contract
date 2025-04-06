/**
 * 房产管理相关路由
 */
const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');

/**
 * @swagger
 * /api/v1/properties:
 *   get:
 *     summary: 获取所有已登记房产
 *     description: 返回所有已登记的房产信息列表
 *     tags: [Property]
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
 *         name: status
 *         schema:
 *           type: string
 *         description: 房产状态过滤
 *     responses:
 *       200:
 *         description: 成功获取房产列表
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
 *                           propertyIdHash:
 *                             type: string
 *                             example: "0x..."
 *                           propertyId:
 *                             type: string
 *                             example: "JP-TOKYO-001"
 *                           country:
 *                             type: string
 *                             example: "Japan"
 *                           tokenAddress:
 *                             type: string
 *                             example: "0x..."
 *                           status:
 *                             type: integer
 *                             example: 1
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
router.get('/', propertyController.getAllProperties);

/**
 * @swagger
 * /api/v1/properties/{propertyIdHash}:
 *   get:
 *     summary: 获取房产详情
 *     description: 根据房产ID哈希获取房产详细信息
 *     tags: [Property]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyIdHash
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID哈希
 *     responses:
 *       200:
 *         description: 成功获取房产详情
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
 *                     propertyIdHash:
 *                       type: string
 *                       example: "0x..."
 *                     propertyId:
 *                       type: string
 *                       example: "JP-TOKYO-001"
 *                     country:
 *                       type: string
 *                       example: "Japan"
 *                     metadataURI:
 *                       type: string
 *                       example: "ipfs://..."
 *                     tokenAddress:
 *                       type: string
 *                       example: "0x..."
 *                     tokenSymbol:
 *                       type: string
 *                       example: "JPTOK1"
 *                     tokenName:
 *                       type: string
 *                       example: "Tokyo Property 1"
 *                     totalSupply:
 *                       type: string
 *                       example: "1000000"
 *                     status:
 *                       type: integer
 *                       example: 1
 *                     valuation:
 *                       type: string
 *                       example: "10000000"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 房产未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/:propertyIdHash', propertyController.getPropertyById);

/**
 * @swagger
 * /api/v1/properties/register:
 *   post:
 *     summary: 登记新房产
 *     description: 登记新房产并创建对应的通证
 *     tags: [Property]
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
 *               - country
 *               - metadataURI
 *               - tokenName
 *               - tokenSymbol
 *               - initialSupply
 *               - keyType
 *             properties:
 *               propertyId:
 *                 type: string
 *                 example: "JP-TOKYO-001"
 *               country:
 *                 type: string
 *                 example: "Japan"
 *               metadataURI:
 *                 type: string
 *                 example: "ipfs://..."
 *               tokenName:
 *                 type: string
 *                 example: "Tokyo Property 1"
 *               tokenSymbol:
 *                 type: string
 *                 example: "JPTOK1"
 *               initialSupply:
 *                 type: string
 *                 example: "1000000"
 *               keyType:
 *                 type: string
 *                 enum: [admin, manager, operator, user]
 *                 example: "admin"
 *                 description: 密钥类型（admin, manager, operator, user）
 *     responses:
 *       201:
 *         description: 房产登记成功
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
 *                     propertyIdHash:
 *                       type: string
 *                       example: "0x..."
 *                     tokenAddress:
 *                       type: string
 *                       example: "0x..."
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
router.post('/register', propertyController.registerProperty);

/**
 * @swagger
 * /api/v1/properties/{propertyIdHash}/token-holders:
 *   get:
 *     summary: 获取房产通证持有人
 *     description: 返回房产通证的持有人列表
 *     tags: [Property]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyIdHash
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID哈希
 *     responses:
 *       200:
 *         description: 成功获取通证持有人
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       address:
 *                         type: string
 *                         example: "0x..."
 *                       balance:
 *                         type: string
 *                         example: "100000"
 *                       percentage:
 *                         type: string
 *                         example: "10.00"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 房产未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/:propertyIdHash/token-holders', propertyController.getTokenHolders);

module.exports = router; 