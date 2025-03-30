/**
 * 房产路由
 * 处理PropertyRegistry合约的API请求
 */

const express = require('express');
const router = express.Router();
const PropertyRegistryController = require('../controllers/PropertyRegistryController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// 获取房产总数
router.get('/count', apiKeyAuth, PropertyRegistryController.getPropertyCount);

// 获取房产列表
router.get('/', apiKeyAuth, PropertyRegistryController.getProperties);

// 获取房产详情
router.get('/:id', apiKeyAuth, PropertyRegistryController.getPropertyById);

// 注册新房产
router.post('/', apiKeyAuth, PropertyRegistryController.registerProperty);

// 审核房产
router.put('/:id/approve', apiKeyAuth, PropertyRegistryController.approveProperty);

// 拒绝房产
router.put('/:id/reject', apiKeyAuth, PropertyRegistryController.rejectProperty);

module.exports = router; 