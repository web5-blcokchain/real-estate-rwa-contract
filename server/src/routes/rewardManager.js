import { Router } from 'express';
import { 
  distributeRewards, 
  claimRewards, 
  getClaimableRewards, 
  addRewardToken, 
  removeRewardToken 
} from '../controllers/rewardManagerController';

const router = Router();

/**
 * @swagger
 * /api/reward-manager/distribute:
 *   post:
 *     summary:分发奖励
 *     description:向多个接收者分发代币奖励
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     requestBody:
 *       required:
 *       content:
 *         application/json:
 *           schema:
 *             type:
 *             required:
 *               - token
 *               - recipients
 *               - amounts
 *               - managerPrivateKey
 *             properties:
 *               token:
 *                 type:
 *                 description:代币合约地址
 *                 example:"0x1234..."
 *               recipients:
 *                 type:
 *                 items:
 *                   type:
 *                 description:接收者地址数组
 *                 example:["0xabcd...", "0xefgh..."]
 *               amounts:
 *                 type:
 *                 items:
 *                   type:
 *                 description:对应的金额数组
 *                 example:["10", "20"]
 *               managerPrivateKey:
 *                 type:
 *                 description:管理员私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功分发奖励
 *       400:
 *         description:参数错误
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/distribute', distributeRewards);

/**
 * @swagger
 * /api/reward-manager/claim:
 *   post:
 *     summary:领取奖励
 *     description:领取指定代币的奖励
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     requestBody:
 *       required:
 *       content:
 *         application/json:
 *           schema:
 *             type:
 *             required:
 *               - token
 *               - userPrivateKey
 *             properties:
 *               token:
 *                 type:
 *                 description:代币合约地址
 *                 example:"0x1234..."
 *               userPrivateKey:
 *                 type:
 *                 description:用户私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功领取奖励
 *       400:
 *         description:参数错误或没有可领取的奖励
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/claim', claimRewards);

/**
 * @swagger
 * /api/reward-manager/claimable/{address}/{token}:
 *   get:
 *     summary:获取可领取的奖励
 *     description:查询用户可领取的特定代币奖励
 *     parameters:
 *       - in:
 *         name:
 *         required:
 *         schema:
 *           type:
 *         description:用户地址
 *       - in:
 *         name:
 *         required:
 *         schema:
 *           type:
 *         description:代币合约地址
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     responses:
 *       200:
 *         description:成功返回可领取的奖励
 *       400:
 *         description:参数错误
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.get('/claimable/:address/:token', getClaimableRewards);

/**
 * @swagger
 * /api/reward-manager/add-token:
 *   post:
 *     summary:添加奖励代币
 *     description:添加新的代币作为奖励代币
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     requestBody:
 *       required:
 *       content:
 *         application/json:
 *           schema:
 *             type:
 *             required:
 *               - token
 *               - managerPrivateKey
 *             properties:
 *               token:
 *                 type:
 *                 description:代币合约地址
 *                 example:"0x1234..."
 *               managerPrivateKey:
 *                 type:
 *                 description:管理员私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功添加奖励代币
 *       400:
 *         description:参数错误或代币已存在
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/add-token', addRewardToken);

/**
 * @swagger
 * /api/reward-manager/remove-token:
 *   post:
 *     summary:移除奖励代币
 *     description:从奖励代币列表中移除代币
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     requestBody:
 *       required:
 *       content:
 *         application/json:
 *           schema:
 *             type:
 *             required:
 *               - token
 *               - managerPrivateKey
 *             properties:
 *               token:
 *                 type:
 *                 description:代币合约地址
 *                 example:"0x1234..."
 *               managerPrivateKey:
 *                 type:
 *                 description:管理员私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功移除奖励代币
 *       400:
 *         description:参数错误或代币不存在
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/remove-token', removeRewardToken);

export default router;
