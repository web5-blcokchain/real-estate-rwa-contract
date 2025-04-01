import { Router } from 'express';
import { getRoles, grantRole, revokeRole, getRoleAddresses } from '../controllers/roleManagerController.js';

const router = Router();

/**
 * @swagger
 * /api/role-manager/roles/{address}:
 *   get:
 *     summary: 获取地址的角色信息
 *     description: 查询指定地址拥有的角色权限
 *     tags: [角色管理]
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
 *                           example: false
 *                         isManager:
 *                           type: boolean
 *                           example: true
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
 * /api/role-manager/grant:
 *   post:
 *     summary: 授予角色
 *     description: 给指定地址授予特定角色
 *     tags: [角色管理]
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
 *               adminRole:
 *                 type: string
 *                 description: 管理员角色名称，默认为admin
 *                 example: "admin"
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
router.post('/grant', grantRole);

/**
 * @swagger
 * /api/role-manager/revoke:
 *   post:
 *     summary: 撤销角色
 *     description: 撤销指定地址的特定角色
 *     tags: [角色管理]
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
 *               adminRole:
 *                 type: string
 *                 description: 管理员角色名称，默认为admin
 *                 example: "admin"
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
router.post('/revoke', revokeRole);

/**
 * @swagger
 * /api/role-manager/addresses:
 *   get:
 *     summary: 获取角色地址列表
 *     description: 获取所有角色的地址列表
 *     tags: [角色管理]
 *     parameters:
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回角色地址列表
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
 *                     admins:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["0x1234...", "0x5678..."]
 *                     managers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["0x9abc...", "0xdef0..."]
 *                     traders:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["0x1122...", "0x3344..."]
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/addresses', getRoleAddresses);

export default router; 