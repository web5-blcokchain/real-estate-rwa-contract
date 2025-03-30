/**
 * 代币路由
 * 处理TokenFactory合约的API请求
 */

const express = require('express');
const router = express.Router();
const TokenFactoryController = require('../controllers/TokenFactoryController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// 获取代币总数
router.get('/count', apiKeyAuth, TokenFactoryController.getTokenCount);

// 获取代币列表
router.get('/', apiKeyAuth, TokenFactoryController.getTokens);

// 获取代币详情
router.get('/:address', apiKeyAuth, TokenFactoryController.getTokenByAddress);

// 创建新代币
router.post('/', apiKeyAuth, TokenFactoryController.createToken);

// 获取代币实现合约地址
router.get('/implementation/address', apiKeyAuth, TokenFactoryController.getTokenImplementation);

module.exports = router; 