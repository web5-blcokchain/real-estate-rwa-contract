/**
 * 角色管理相关路由
 */
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');

/**
 * @swagger
 * /api/v1/roles:
 *   get:
 *     summary: 获取所有角色列表
 *     description: 返回系统中定义的所有角色
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功获取角色列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "ADMIN_ROLE"
 *                       hash:
 *                         type: string
 *                         example: "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
 *                       description:
 *                         type: string
 *                         example: "管理员角色"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.get('/', roleController.getAllRoles);

/**
 * @swagger
 * /api/v1/roles/{roleHash}/members:
 *   get:
 *     summary: 获取角色成员
 *     description: 获取拥有指定角色的所有地址
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: roleHash
 *         schema:
 *           type: string
 *         required: true
 *         description: 角色哈希值
 *     responses:
 *       200:
 *         description: 成功获取角色成员
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       address:
 *                         type: string
 *                         example: "0x..."
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 角色未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/:roleHash/members', roleController.getRoleById);

/**
 * @swagger
 * /api/v1/roles/address/{address}:
 *   get:
 *     summary: 获取地址的角色
 *     description: 获取指定地址拥有的所有角色
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: 以太坊地址
 *     responses:
 *       200:
 *         description: 成功获取地址的角色
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "ADMIN_ROLE"
 *                       hash:
 *                         type: string
 *                         example: "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
 *                       description:
 *                         type: string
 *                         example: "管理员角色"
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       401:
 *         description: 未授权访问
 *       400:
 *         description: 无效的地址
 *       500:
 *         description: 服务器内部错误
 */
router.get('/address/:address', roleController.getAccountRoles);

/**
 * @swagger
 * /api/v1/roles/grant:
 *   post:
 *     summary: 授予角色
 *     description: 向指定地址授予角色
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleHash
 *               - address
 *               - keyType
 *             properties:
 *               roleHash:
 *                 type: string
 *                 example: "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
 *                 description: 角色哈希值
 *               address:
 *                 type: string
 *                 example: "0x..."
 *                 description: 接收角色的地址
 *               keyType:
 *                 type: string
 *                 enum: [admin, manager, operator, user]
 *                 example: "admin"
 *                 description: 密钥类型（admin, manager, operator, user）
 *     responses:
 *       200:
 *         description: 角色授予成功
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
 *                       example: "0x..."
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/grant', roleController.grantRole);

/**
 * @swagger
 * /api/v1/roles/revoke:
 *   post:
 *     summary: 撤销角色
 *     description: 从指定地址撤销角色
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleHash
 *               - address
 *               - keyType
 *             properties:
 *               roleHash:
 *                 type: string
 *                 example: "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
 *                 description: 角色哈希值
 *               address:
 *                 type: string
 *                 example: "0x..."
 *                 description: 撤销角色的地址
 *               keyType:
 *                 type: string
 *                 enum: [admin, manager, operator, user]
 *                 example: "admin"
 *                 description: 密钥类型（admin, manager, operator, user）
 *     responses:
 *       200:
 *         description: 角色撤销成功
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
 *                       example: "0x..."
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/revoke', roleController.revokeRole);

/**
 * @swagger
 * /api/v1/roles/users/{address}:
 *   put:
 *     summary: 设置用户角色
 *     description: 为指定地址设置角色
 *     tags: [Roles]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: 用户地址
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - keyType
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, MANAGER, OPERATOR]
 *                 description: 角色名称
 *               keyType:
 *                 type: string
 *                 enum: [admin, manager, operator, user]
 *                 example: "admin"
 *                 description: 密钥类型（admin, manager, operator, user）
 *     responses:
 *       200:
 *         description: 角色设置成功
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
 *                     transactionHash:
 *                       type: string
 *                       example: "0x..."
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.put('/users/:address', roleController.setUserRole);

/**
 * @swagger
 * /api/v1/roles/batch:
 *   post:
 *     summary: 批量设置用户角色
 *     description: 为多个地址批量设置角色
 *     tags: [Roles]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - users
 *               - keyType
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: "0x..."
 *                     role:
 *                       type: string
 *                       enum: [USER, MANAGER, OPERATOR]
 *               keyType:
 *                 type: string
 *                 enum: [admin, manager, operator, user]
 *                 example: "admin"
 *                 description: 密钥类型（admin, manager, operator, user）
 *     responses:
 *       200:
 *         description: 批量角色设置成功
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
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           address:
 *                             type: string
 *                             example: "0x..."
 *                           role:
 *                             type: string
 *                             example: "USER"
 *                           success:
 *                             type: boolean
 *                             example: true
 *                           transactionHash:
 *                             type: string
 *                             example: "0x..."
 *                           error:
 *                             type: string
 *                             example: null
 *                 timestamp:
 *                   type: string
 *                   example: "2023-04-01T12:00:00.000Z"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
router.post('/batch', roleController.setBatchRoles);

module.exports = router; 