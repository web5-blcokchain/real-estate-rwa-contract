/**
 * 系统路由
 * 定义系统相关的API路由
 */
const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { apiKey } = require('../middlewares');

/**
 * @swagger
 * /system/status:
 *   get:
 *     summary: 获取系统状态
 *     description: 获取服务器和区块链的状态信息
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 返回系统状态信息
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
 *                     server:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         environment:
 *                           type: string
 *                         timestamp:
 *                           type: string
 *                         uptime:
 *                           type: integer
 *                     blockchain:
 *                       type: object
 *                       properties:
 *                         activeNetwork:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             chainId:
 *                               type: integer
 *                         availableNetworks:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               chainId:
 *                                 type: integer
 */
router.get('/status', apiKey, systemController.getStatus);

/**
 * @swagger
 * /system/networks:
 *   get:
 *     summary: 获取区块链网络信息
 *     description: 获取可用的区块链网络列表和当前活动网络
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 返回网络信息
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
 *                     networks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           chainId:
 *                             type: integer
 *                           rpcUrl:
 *                             type: string
 *                           explorer:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                     activeNetwork:
 *                       type: string
 */
router.get('/networks', apiKey, systemController.getNetworks);

/**
 * @swagger
 * /system/networks/switch:
 *   post:
 *     summary: 切换区块链网络
 *     description: 切换当前活动的区块链网络
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
 *               - networkName
 *             properties:
 *               networkName:
 *                 type: string
 *                 description: 要切换到的网络名称
 *     responses:
 *       200:
 *         description: 网络切换成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     chainId:
 *                       type: integer
 *                     rpcUrl:
 *                       type: string
 */
router.post('/networks/switch', apiKey, systemController.switchNetwork);

/**
 * @swagger
 * /system/verify-signature:
 *   post:
 *     summary: 验证消息签名
 *     description: 验证消息的签名是否有效
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
 *               - message
 *               - signature
 *               - address
 *             properties:
 *               message:
 *                 type: string
 *                 description: 原始消息
 *               signature:
 *                 type: string
 *                 description: 消息签名
 *               address:
 *                 type: string
 *                 description: 签名者地址
 *     responses:
 *       200:
 *         description: 签名验证结果
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
 *                     isValid:
 *                       type: boolean
 *                     address:
 *                       type: string
 *                     message:
 *                       type: string
 */
router.post('/verify-signature', apiKey, systemController.verifySignature);

/**
 * @swagger
 * /system/sign-message:
 *   post:
 *     summary: 签名消息
 *     description: 使用提供的私钥对消息进行签名
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
 *               - message
 *               - privateKey
 *             properties:
 *               message:
 *                 type: string
 *                 description: 要签名的消息
 *               privateKey:
 *                 type: string
 *                 description: 用于签名的私钥
 *     responses:
 *       200:
 *         description: 签名成功
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
 *                     message:
 *                       type: string
 *                     signature:
 *                       type: string
 *                     address:
 *                       type: string
 */
router.post('/sign-message', apiKey, systemController.signMessage);

module.exports = router; 