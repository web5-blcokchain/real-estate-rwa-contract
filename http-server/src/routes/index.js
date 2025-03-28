/**
 * API路由入口
 */

const express = require('express');
const contractRoutes = require('./contractRoutes');
const { apiKeyAuth } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// 添加认证中间件到所有路由
router.use(apiKeyAuth);

// API状态检查
router.get('/status', (req, res) => {
  logger.debug('API状态检查');
  res.json({
    success: true,
    data: {
      status: 'online',
      timestamp: new Date().toISOString()
    }
  });
});

// 挂载合约路由
router.use('/contracts', contractRoutes);

module.exports = router; 