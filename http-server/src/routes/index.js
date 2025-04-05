/**
 * API路由配置
 */
const express = require('express');
const router = express.Router();

// 导入各模块路由
const blockchainRoutes = require('./blockchain.routes');
const propertyRoutes = require('./property.routes');
const tradingRoutes = require('./trading.routes');
const rewardRoutes = require('./reward.routes');
const roleRoutes = require('./role.routes');
const systemRoutes = require('./system.routes');

/**
 * @swagger
 * tags:
 *   - name: Blockchain
 *     description: 区块链网络相关API
 *   - name: Property
 *     description: 房地产资产管理API
 *   - name: Trading
 *     description: 通证交易API
 *   - name: Reward
 *     description: 收益分配API
 *   - name: Role
 *     description: 角色权限管理API
 *   - name: System
 *     description: 系统管理API
 */

// 注册各模块路由
router.use('/v1/blockchain', blockchainRoutes);
router.use('/v1/properties', propertyRoutes);
router.use('/v1/trading', tradingRoutes);
router.use('/v1/rewards', rewardRoutes);
router.use('/v1/roles', roleRoutes);
router.use('/v1/system', systemRoutes);

// API版本信息
router.get('/version', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.0',
      apiVersion: 'v1',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router; 