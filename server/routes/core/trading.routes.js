const express = require('express');
const router = express.Router();
const TradingController = require('../../controllers/core/TradingController');
const AuthMiddleware = require('../../middleware/auth');
const { apiRateLimit } = require('../../middleware/rate-limit');
const { validateRequired, validateAddress } = require('../../middleware/validator');
const { ControllerFactory } = require('../../utils');

/**
 * @swagger
 * tags:
 *   name: Trading
 *   description: 交易操作
 */

/**
 * @swagger
 * /api/trading/execute:
 *   post:
 *     summary: 执行交易
 *     tags: [Trading]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractAddress
 *               - tokenAddress
 *               - seller
 *               - buyer
 *               - amount
 *               - price
 *             properties:
 *               contractAddress:
 *                 type: string
 *                 description: 合约地址
 *               tokenAddress:
 *                 type: string
 *                 description: 代币地址
 *               seller:
 *                 type: string
 *                 description: 卖方地址
 *               buyer:
 *                 type: string
 *                 description: 买方地址
 *               amount:
 *                 type: string
 *                 description: 交易数量
 *               price:
 *                 type: string
 *                 description: 交易价格
 *     responses:
 *       200:
 *         description: 交易执行成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/execute',
  apiRateLimit,
  validateRequired(['contractAddress', 'tokenAddress', 'seller', 'buyer', 'amount', 'price']),
  validateAddress('contractAddress'),
  validateAddress('tokenAddress'),
  validateAddress('seller'),
  validateAddress('buyer'),
  ControllerFactory.getHandler(TradingController, 'executeTrade')
);

/**
 * @swagger
 * /api/trading/batch-execute:
 *   post:
 *     summary: 批量执行交易
 *     tags: [Trading]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractAddress
 *               - trades
 *             properties:
 *               contractAddress:
 *                 type: string
 *                 description: 合约地址
 *               trades:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - tokenAddress
 *                     - seller
 *                     - buyer
 *                     - amount
 *                     - price
 *                   properties:
 *                     tokenAddress:
 *                       type: string
 *                     seller:
 *                       type: string
 *                     buyer:
 *                       type: string
 *                     amount:
 *                       type: string
 *                     price:
 *                       type: string
 *     responses:
 *       200:
 *         description: 批量交易执行成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/batch-execute',
  apiRateLimit,
  validateRequired(['contractAddress', 'trades']),
  validateAddress('contractAddress'),
  ControllerFactory.getHandler(TradingController, 'batchExecuteTrade')
);

/**
 * @swagger
 * /api/trading/history/{tokenAddress}:
 *   get:
 *     summary: 获取交易历史
 *     tags: [Trading]
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: 代币地址
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: 合约地址
 *     responses:
 *       200:
 *         description: 成功获取交易历史
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.get('/history/:tokenAddress',
  apiRateLimit,
  validateRequired(['contractAddress'], 'query'),
  validateAddress('contractAddress', 'query'),
  validateAddress('tokenAddress', 'params'),
  ControllerFactory.getHandler(TradingController, 'getTradeHistory')
);

/**
 * @swagger
 * /api/v1/core/trading/detail/{tokenAddress}/{transactionHash}:
 *   get:
 *     tags: [Trading]
 *     summary: 获取交易详情
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: 代币合约地址
 *       - in: path
 *         name: transactionHash
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易哈希
 *     responses:
 *       200:
 *         description: 成功获取交易详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionHash:
 *                       type: string
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *                     amount:
 *                       type: string
 *                     blockNumber:
 *                       type: number
 *                     timestamp:
 *                       type: number
 */
router.get('/detail/:tokenAddress/:transactionHash', 
  AuthMiddleware.validateApiKey,
  validateAddress('tokenAddress', 'params'),
  ControllerFactory.getHandler(TradingController, 'getTradeDetail')
);

module.exports = router; 