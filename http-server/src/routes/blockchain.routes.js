/**
 * 区块链相关路由
 */
const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchain.controller');

/**
 * @swagger
 * /api/v1/blockchain/info:
 *   get:
 *     summary: 获取区块链网络信息
 *     description: 返回当前连接的区块链网络信息
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功获取网络信息
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
 *                     networkType:
 *                       type: string
 *                       example: localhost
 *                     chainId:
 *                       type: integer
 *                       example: 31337
 *                     name:
 *                       type: string
 *                       example: Hardhat Network
 *                     blockNumber:
 *                       type: integer
 *                       example: 1234567
 *                     gasPrice:
 *                       type: string
 *                       example: "20000000000"
 *                     formattedGasPrice:
 *                       type: string
 *                       example: "20.00 Gwei"
 *                     isConnected:
 *                       type: boolean
 *                       example: true
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/info', blockchainController.getNetworkInfo);

/**
 * @swagger
 * /api/v1/blockchain/status:
 *   get:
 *     summary: 获取区块链连接状态
 *     description: 检查区块链服务是否正常连接
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功获取连接状态
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
 *                     connected:
 *                       type: boolean
 *                       example: true
 *                     networkType:
 *                       type: string
 *                       example: localhost
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/status', blockchainController.getConnectionStatus);

/**
 * @swagger
 * /api/v1/blockchain/tx/{hash}:
 *   get:
 *     summary: 获取交易信息
 *     description: 根据交易哈希获取交易详情
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         schema:
 *           type: string
 *         required: true
 *         description: 交易哈希
 *     responses:
 *       200:
 *         description: 成功获取交易信息
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
 *                     hash:
 *                       type: string
 *                       example: "0x..."
 *                     blockNumber:
 *                       type: integer
 *                       example: 1234567
 *                     from:
 *                       type: string
 *                       example: "0x..."
 *                     to:
 *                       type: string
 *                       example: "0x..."
 *                     value:
 *                       type: string
 *                       example: "0"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 交易未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/tx/:hash', blockchainController.getTransaction);

/**
 * @swagger
 * /api/v1/blockchain/gas-price:
 *   get:
 *     summary: 获取当前Gas价格
 *     description: 返回区块链当前的Gas价格
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功获取Gas价格
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
 *                     gasPrice:
 *                       type: string
 *                       example: "20000000000"
 *                     formattedGasPrice:
 *                       type: string
 *                       example: "20.00 Gwei"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/gas-price', blockchainController.getGasPrice);

module.exports = router; 