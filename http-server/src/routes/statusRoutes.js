/**
 * 状态路由
 * 处理API状态查询请求
 */

const express = require('express');
const router = express.Router();
const ContractInfoController = require('../controllers/ContractInfoController');
const { optionalApiKeyAuth } = require('../middleware/apiKeyAuth');

// 获取API服务状态 (无需API密钥)
router.get('/', optionalApiKeyAuth, ContractInfoController.getServiceStatus);

// 获取区块链连接状态 (无需API密钥)
router.get('/blockchain', optionalApiKeyAuth, ContractInfoController.getBlockchainStatus);

module.exports = router; 