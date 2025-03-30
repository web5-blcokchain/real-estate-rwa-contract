/**
 * 角色路由
 * 处理RoleManager合约的API请求
 */

const express = require('express');
const router = express.Router();
const RoleManagerController = require('../controllers/RoleManagerController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// 获取所有角色
router.get('/', apiKeyAuth, RoleManagerController.getRoles);

// 检查地址是否拥有指定角色
router.get('/:role/check/:address', apiKeyAuth, RoleManagerController.checkRole);

// 获取指定角色的所有成员
router.get('/:role/members', apiKeyAuth, RoleManagerController.getRoleMembers);

// 授予角色
router.post('/grant', apiKeyAuth, RoleManagerController.grantRole);

// 撤销角色
router.post('/revoke', apiKeyAuth, RoleManagerController.revokeRole);

// 获取角色管理员
router.get('/:role/admin', apiKeyAuth, RoleManagerController.getRoleAdmin);

module.exports = router; 