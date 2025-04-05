/**
 * 系统管理相关路由
 */
const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system.controller');

/**
 * @swagger
 * /api/v1/system/status:
 *   get:
 *     summary: 获取系统状态
 *     description: 获取当前系统运行状态
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功获取系统状态
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
 *                     statusCode:
 *                       type: integer
 *                       example: 1
 *                     statusName:
 *                       type: string
 *                       example: "ACTIVE"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/status', systemController.getSystemStatus);

/**
 * @swagger
 * /api/v1/system/version:
 *   get:
 *     summary: 获取系统版本
 *     description: 获取当前系统版本和版本历史记录数量
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功获取系统版本
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
 *                     currentVersion:
 *                       type: integer
 *                       example: 1
 *                     versionHistoryCount:
 *                       type: integer
 *                       example: 3
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/version', systemController.getSystemVersion);

/**
 * @swagger
 * /api/v1/system/version-history:
 *   get:
 *     summary: 获取系统版本历史
 *     description: 获取系统版本更新历史记录
 *     tags: [System]
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
 *     responses:
 *       200:
 *         description: 成功获取版本历史
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
 *                           index:
 *                             type: integer
 *                             example: 0
 *                           version:
 *                             type: integer
 *                             example: 1
 *                           timestamp:
 *                             type: string
 *                             example: "2023-04-01T12:00:00.000Z"
 *                           description:
 *                             type: string
 *                             example: "初始版本"
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
 *                           example: 3
 *                         totalPages:
 *                           type: integer
 *                           example: 1
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/version-history', systemController.getVersionHistory);

/**
 * @swagger
 * /api/v1/system/components:
 *   get:
 *     summary: 获取系统组件信息
 *     description: 获取系统各个组件的地址和状态信息
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功获取系统组件信息
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
 *                     system:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           example: "0x..."
 *                         status:
 *                           type: integer
 *                           example: 1
 *                         statusName:
 *                           type: string
 *                           example: "ACTIVE"
 *                         version:
 *                           type: integer
 *                           example: 1
 *                     components:
 *                       type: object
 *                       properties:
 *                         facade:
 *                           type: object
 *                           properties:
 *                             address:
 *                               type: string
 *                               example: "0x..."
 *                             name:
 *                               type: string
 *                               example: "RealEstateFacade"
 *                         roleManager:
 *                           type: object
 *                           properties:
 *                             address:
 *                               type: string
 *                               example: "0x..."
 *                             name:
 *                               type: string
 *                               example: "RoleManager"
 *                         propertyManager:
 *                           type: object
 *                           properties:
 *                             address:
 *                               type: string
 *                               example: "0x..."
 *                             name:
 *                               type: string
 *                               example: "PropertyManager"
 *                         tradingManager:
 *                           type: object
 *                           properties:
 *                             address:
 *                               type: string
 *                               example: "0x..."
 *                             name:
 *                               type: string
 *                               example: "TradingManager"
 *                         rewardManager:
 *                           type: object
 *                           properties:
 *                             address:
 *                               type: string
 *                               example: "0x..."
 *                             name:
 *                               type: string
 *                               example: "RewardManager"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/components', systemController.getSystemComponents);

/**
 * @swagger
 * /api/v1/system/pause:
 *   post:
 *     summary: 暂停系统
 *     description: 暂停系统运行，禁止大部分操作
 *     tags: [System]
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
 *                 description: 管理员私钥
 *     responses:
 *       200:
 *         description: 成功暂停系统
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     txHash:
 *                       type: string
 *                       example: "0x..."
 *                     message:
 *                       type: string
 *                       example: "系统已暂停"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.post('/pause', systemController.pauseSystem);

/**
 * @swagger
 * /api/v1/system/unpause:
 *   post:
 *     summary: 恢复系统
 *     description: 恢复系统运行
 *     tags: [System]
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
 *                 description: 管理员私钥
 *     responses:
 *       200:
 *         description: 成功恢复系统
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     txHash:
 *                       type: string
 *                       example: "0x..."
 *                     message:
 *                       type: string
 *                       example: "系统已恢复"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.post('/unpause', systemController.unpauseSystem);

/**
 * @swagger
 * /api/v1/system/components:
 *   put:
 *     summary: 更新系统组件
 *     description: 更新系统组件的合约地址
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - componentName
 *               - newAddress
 *               - privateKey
 *             properties:
 *               componentName:
 *                 type: string
 *                 example: "roleManager"
 *                 description: 组件名称
 *               newAddress:
 *                 type: string
 *                 example: "0x..."
 *                 description: 新的合约地址
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       200:
 *         description: 成功更新系统组件
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     component:
 *                       type: string
 *                       example: "roleManager"
 *                     oldAddress:
 *                       type: string
 *                       example: "0x..."
 *                     newAddress:
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
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.put('/components', systemController.updateSystemComponent);

/**
 * @swagger
 * /api/v1/system/version:
 *   post:
 *     summary: 升级系统版本
 *     description: 升级系统版本并添加版本说明
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - privateKey
 *             properties:
 *               description:
 *                 type: string
 *                 example: "修复安全漏洞"
 *                 description: 版本更新说明
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       200:
 *         description: 成功升级系统版本
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
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     oldVersion:
 *                       type: integer
 *                       example: 1
 *                     newVersion:
 *                       type: integer
 *                       example: 2
 *                     description:
 *                       type: string
 *                       example: "修复安全漏洞"
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
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器内部错误
 */
router.post('/version', systemController.upgradeSystemVersion);

module.exports = router; 