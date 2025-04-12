/**
 * 房产管理路由
 */
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/core/propertyManager.controller');
const AuthMiddleware = require('../../middleware/auth');

// 应用API密钥验证中间件
router.use(AuthMiddleware.validateApiKey);

// 获取所有房产ID
router.get('/properties', controller.getAllPropertyIds.bind(controller));

// 获取房产详情
router.get('/properties/:propertyId', controller.getPropertyDetails.bind(controller));

// 根据状态获取房产
router.get('/properties/status/:status', controller.getPropertiesByStatus.bind(controller));

// 获取所有者的房产
router.get('/owner/:ownerAddress/properties', controller.getOwnerProperties.bind(controller));

// 更新房产状态
router.put('/update-property-status', controller.updatePropertyStatus.bind(controller));

// 转移房产所有权
router.post('/transfer-ownership', controller.transferOwnership.bind(controller));

module.exports = router; 