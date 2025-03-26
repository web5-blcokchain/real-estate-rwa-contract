const express = require('express');
const router = express.Router();

// 导入路由
const tokenRoutes = require('./tokenRoutes');
const redemptionRoutes = require('./redemptionRoutes');
const rentRoutes = require('./rentRoutes');
const propertyRoutes = require('./propertyRoutes');

// 注册路由 - 使用真实的区块链服务
router.use('/tokens', tokenRoutes);
router.use('/redemptions', redemptionRoutes);
router.use('/rents', rentRoutes);
router.use('/properties', propertyRoutes);

// 健康检查路由
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API版本
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'Japan RWA API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

module.exports = router; 