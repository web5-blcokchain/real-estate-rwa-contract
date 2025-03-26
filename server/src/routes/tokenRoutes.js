const express = require('express');
const router = express.Router();
const TokenController = require('../controllers/tokenController');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authMiddleware } = require('../middlewares/authMiddleware');
const BaseRouter = require('../../../shared/routes/baseRouter');
const { ethers } = require('ethers');
const { validators } = require('../middlewares/validator');
const { param, body, query } = require('express-validator');
const { validateRequest } = require('../middlewares/validator');

/**
 * @swagger
 * /api/tokens:
 *   get:
 *     summary: 获取所有代币
 *     tags: [Tokens]
 *     responses:
 *       200:
 *         description: 成功获取所有代币列表
 */
router.get('/', asyncHandler(TokenController.getAllTokens));

/**
 * @swagger
 * /api/tokens/property/{propertyId}:
 *   get:
 *     summary: 获取特定房产的代币
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         schema:
 *           type: string
 *         required: true
 *         description: 房产ID
 *     responses:
 *       200:
 *         description: 成功获取代币信息
 *       404:
 *         description: 找不到房产对应的代币
 */
router.get('/property/:propertyId', asyncHandler(TokenController.getRealEstateToken));

/**
 * @swagger
 * /api/tokens/implementation:
 *   get:
 *     summary: 获取代币实现合约地址
 *     tags: [Tokens]
 *     responses:
 *       200:
 *         description: 成功获取代币实现合约地址
 */
router.get('/implementation', asyncHandler(TokenController.getTokenImplementation));

/**
 * @swagger
 * /api/tokens:
 *   post:
 *     summary: 创建新代币
 *     tags: [Tokens]
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
 *               - name
 *               - symbol
 *               - initialSupply
 *               - initialHolder
 *             properties:
 *               propertyId:
 *                 type: string
 *               name:
 *                 type: string
 *               symbol:
 *                 type: string
 *               decimals:
 *                 type: number
 *                 default: 18
 *               maxSupply:
 *                 type: string
 *               initialSupply:
 *                 type: string
 *               initialHolder:
 *                 type: string
 *     responses:
 *       201:
 *         description: 代币创建成功
 *       400:
 *         description: 无效的请求参数
 */
router.post('/', authMiddleware(), asyncHandler(TokenController.createToken));

/**
 * @swagger
 * /api/tokens/implementation:
 *   put:
 *     summary: 更新代币实现合约地址
 *     tags: [Tokens]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - implementation
 *             properties:
 *               implementation:
 *                 type: string
 *                 description: 新实现合约地址
 *     responses:
 *       200:
 *         description: 代币实现合约地址更新成功
 *       400:
 *         description: 无效的请求参数
 */
router.put('/implementation', authMiddleware(), asyncHandler(TokenController.updateTokenImplementation));

/**
 * @swagger
 * /api/tokens/{tokenAddress}/whitelist:
 *   post:
 *     summary: 添加地址到白名单
 *     tags: [Tokens]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: 代币合约地址
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: 要添加到白名单的地址
 *     responses:
 *       200:
 *         description: 地址成功添加到白名单
 *       400:
 *         description: 无效的请求参数
 */
router.post('/:tokenAddress/whitelist', authMiddleware(), asyncHandler(TokenController.addToWhitelist));

/**
 * @swagger
 * /api/tokens/{tokenAddress}/whitelist/batch:
 *   post:
 *     summary: 批量添加地址到白名单
 *     tags: [Tokens]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: 代币合约地址
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addresses
 *             properties:
 *               addresses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要添加到白名单的地址列表
 *     responses:
 *       200:
 *         description: 地址成功批量添加到白名单
 *       400:
 *         description: 无效的请求参数
 */
router.post('/:tokenAddress/whitelist/batch', authMiddleware(), asyncHandler(TokenController.batchAddToWhitelist));

/**
 * @swagger
 * /api/tokens/{tokenAddress}/whitelist:
 *   delete:
 *     summary: 从白名单移除地址
 *     tags: [Tokens]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: 代币合约地址
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               address:
 *                 type: string
 *                 description: 要从白名单移除的地址
 *     responses:
 *       200:
 *         description: 地址成功从白名单移除
 *       400:
 *         description: 无效的请求参数
 */
router.delete('/:tokenAddress/whitelist', authMiddleware(), asyncHandler(TokenController.removeFromWhitelist));

/**
 * @swagger
 * /api/tokens/{tokenAddress}/whitelist/batch:
 *   delete:
 *     summary: 批量从白名单移除地址
 *     tags: [Tokens]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: 代币合约地址
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addresses
 *             properties:
 *               addresses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要从白名单移除的地址列表
 *     responses:
 *       200:
 *         description: 地址成功批量从白名单移除
 *       400:
 *         description: 无效的请求参数
 */
router.delete('/:tokenAddress/whitelist/batch', authMiddleware(), asyncHandler(TokenController.batchRemoveFromWhitelist));

/**
 * @swagger
 * /api/tokens/{tokenAddress}/whitelist/{address}:
 *   get:
 *     summary: 检查地址是否在白名单中
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: tokenAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: 代币合约地址
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: 要检查的地址
 *     responses:
 *       200:
 *         description: 成功获取白名单状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 whitelisted:
 *                   type: boolean
 *       400:
 *         description: 无效的请求参数
 */
router.get('/:tokenAddress/whitelist/:address', asyncHandler(TokenController.isWhitelisted));

/**
 * 代币路由类
 */
class TokenRouter extends BaseRouter {
  constructor() {
    super();
    this.setupRoutes();
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 获取所有代币
    this.get('/', validators.paginationValidators, TokenController.getAllTokens);

    // 获取特定代币详情
    this.get('/:address', [
      param('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      validateRequest
    ], TokenController.getTokenByAddress);

    // 创建新代币
    this.post('/', validators.tokenValidators.create, TokenController.createToken, {
      auth: true,
      permissions: ['operator']
    });

    // 铸造代币
    this.post('/:address/mint', [
      param('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      body('to').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('接收地址格式不正确'),
      body('amount').isNumeric().withMessage('金额必须是数字'),
      validateRequest
    ], TokenController.mintToken, {
      auth: true,
      permissions: ['operator']
    });

    // 销毁代币
    this.post('/:address/burn', [
      param('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      body('amount').isNumeric().withMessage('金额必须是数字'),
      validateRequest
    ], TokenController.burnToken, {
      auth: true,
      permissions: ['operator']
    });

    // 转移代币
    this.post('/:address/transfer', [
      param('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      ...validators.tokenValidators.transfer.filter(v => v !== validateRequest),
      validateRequest
    ], TokenController.transferToken);

    // 获取代币余额
    this.get('/:address/balance/:userAddress', [
      param('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      param('userAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('用户地址格式不正确'),
      validateRequest
    ], TokenController.getBalance);

    // 获取代币历史
    this.get('/:address/history', [
      param('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      query('from').optional().isInt({ min: 0 }).withMessage('起始块高必须是非负整数'),
      query('to').optional().isInt({ min: 0 }).withMessage('结束块高必须是非负整数'),
      validators.paginationValidators
    ], TokenController.getTokenHistory);
  }
}

// 创建路由实例
const tokenRouter = new TokenRouter();

module.exports = tokenRouter.getRouter(); 