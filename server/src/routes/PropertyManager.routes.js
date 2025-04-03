/**
 * PropertyManager合约路由
 * 提供房产注册、状态管理、查询和代币关联功能的API路由
 */
const express = require('express');
const PropertyManagerController = require('../controllers/PropertyManager.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 获取合约地址
router.get('/address', apiKey, PropertyManagerController.getContractAddress);

// 注册新房产
router.post('/registerProperty', apiKey, PropertyManagerController.registerProperty);

// 更新房产状态
router.post('/updateStatus', apiKey, PropertyManagerController.updatePropertyStatus);

// 通过字符串ID更新房产状态
router.post('/updateStatusByStringId', apiKey, PropertyManagerController.updatePropertyStatusByStringId);

// 检查房产是否存在
router.get('/exists/:propertyIdHash', apiKey, PropertyManagerController.propertyExists);

// 通过字符串ID检查房产是否存在
router.get('/existsByStringId/:propertyId', apiKey, PropertyManagerController.propertyExistsByStringId);

// 获取房产状态
router.get('/status/:propertyIdHash', apiKey, PropertyManagerController.getPropertyStatus);

// 通过字符串ID获取房产状态
router.get('/statusByStringId/:propertyId', apiKey, PropertyManagerController.getPropertyStatusByStringId);

// 检查房产是否已批准
router.get('/isApproved/:propertyIdHash', apiKey, PropertyManagerController.isPropertyApproved);

// 为房产注册代币
router.post('/registerToken', apiKey, PropertyManagerController.registerTokenForProperty);

// 获取所有房产哈希
router.get('/allHashes', apiKey, PropertyManagerController.getAllPropertyHashes);

// 获取房产详情
router.get('/details/:propertyIdHash', apiKey, PropertyManagerController.getPropertyDetails);

// 设置合约授权
router.post('/setContractAuthorization', apiKey, PropertyManagerController.setContractAuthorization);

module.exports = router; 