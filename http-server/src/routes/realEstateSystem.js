/**
 * RealEstateSystem路由文件
 * 定义与RealEstateSystem合约相关的API端点
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/realEstateSystemController');

/**
 * @swagger
 * /api/v1/real-estate-system/info:
 *   get:
 *     summary: 获取系统信息
 *     tags: [RealEstateSystem]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回系统信息
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/info', controller.getSystemInfo);

/**
 * @swagger
 * /api/v1/real-estate-system/contract-addresses:
 *   get:
 *     summary: 获取所有合约地址
 *     tags: [RealEstateSystem]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回所有合约地址
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/contract-addresses', controller.getContractAddresses);

/**
 * @swagger
 * /api/v1/real-estate-system/parameter/{paramName}:
 *   get:
 *     summary: 获取系统参数值
 *     tags: [RealEstateSystem]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: paramName
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 参数名称
 *     responses:
 *       200:
 *         description: 成功，返回参数值
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/parameter/:paramName', controller.getSystemParameter);

/**
 * @swagger
 * /api/v1/real-estate-system/parameter:
 *   post:
 *     summary: 更新系统参数
 *     tags: [RealEstateSystem]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paramName
 *               - paramValue
 *               - privateKey
 *             properties:
 *               paramName:
 *                 type: string
 *                 description: 参数名称
 *               paramValue:
 *                 type: string
 *                 description: 参数值
 *               privateKey:
 *                 type: string
 *                 description: 管理员的私钥
 *     responses:
 *       200:
 *         description: 成功，参数已更新
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/parameter', controller.updateSystemParameter);

/**
 * @swagger
 * /api/v1/real-estate-system/paused:
 *   get:
 *     summary: 检查系统是否处于暂停状态
 *     tags: [RealEstateSystem]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回系统暂停状态
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/paused', controller.isSystemPaused);

/**
 * @swagger
 * /api/v1/real-estate-system/pause:
 *   post:
 *     summary: 暂停系统
 *     tags: [RealEstateSystem]
 *     security:
 *       - ApiKeyAuth: []
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
 *                 description: 管理员的私钥
 *     responses:
 *       200:
 *         description: 成功，系统已暂停
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/pause', controller.pauseSystem);

/**
 * @swagger
 * /api/v1/real-estate-system/unpause:
 *   post:
 *     summary: 恢复系统
 *     tags: [RealEstateSystem]
 *     security:
 *       - ApiKeyAuth: []
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
 *                 description: 管理员的私钥
 *     responses:
 *       200:
 *         description: 成功，系统已恢复
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/unpause', controller.unpauseSystem);

module.exports = router; 