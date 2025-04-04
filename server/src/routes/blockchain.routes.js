/**
 * 区块链相关路由
 */
const express = require('express');
const blockchainController = require('../controllers/blockchain.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

/**
 * @swagger
 * /api/v1/blockchain/info:
 *   get:
 *     summary: 获取区块链网络信息
 *     description: 返回当前连接的区块链网络信息，包括网络类型、区块高度等
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功返回区块链网络信息
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
 *                       example: "testnet"
 *                     blockHeight:
 *                       type: number
 *                       example: 12345678
 *                     isConnected:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
router.get('/info', apiKey, blockchainController.getNetworkInfo);

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
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易哈希
 *     responses:
 *       200:
 *         description: 成功返回交易信息
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
 *       401:
 *         description: 未授权
 *       404:
 *         description: 交易未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/tx/:hash', apiKey, blockchainController.getTransaction);

/**
 * @swagger
 * /api/v1/blockchain/gas-price:
 *   get:
 *     summary: 获取当前Gas价格
 *     description: 返回当前网络的Gas价格估计
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功返回Gas价格信息
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
 *                     slow:
 *                       type: string
 *                       example: "20"
 *                     medium:
 *                       type: string
 *                       example: "25"
 *                     fast:
 *                       type: string
 *                       example: "30"
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
router.get('/gas-price', apiKey, blockchainController.getGasPrice);

/**
 * @swagger
 * /api/blockchain/status:
 *   get:
 *     summary: 获取区块链连接状态
 *     description: 检查区块链连接状态及基本网络信息
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功返回区块链连接状态
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
 *                     networkInfo:
 *                       type: object
 *                       properties:
 *                         networkType:
 *                           type: string
 *                           example: "localhost"
 *                         chainId:
 *                           type: number
 *                           example: 31337
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
router.get('/status', apiKey, blockchainController.getStatus);

module.exports = router; 