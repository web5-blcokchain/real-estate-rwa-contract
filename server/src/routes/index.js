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
const testRoutes = require('./test.routes');

const router = express.Router();

// API版本路径前缀
const API_PREFIX = '/api';
const API_V1_PREFIX = '/api/v1';
const CONTRACTS_PREFIX = '/api/v1/contracts';

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 服务器健康检查
 *     description: 返回服务器的当前状态
 *     tags: [系统]
 *     responses:
 *       200:
 *         description: 服务器正常运行
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
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

// 添加测试路由
router.use(`${API_V1_PREFIX}/test`, apiKey, testRoutes);

// v1版本的合约特定路由
router.use(`${CONTRACTS_PREFIX}/RealEstateFacade`, apiKey, realEstateFacadeRoutes);
router.use(`${CONTRACTS_PREFIX}/PropertyManager`, apiKey, propertyManagerRoutes);
router.use(`${CONTRACTS_PREFIX}/PropertyToken`, apiKey, propertyTokenRoutes);
router.use(`${CONTRACTS_PREFIX}/RoleManager`, apiKey, roleManagerRoutes);
router.use(`${CONTRACTS_PREFIX}/RewardManager`, apiKey, rewardManagerRoutes);
router.use(`${CONTRACTS_PREFIX}/TradingManager`, apiKey, tradingManagerRoutes);
router.use(`${CONTRACTS_PREFIX}/SimpleERC20`, apiKey, simpleERC20Routes);

// 兼容旧版本的合约API路径 - 为了平滑过渡，后续可删除
router.use(`/contracts/RealEstateFacade`, apiKey, realEstateFacadeRoutes);
router.use(`/contracts/PropertyManager`, apiKey, propertyManagerRoutes);
router.use(`/contracts/PropertyToken`, apiKey, propertyTokenRoutes);
router.use(`/contracts/RoleManager`, apiKey, roleManagerRoutes);
router.use(`/contracts/RewardManager`, apiKey, rewardManagerRoutes);
router.use(`/contracts/TradingManager`, apiKey, tradingManagerRoutes);
router.use(`/contracts/SimpleERC20`, apiKey, simpleERC20Routes);

module.exports = router; 