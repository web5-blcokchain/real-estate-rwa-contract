/**
 * RewardManager合约路由
 * 提供奖励管理、分配创建、查询和提取功能的API路由
 */
const express = require('express');
const RewardManagerController = require('../controllers/RewardManager.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 获取合约地址
router.get('/address', apiKey, RewardManagerController.getContractAddress);

// 获取支持的支付代币列表
router.get('/supportedPaymentTokens', apiKey, RewardManagerController.getSupportedPaymentTokens);

// 创建分配
router.post('/createDistribution', apiKey, RewardManagerController.createDistribution);

// 提取分配
router.post('/withdrawDistribution', apiKey, RewardManagerController.withdrawDistribution);

// 获取分配详情
router.get('/distribution/:distributionId', apiKey, RewardManagerController.getDistribution);

// 获取可用的分配金额
router.get('/availableAmount/:distributionId/:account', apiKey, RewardManagerController.getAvailableDistributionAmount);

// 获取房产所有分配
router.get('/property/:propertyIdHash', apiKey, RewardManagerController.getPropertyDistributions);

// 获取特定类型的所有分配
router.get('/type/:distType', apiKey, RewardManagerController.getDistributionsByType);

// 获取代币的所有分配
router.get('/token/:tokenAddress', apiKey, RewardManagerController.getTokenDistributions);

// 获取分配总数
router.get('/count', apiKey, RewardManagerController.getDistributionsCount);

// 获取奖励
router.get('/getReward', apiKey, RewardManagerController.getReward);

// 领取奖励
router.post('/claimReward', apiKey, RewardManagerController.claimReward);

// 其他RewardManager方法的路由...

module.exports = router; 