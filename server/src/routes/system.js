import { Router } from 'express';
import { 
  getSystemStatus, 
  toggleEmergencyMode, 
  toggleTradingPause, 
  getContractAddresses 
} from '../controllers/systemController';

const router = Router();

/**
 * @swagger
 * /api/system/status:
 *   get:
 *     summary:获取系统状态
 *     description:获取系统的当前状态信息
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     responses:
 *       200:
 *         description:成功返回系统状态
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.get('/status', getSystemStatus);

/**
 * @swagger
 * /api/system/emergency-mode:
 *   post:
 *     summary:切换紧急模式
 *     description:启用或禁用系统紧急模式
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
 *               - enable
 *               - adminPrivateKey
 *             properties:
 *               enable:
 *                 type:
 *                 description:是否启用紧急模式
 *                 example:
 *               adminPrivateKey:
 *                 type:
 *                 description:管理员私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功切换紧急模式
 *       400:
 *         description:参数错误或状态未变化
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/emergency-mode', toggleEmergencyMode);

/**
 * @swagger
 * /api/system/trading-pause:
 *   post:
 *     summary:暂停/恢复交易
 *     description:暂停或恢复系统交易功能
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
 *               - pause
 *               - adminPrivateKey
 *             properties:
 *               pause:
 *                 type:
 *                 description:是否暂停交易
 *                 example:
 *               adminPrivateKey:
 *                 type:
 *                 description:管理员私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功暂停/恢复交易
 *       400:
 *         description:参数错误或状态未变化
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/trading-pause', toggleTradingPause);

/**
 * @swagger
 * /api/system/contracts:
 *   get:
 *     summary:获取合约地址
 *     description:获取系统所有合约的地址
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     responses:
 *       200:
 *         description:成功返回合约地址
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.get('/contracts', getContractAddresses);

export default router;
