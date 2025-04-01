import { Router } from 'express';
import { 
  distributeRewards, 
  claimRewards, 
  getClaimableRewards, 
  getRewardHistory 
} from '../controllers/rewardManagerController.js';

const router = Router();

/**
 * @swagger
 * /api/reward-manager/distribute:
 *   post:
 *     summary: 分发奖励
 *     description: 向指定地址分发房产的奖励
 *     tags: [奖励管理]
 *     parameters:
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - amount
 *               - toAddresses
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产唯一标识符
 *                 example: "P12345"
 *               amount:
 *                 type: string
 *                 description: 奖励总金额
 *                 example: "100"
 *               toAddresses:
 *                 type: array
 *                 description: 接收奖励的地址列表
 *                 items:
 *                   type: string
 *                 example: ["0x1234...", "0x5678..."]
 *               managerRole:
 *                 type: string
 *                 description: 管理员角色名称
 *                 default: "manager"
 *                 example: "manager"
 *     responses:
 *       200:
 *         description: 成功分发奖励
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/distribute', distributeRewards);

/**
 * @swagger
 * /api/reward-manager/claim:
 *   post:
 *     summary: 领取奖励
 *     description: 领取指定房产的奖励
 *     tags: [奖励管理]
 *     parameters:
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产唯一标识符
 *                 example: "P12345"
 *               traderRole:
 *                 type: string
 *                 description: 交易者角色名称
 *                 default: "trader"
 *                 example: "trader"
 *     responses:
 *       200:
 *         description: 成功领取奖励
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/claim', claimRewards);

/**
 * @swagger
 * /api/reward-manager/claimable/{propertyId}/{address}:
 *   get:
 *     summary: 获取可领取的奖励
 *     description: 获取指定地址在特定房产上可领取的奖励
 *     tags: [奖励管理]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: 房产唯一标识符
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: 以太坊地址
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回可领取奖励
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/claimable/:propertyId/:address', getClaimableRewards);

/**
 * @swagger
 * /api/reward-manager/history/{propertyId}:
 *   get:
 *     summary: 获取奖励历史
 *     description: 获取指定房产的奖励分发历史
 *     tags: [奖励管理]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: 房产唯一标识符
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: 可选的以太坊地址，用于筛选特定地址的奖励历史
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回奖励历史
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/history/:propertyId', getRewardHistory);

export default router; 