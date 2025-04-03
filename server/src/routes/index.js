/**
 * ルーター入口ファイル
 * 路由入口文件
 */
const express = require('express');
const contractRoutes = require('./contract.routes');
const blockchainRoutes = require('./blockchain.routes');

// 创建主路由器
const router = express.Router();

// API根端点信息
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'JAPAN RWA Blockchain API',
    serverTime: new Date().toISOString()
  });
});

// 注册路由
router.use('/contract', contractRoutes);
router.use('/blockchain', blockchainRoutes);

module.exports = router; 