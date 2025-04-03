/**
 * ルーター入口ファイル
 * 路由入口文件
 */
const express = require('express');
const contractRoutes = require('./contract.routes');
const blockchainRoutes = require('./blockchain.routes');
const SimpleERC20Routes = require('./SimpleERC20.routes');
const PropertyTokenRoutes = require('./PropertyToken.routes');
const RewardManagerRoutes = require('./RewardManager.routes');
const TradingManagerRoutes = require('./TradingManager.routes');
const PropertyManagerRoutes = require('./PropertyManager.routes');
const RoleManagerRoutes = require('./RoleManager.routes');
const RealEstateFacadeRoutes = require('./RealEstateFacade.routes');
const RealEstateSystemRoutes = require('./RealEstateSystem.routes');

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

// 注册合约路由
router.use('/contracts/SimpleERC20', SimpleERC20Routes);
router.use('/contracts/PropertyToken', PropertyTokenRoutes);
router.use('/contracts/RewardManager', RewardManagerRoutes);
router.use('/contracts/TradingManager', TradingManagerRoutes);
router.use('/contracts/PropertyManager', PropertyManagerRoutes);
router.use('/contracts/RoleManager', RoleManagerRoutes);
router.use('/contracts/RealEstateFacade', RealEstateFacadeRoutes);
router.use('/contracts/RealEstateSystem', RealEstateSystemRoutes);

module.exports = router; 