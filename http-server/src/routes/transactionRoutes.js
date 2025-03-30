/**
 * 交易路由
 * 处理区块链交易查询的API请求
 */

const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/TransactionController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// 获取交易状态
router.get('/status/:txHash', apiKeyAuth, TransactionController.getTransactionStatus);

// 获取交易收据
router.get('/receipt/:txHash', apiKeyAuth, TransactionController.getTransactionReceipt);

// 获取交易详情
router.get('/details/:txHash', apiKeyAuth, TransactionController.getTransactionDetails);

// 获取区块信息
router.get('/block/:blockNumber', apiKeyAuth, TransactionController.getBlock);

// 获取账户余额
router.get('/balance/:address', apiKeyAuth, TransactionController.getBalance);

module.exports = router; 