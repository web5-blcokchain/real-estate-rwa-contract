/**
 * 路由合集
 * 统一管理所有路由
 */
const express = require('express');
const { apiKey } = require('../middlewares');

// 导入所有合约路由
const blockchainRoutes = require('./blockchain.routes');
const contractRoutes = require('./contract.routes');
const realEstateFacadeRoutes = require('./RealEstateFacade.routes');
const propertyManagerRoutes = require('./PropertyManager.routes');
const propertyTokenRoutes = require('./PropertyToken.routes');
const roleManagerRoutes = require('./RoleManager.routes');
const rewardManagerRoutes = require('./RewardManager.routes');
const tradingManagerRoutes = require('./TradingManager.routes');
const simpleERC20Routes = require('./SimpleERC20.routes');

const router = express.Router();

// API版本路径前缀
const API_PREFIX = '/api';
const API_V1_PREFIX = '/api/v1';
const CONTRACTS_PREFIX = '/contracts';

// 健康检查路由 - 保持简单以便测试脚本使用
router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// 块链相关路由
router.use(`${API_PREFIX}/blockchain`, blockchainRoutes);
router.use(`${API_V1_PREFIX}/blockchain`, blockchainRoutes);

// 合约通用路由
router.use(`${API_PREFIX}/contract`, contractRoutes);
router.use(`${API_V1_PREFIX}/contract`, contractRoutes);

// 合约特定路由
router.use(`${CONTRACTS_PREFIX}/RealEstateFacade`, apiKey, realEstateFacadeRoutes);
router.use(`${CONTRACTS_PREFIX}/PropertyManager`, apiKey, propertyManagerRoutes);
router.use(`${CONTRACTS_PREFIX}/PropertyToken`, apiKey, propertyTokenRoutes);
router.use(`${CONTRACTS_PREFIX}/RoleManager`, apiKey, roleManagerRoutes);
router.use(`${CONTRACTS_PREFIX}/RewardManager`, apiKey, rewardManagerRoutes);
router.use(`${CONTRACTS_PREFIX}/TradingManager`, apiKey, tradingManagerRoutes);
router.use(`${CONTRACTS_PREFIX}/SimpleERC20`, apiKey, simpleERC20Routes);

module.exports = router; 