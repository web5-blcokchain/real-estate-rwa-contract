const express = require('express');
const router = express.Router();
const RoleController = require('../../controllers/core/RoleController');
const AuthMiddleware = require('../../middleware/auth');
const ValidatorMiddleware = require('../../middleware/validator');
const { apiRateLimit } = require('../../middleware/rate-limit');
const { ControllerFactory } = require('../../utils');

/**
 * @swagger
 * tags:
 *   name: Role
 *   description: 角色管理API
 */

/**
 * @swagger
 * /api/v1/core/roles/has-role/{role}/{account}:
 *   get:
 *     summary: 检查账户是否拥有某角色
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: account
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 检查结果
 */
router.get('/has-role/:role/:account',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('account', 'params'),
  ControllerFactory.getHandler(RoleController, 'hasRole')
);

/**
 * @swagger
 * /api/v1/core/roles/members/{role}:
 *   get:
 *     summary: 获取角色成员
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 角色成员列表
 */
router.get('/members/:role',
  AuthMiddleware.validateApiKey,
  ControllerFactory.getHandler(RoleController, 'getRoleMemberCount')
);

/**
 * @swagger
 * /api/v1/core/roles/grant/{role}/{account}:
 *   post:
 *     summary: 授予角色
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: account
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 授权成功
 */
router.post('/grant/:role/:account',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('account', 'params'),
  ControllerFactory.getHandler(RoleController, 'grantRole')
);

/**
 * @swagger
 * /api/v1/core/roles/revoke/{role}/{account}:
 *   post:
 *     summary: 撤销角色
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: account
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 撤销成功
 */
router.post('/revoke/:role/:account',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('account', 'params'),
  ControllerFactory.getHandler(RoleController, 'revokeRole')
);

/**
 * @swagger
 * /api/v1/core/roles/{roleId}:
 *   get:
 *     summary: 获取角色详情
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 角色详情
 */
router.get('/:roleId',
  AuthMiddleware.validateApiKey,
  ControllerFactory.getHandler(RoleController, 'getRoleAdmin')
);

/**
 * @swagger
 * /api/v1/core/roles:
 *   get:
 *     summary: 获取角色列表
 *     tags: [Role]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 角色列表
 */
router.get('/',
  AuthMiddleware.validateApiKey,
  ControllerFactory.getHandler(RoleController, 'getRoleMember')
);

module.exports = router; 