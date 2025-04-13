/**
 * 路由索引
 * 导出所有路由
 */
const express = require('express');
const router = express.Router();

// 引入各模块路由
const realEstateRoutes = require('./realEstate');
const rewardRoutes = require('./reward');

// 注册各模块路由
router.use('/real-estate', realEstateRoutes);
router.use('/reward', rewardRoutes);

// 导出路由
module.exports = router; 