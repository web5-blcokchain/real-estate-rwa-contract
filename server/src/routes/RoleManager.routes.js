/**
 * RoleManager合约路由
 * 提供角色管理功能的API路由
 */
const express = require('express');
const RoleManagerController = require('../controllers/RoleManager.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 获取合约地址
router.get('/address', apiKey, RoleManagerController.getContractAddress);

// 检查地址是否有特定角色
router.get('/hasRole/:role/:account', apiKey, RoleManagerController.hasRole);

// 为地址授予特定角色
router.post('/grantRole', apiKey, RoleManagerController.grantRole);

// 撤销地址的特定角色
router.post('/revokeRole', apiKey, RoleManagerController.revokeRole);

// 转移管理员权限到新地址
router.post('/transferAdminRole', apiKey, RoleManagerController.transferAdminRole);

// 批量授予地址特定角色
router.post('/batchGrantRole', apiKey, RoleManagerController.batchGrantRole);

// 批量撤销地址的特定角色
router.post('/batchRevokeRole', apiKey, RoleManagerController.batchRevokeRole);

// 激活紧急模式
router.post('/activateEmergencyMode', apiKey, RoleManagerController.activateEmergencyMode);

// 取消激活紧急模式
router.post('/deactivateEmergencyMode', apiKey, RoleManagerController.deactivateEmergencyMode);

// 获取紧急模式状态
router.get('/emergencyMode', apiKey, RoleManagerController.getEmergencyModeStatus);

// 获取系统版本
router.get('/version', apiKey, RoleManagerController.getVersion);

// 获取角色常量
router.get('/roleConstants', apiKey, RoleManagerController.getRoleConstants);

module.exports = router; 