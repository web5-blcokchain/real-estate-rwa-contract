import { Router } from 'express';
import { getRoles, grantRole, revokeRole } from '../controllers/roleManagerController';

const router = Router();

/**
 * @swagger
 * /api/role-manager/roles/{address}:
 *   get:
 *     summary: 获取地址的角色信息
 *     description: 查询指定地址拥有的角色权限
 *     parameters:
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
 *         description: 成功返回角色信息
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
 *                     address:
 *                       type: string
 *                       example: "0x1234..."
 *                     roles:
 *                       type: object
 *                       properties:
 *                         isAdmin:
 *                           type: boolean
 *                           example: true
 *                         isManager:
 *                           type: boolean
 *                           example: false
 *                         isTrader:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: 无效的请求参数
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/roles/:address', getRoles);

/**
 * @swagger
 * /api/role-manager/grant-role:
 *   post:
 *     summary: 授予角色
 *     description: 给指定地址授予特定角色
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
 *               - address
 *               - role
 *               - adminPrivateKey
 *             properties:
 *               address:
 *                 type: string
 *                 description: 接收角色的地址
 *                 example: "0x1234..."
 *               role:
 *                 type: string
 *                 enum: [admin, manager, trader]
 *                 description: 角色类型
 *                 example: "manager"
 *               adminPrivateKey:
 *                 type: string
 *                 description: 管理员私钥
 *                 example: "0xabcd..."
 *     responses:
 *       200:
 *         description: 成功授予角色
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
 *                     transaction:
 *                       type: string
 *                       example: "0xabcd..."
 *                     message:
 *                       type: string
 *                       example: "已成功授予 0x1234... manager 角色"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/grant-role', grantRole);

/**
 * @swagger
 * /api/role-manager/revoke-role:
 *   post:
 *     summary: 撤销角色
 *     description: 撤销指定地址的特定角色
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
 *               - address
 *               - role
 *               - adminPrivateKey
 *             properties:
 *               address:
 *                 type: string
 *                 description: 被撤销角色的地址
 *                 example: "0x1234..."
 *               role:
 *                 type: string
 *                 enum: [admin, manager, trader]
 *                 description: 角色类型
 *                 example: "manager"
 *               adminPrivateKey:
 *                 type: string
 *                 description: 管理员私钥
 *                 example: "0xabcd..."
 *     responses:
 *       200:
 *         description: 成功撤销角色
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
 *                     transaction:
 *                       type: string
 *                       example: "0xabcd..."
 *                     message:
 *                       type: string
 *                       example: "已成功撤销 0x1234... 的 manager 角色"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/revoke-role', revokeRole);

export default router;