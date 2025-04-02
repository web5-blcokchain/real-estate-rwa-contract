/**
 * PropertyManager路由
 * 定义与资产管理相关的API端点
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/propertyManagerController');

/**
 * @swagger
 * /api/v1/property-manager/register:
 *   post:
 *     summary: 注册新资产
 *     tags: [PropertyManager]
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
 *               - ownerAddress
 *               - propertyData
 *               - initialSupply
 *               - privateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 资产唯一标识
 *               ownerAddress:
 *                 type: string
 *                 description: 资产所有者地址
 *               propertyData:
 *                 type: string
 *                 description: 资产数据(JSON字符串)
 *               initialSupply:
 *                 type: string
 *                 description: 初始代币发行量
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       201:
 *         description: 成功，资产已注册
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/register', controller.registerProperty);

/**
 * @swagger
 * /api/v1/property-manager/info/{propertyId}:
 *   get:
 *     summary: 获取资产信息
 *     tags: [PropertyManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: propertyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 资产ID
 *     responses:
 *       200:
 *         description: 成功，返回资产信息
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/info/:propertyId', controller.getPropertyInfo);

/**
 * @swagger
 * /api/v1/property-manager/update:
 *   post:
 *     summary: 更新资产信息
 *     tags: [PropertyManager]
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
 *               - propertyData
 *               - privateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 资产ID
 *               propertyData:
 *                 type: string
 *                 description: 资产数据(JSON字符串)
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       200:
 *         description: 成功，资产信息已更新
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/update', controller.updatePropertyInfo);

/**
 * @swagger
 * /api/v1/property-manager/all:
 *   get:
 *     summary: 获取所有资产ID
 *     tags: [PropertyManager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回所有资产ID
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/all', controller.getAllPropertyIds);

/**
 * @swagger
 * /api/v1/property-manager/status/{propertyId}:
 *   get:
 *     summary: 验证资产状态
 *     tags: [PropertyManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: propertyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 资产ID
 *     responses:
 *       200:
 *         description: 成功，返回资产状态
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/status/:propertyId', controller.verifyPropertyStatus);

module.exports = router; 