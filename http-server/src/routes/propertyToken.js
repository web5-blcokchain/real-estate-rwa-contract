/**
 * 房产代币路由
 * 处理与PropertyToken合约相关的API请求
 */
const express = require('express');
const router = express.Router();
const propertyTokenController = require('../controllers/propertyTokenController');
const { apiKey } = require('../middlewares');

/**
 * @swagger
 * tags:
 *   name: Property Token
 *   description: 房产代币相关API
 */

/**
 * @swagger
 * /api/v1/property-token/balance/{propertyId}/{address}:
 *   get:
 *     summary: 获取指定地址的代币余额
 *     tags: [Property Token]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: propertyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 资产ID
 *       - name: address
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 查询的地址
 *     responses:
 *       200:
 *         description: 成功，返回代币余额
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/balance/:propertyId/:address', apiKey, propertyTokenController.getTokenBalance);

/**
 * @swagger
 * /api/v1/property-token/total-supply/{propertyId}:
 *   get:
 *     summary: 获取代币的总供应量
 *     tags: [Property Token]
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
 *         description: 成功，返回代币总供应量
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/total-supply/:propertyId', apiKey, propertyTokenController.getTotalSupply);

/**
 * @swagger
 * /api/v1/property-token/transfer:
 *   post:
 *     summary: 转移代币
 *     tags: [Property Token]
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
 *               - to
 *               - amount
 *               - privateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 资产ID
 *               to:
 *                 type: string
 *                 description: 接收者地址
 *               amount:
 *                 type: integer
 *                 description: 转移数量
 *               privateKey:
 *                 type: string
 *                 description: 发送者的私钥
 *     responses:
 *       200:
 *         description: 成功，代币已转移
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/transfer', apiKey, propertyTokenController.transferTokens);

/**
 * @swagger
 * /api/v1/property-token/approve:
 *   post:
 *     summary: 授权代币
 *     tags: [Property Token]
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
 *               - spender
 *               - amount
 *               - privateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 资产ID
 *               spender:
 *                 type: string
 *                 description: 被授权者地址
 *               amount:
 *                 type: integer
 *                 description: 授权数量
 *               privateKey:
 *                 type: string
 *                 description: 持有者的私钥
 *     responses:
 *       200:
 *         description: 成功，代币已授权
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/approve', apiKey, propertyTokenController.approveTokens);

/**
 * @swagger
 * /api/v1/property-token/allowance/{propertyId}/{owner}/{spender}:
 *   get:
 *     summary: 获取代币授权额度
 *     tags: [Property Token]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: propertyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 资产ID
 *       - name: owner
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 持有者地址
 *       - name: spender
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 被授权者地址
 *     responses:
 *       200:
 *         description: 成功，返回授权额度
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/allowance/:propertyId/:owner/:spender', apiKey, propertyTokenController.getAllowance);

/**
 * @swagger
 * /api/v1/property-token/metadata/{propertyId}:
 *   get:
 *     summary: 获取代币元数据
 *     tags: [Property Token]
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
 *         description: 成功，返回代币元数据
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/metadata/:propertyId', apiKey, propertyTokenController.getTokenMetadata);

module.exports = router; 