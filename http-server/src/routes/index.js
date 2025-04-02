/**
 * 主路由文件
 * 集中导出所有API路由
 */
const express = require('express');
const router = express.Router();
const { apiKey } = require('../middlewares');

// 导入各个路由模块
const propertyTokenRoutes = require('./propertyToken');
const realEstateSystemRoutes = require('./realEstateSystem');
const propertyManagerRoutes = require('./propertyManager');
const tradingManagerRoutes = require('./tradingManager');
const rewardManagerRoutes = require('./rewardManager');
const roleManagerRoutes = require('./roleManager');
const contractInteractionRoutes = require('./contractInteraction');

// 应用API密钥中间件到所有路由
router.use(apiKey);

// 注册各个模块的路由
router.use('/property-token', propertyTokenRoutes);
router.use('/real-estate-system', realEstateSystemRoutes);
router.use('/property-manager', propertyManagerRoutes);
router.use('/trading-manager', tradingManagerRoutes);
router.use('/reward-manager', rewardManagerRoutes);
router.use('/role-manager', roleManagerRoutes);
router.use('/contract-interaction', contractInteractionRoutes);

module.exports = router;