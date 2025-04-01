import { Router } from 'express';
import { 
  getSystemStatus, 
  toggleEmergencyMode, 
  toggleTradingPause, 
  togglePause 
} from '../controllers/systemController.js';

const router = Router();

/**
 * @swagger
 * /api/system/status:
 *   get:
 *     summary: 获取系统状态
 *     description: 获取系统的当前运行状态和统计信息
 *     tags: [系统管理]
 *     parameters:
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回系统状态
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
 *                     systemHealth:
 *                       type: object
 *                       properties:
 *                         isEmergency:
 *                           type: boolean
 *                           example: false
 *                         isTradingPaused:
 *                           type: boolean
 *                           example: false
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         propertyCount:
 *                           type: number
 *                           example: 5
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/status', getSystemStatus);

/**
 * @swagger
 * /api/system/emergency:
 *   post:
 *     summary: 切换紧急模式
 *     description: 开启或关闭系统紧急模式
 *     tags: [系统管理]
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
 *               - enable
 *             properties:
 *               enable:
 *                 type: boolean
 *                 description: 是否启用紧急模式
 *                 example: true
 *               adminRole:
 *                 type: string
 *                 description: 管理员角色名称
 *                 default: "admin"
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: 成功切换紧急模式
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
 *                     isEmergency:
 *                       type: boolean
 *                       example: true
 *                     transaction:
 *                       type: string
 *                       example: "0x1234..."
 *                     message:
 *                       type: string
 *                       example: "已启用紧急模式"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/emergency', toggleEmergencyMode);

/**
 * @swagger
 * /api/system/trading-pause:
 *   post:
 *     summary: 暂停或恢复交易
 *     description: 暂停或恢复系统交易功能
 *     tags: [系统管理]
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
 *               - enable
 *             properties:
 *               enable:
 *                 type: boolean
 *                 description: 是否暂停交易
 *                 example: true
 *               adminRole:
 *                 type: string
 *                 description: 管理员角色名称
 *                 default: "admin"
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: 成功暂停或恢复交易
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/trading-pause', toggleTradingPause);

/**
 * @swagger
 * /api/system/pause:
 *   post:
 *     summary: 暂停或恢复合约功能
 *     description: 暂停或恢复指定合约的功能
 *     tags: [系统管理]
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
 *               - contractName
 *               - enable
 *             properties:
 *               contractName:
 *                 type: string
 *                 description: 合约名称
 *                 example: "PropertyManager"
 *               enable:
 *                 type: boolean
 *                 description: 是否暂停合约
 *                 example: true
 *               adminRole:
 *                 type: string
 *                 description: 管理员角色名称
 *                 default: "admin"
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: 成功暂停或恢复合约功能
 *       400:
 *         description: 参数错误或不支持的操作
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/pause', togglePause);

export default router; 