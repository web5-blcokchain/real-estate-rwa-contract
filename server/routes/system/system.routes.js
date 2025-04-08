const express = require('express');
const router = express.Router();

// 简单的测试接口 - 无需认证
router.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: '服务器正常运行',
    timestamp: new Date().toISOString()
  });
});

// 健康检查接口 - 无需认证
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 系统信息接口 - 无需认证
router.get('/info', (req, res) => {
  res.json({
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
    },
    timestamp: new Date().toISOString()
  });
});

// API测试接口 - 无需认证
router.get('/api-test', (req, res) => {
  res.json({
    message: "API测试成功 - 不需要API Key",
    time: new Date().toISOString()
  });
});

module.exports = router; 