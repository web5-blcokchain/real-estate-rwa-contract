const express = require('express');
const router = express.Router();

// 导入子路由
const propertyRoutes = require('./propertyRoutes');
const tokenRoutes = require('./tokenRoutes');
const redemptionRoutes = require('./redemptionRoutes');
const rentRoutes = require('./rentRoutes');

// 注册子路由
router.use('/api/properties', propertyRoutes);
router.use('/api/tokens', tokenRoutes);
router.use('/api/redemptions', redemptionRoutes);
router.use('/api/rents', rentRoutes);

// 健康检查路由
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
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