/**
 * 费用路由
 * 处理FeeManager合约的API请求
 */

const express = require('express');
const router = express.Router();
const FeeManagerController = require('../controllers/FeeManagerController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// 获取所有费用类型
router.get('/types', apiKeyAuth, FeeManagerController.getFeeTypes);

// 获取指定费用类型的百分比
router.get('/percentage/:type', apiKeyAuth, FeeManagerController.getFeePercentage);

// 获取所有费用百分比
router.get('/percentages', apiKeyAuth, FeeManagerController.getAllFeePercentages);

// 获取费用接收者地址
router.get('/receiver', apiKeyAuth, FeeManagerController.getFeeReceiver);

// 设置费用百分比
router.post('/percentage', apiKeyAuth, FeeManagerController.setFeePercentage);

// 设置费用接收者地址
router.post('/receiver', apiKeyAuth, FeeManagerController.setFeeReceiver);

// 计算费用金额
router.get('/calculate', apiKeyAuth, FeeManagerController.calculateFee);

module.exports = router; 