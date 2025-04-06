/**
 * RealEstateFacade合约路由
 */
const express = require('express');
const router = express.Router();
const facadeController = require('../controllers/facade.controller');

/**
 * @swagger
 * /api/v1/facade/property-token:
 *   post:
 *     summary: 注册不动产并创建对应的代币
 *     description: 注册新的不动产信息并为其创建相应的ERC20代币
 *     tags: [Facade]
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
 *               - propertyTokenImplementation
 *               - privateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 不动产的唯一标识符
 *                 example: "JP-TOKYO-001"
 *               country:
 *                 type: string
 *                 description: 不动产所在国家
 *                 example: "Japan"
 *               metadataURI:
 *                 type: string
 *                 description: 不动产元数据的URI
 *                 example: "ipfs://QmXyZ123456789"
 *               tokenName:
 *                 type: string
 *                 description: 代币名称
 *                 example: "Tokyo Apartment Token"
 *               tokenSymbol:
 *                 type: string
 *                 description: 代币符号
 *                 example: "TAT"
 *               initialSupply:
 *                 type: string
 *                 description: 初始代币供应量
 *                 example: "1000000000000000000000"
 *               propertyTokenImplementation:
 *                 type: string
 *                 description: PropertyToken合约的实现地址
 *                 example: "0x1234567890123456789012345678901234567890"
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥（只有管理员可以注册不动产）
 *                 example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *     responses:
 *       200:
 *         description: 成功注册不动产并创建代币
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
 *                     txHash:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *                     propertyIdHash:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *                     tokenAddress:
 *                       type: string
 *                       example: "0x1234567890123456789012345678901234567890"
 *                     gasUsed:
 *                       type: string
 *                       example: "1234567"
 *                     blockNumber:
 *                       type: integer
 *                       example: 12345
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/property-token', facadeController.registerPropertyAndCreateToken);

/**
 * @swagger
 * /api/v1/facade/property-status:
 *   put:
 *     summary: 更新不动产状态
 *     description: 更新指定不动产的状态（活跃、锁定、暂停、归档）
 *     tags: [Facade]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyIdHash
 *               - status
 *               - privateKey
 *             properties:
 *               propertyIdHash:
 *                 type: string
 *                 description: 不动产ID的哈希值
 *                 example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *               status:
 *                 type: integer
 *                 description: 新状态值（0=活跃，1=锁定，2=暂停，3=归档）
 *                 enum: [0, 1, 2, 3]
 *                 example: 0
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥（只有管理员可以更新不动产状态）
 *                 example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *     responses:
 *       200:
 *         description: 成功更新不动产状态
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
 *                     txHash:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *                     propertyIdHash:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *                     previousStatus:
 *                       type: string
 *                       example: "1"
 *                     newStatus:
 *                       type: string
 *                       example: "0"
 *                     gasUsed:
 *                       type: string
 *                       example: "54321"
 *                     blockNumber:
 *                       type: integer
 *                       example: 12345
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.put('/property-status', facadeController.updatePropertyStatus);

/**
 * @swagger
 * /api/v1/facade/claim-rewards:
 *   post:
 *     summary: 领取奖励
 *     description: 领取指定分配ID的可用奖励
 *     tags: [Facade]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distributionId
 *               - privateKey
 *             properties:
 *               distributionId:
 *                 type: integer
 *                 description: 奖励分配的ID
 *                 example: 1
 *               privateKey:
 *                 type: string
 *                 description: 领取者的私钥
 *                 example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *     responses:
 *       200:
 *         description: 成功领取奖励
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
 *                     txHash:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *                     distributionId:
 *                       type: string
 *                       example: "1"
 *                     amount:
 *                       type: string
 *                       example: "1000000000000000000"
 *                     gasUsed:
 *                       type: string
 *                       example: "65432"
 *                     blockNumber:
 *                       type: integer
 *                       example: 12346
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 请求参数错误或没有可领取的奖励
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/claim-rewards', facadeController.claimRewards);

/**
 * @swagger
 * /api/v1/facade/execute-trade:
 *   post:
 *     summary: 执行交易（购买代币）
 *     description: 执行指定订单ID的交易，购买代币
 *     tags: [Facade]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - privateKey
 *               - value
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: 订单ID
 *                 example: 1
 *               privateKey:
 *                 type: string
 *                 description: 买家的私钥
 *                 example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *               value:
 *                 type: string
 *                 description: 要发送的ETH金额（以wei为单位）
 *                 example: "1000000000000000000"
 *     responses:
 *       200:
 *         description: 成功执行交易
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
 *                     txHash:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 *                     orderId:
 *                       type: string
 *                       example: "1"
 *                     seller:
 *                       type: string
 *                       example: "0x1234567890123456789012345678901234567890"
 *                     token:
 *                       type: string
 *                       example: "0x0987654321098765432109876543210987654321"
 *                     amount:
 *                       type: string
 *                       example: "1000000000000000000"
 *                     price:
 *                       type: string
 *                       example: "2000000000000000000"
 *                     gasUsed:
 *                       type: string
 *                       example: "78901"
 *                     blockNumber:
 *                       type: integer
 *                       example: 12347
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 请求参数错误或订单不活跃
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/execute-trade', facadeController.executeTrade);

/**
 * @swagger
 * /api/v1/facade/version:
 *   get:
 *     summary: 获取RealEstateFacade合约版本
 *     description: 返回当前部署的RealEstateFacade合约的版本号
 *     tags: [Facade]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功获取合约版本
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
 *                     version:
 *                       type: string
 *                       example: "1"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/version', facadeController.getVersion);

module.exports = router; 