/**
 * 角色管理路由
 * 处理与RoleManager合约相关的API请求
 */
const express = require('express');
const router = express.Router();
const roleManagerController = require('../controllers/roleManagerController');
const { apiKey } = require('../middlewares');

/**
 * @swagger
 * tags:
 *   name: Role Manager
 *   description: 角色管理相关API
 */

/**
 * @swagger
 * /api/v1/role-manager/grant:
 *   post:
 *     summary: 授予角色
 *     tags: [Role Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - account
 *               - privateKey
 *             properties:
 *               role:
 *                 type: string
 *                 description: 角色ID（字节字符串）
 *               account:
 *                 type: string
 *                 description: 接收角色的账户地址
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       200:
 *         description: 成功，角色已授予
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/grant', apiKey, roleManagerController.grantRole);

/**
 * @swagger
 * /api/v1/role-manager/revoke:
 *   post:
 *     summary: 撤销角色
 *     tags: [Role Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - account
 *               - privateKey
 *             properties:
 *               role:
 *                 type: string
 *                 description: 角色ID（字节字符串）
 *               account:
 *                 type: string
 *                 description: 撤销角色的账户地址
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       200:
 *         description: 成功，角色已撤销
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/revoke', apiKey, roleManagerController.revokeRole);

/**
 * @swagger
 * /api/v1/role-manager/has-role:
 *   post:
 *     summary: 检查账户是否拥有角色
 *     tags: [Role Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - account
 *             properties:
 *               role:
 *                 type: string
 *                 description: 角色ID（字节字符串）
 *               account:
 *                 type: string
 *                 description: 账户地址
 *     responses:
 *       200:
 *         description: 成功，返回角色检查结果
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/has-role', apiKey, roleManagerController.hasRole);

/**
 * @swagger
 * /api/v1/role-manager/role-members/{role}:
 *   get:
 *     summary: 获取角色成员列表
 *     tags: [Role Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: role
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 角色ID（字节字符串）
 *     responses:
 *       200:
 *         description: 成功，返回角色成员列表
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/role-members/:role', apiKey, roleManagerController.getRoleMembers);

/**
 * @swagger
 * /api/v1/role-manager/account-roles/{account}:
 *   get:
 *     summary: 获取账户的所有角色
 *     tags: [Role Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: account
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 账户地址
 *     responses:
 *       200:
 *         description: 成功，返回账户角色列表
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/account-roles/:account', apiKey, roleManagerController.getAccountRoles);

/**
 * @swagger
 * /api/v1/role-manager/all-roles:
 *   get:
 *     summary: 获取所有可用角色
 *     tags: [Role Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回所有角色列表
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/all-roles', apiKey, roleManagerController.getAllRoles);

/**
 * @swagger
 * /api/v1/role-manager/create-role:
 *   post:
 *     summary: 创建新角色
 *     tags: [Role Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleName
 *               - privateKey
 *             properties:
 *               roleName:
 *                 type: string
 *                 description: 角色名称
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       201:
 *         description: 成功，新角色已创建
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/create-role', apiKey, roleManagerController.createRole);

module.exports = router; 