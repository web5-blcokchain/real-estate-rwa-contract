/**
 * RewardManager路由
 * 定义与奖励管理相关的API端点
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/rewardManagerController');
const { apiKey } = require('../middlewares');

/**
 * @swagger
 * /api/v1/reward-manager/rules:
 *   get:
 *     summary: 获取所有奖励规则
 *     tags: [Reward Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 返回所有奖励规则
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/rules', apiKey, controller.getAllRewardRules);

/**
 * @swagger
 * /api/v1/reward-manager/rule/{ruleId}:
 *   get:
 *     summary: 获取奖励规则信息
 *     tags: [Reward Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 奖励规则ID
 *     responses:
 *       200:
 *         description: 返回奖励规则信息
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       404:
 *         description: 奖励规则不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/rule/:ruleId', apiKey, controller.getRewardRuleInfo);

/**
 * @swagger
 * /api/v1/reward-manager/user/{address}/history:
 *   get:
 *     summary: 获取用户奖励历史
 *     tags: [Reward Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户以太坊地址
 *     responses:
 *       200:
 *         description: 返回用户奖励历史
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/user/:address/history', apiKey, controller.getUserRewardHistory);

/**
 * @swagger
 * /api/v1/reward-manager/rule:
 *   post:
 *     summary: 创建奖励规则
 *     tags: [Reward Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ruleName
 *               - rewardType
 *               - rewardAmount
 *               - rewardCondition
 *               - privateKey
 *             properties:
 *               ruleName:
 *                 type: string
 *                 description: 奖励规则名称
 *               rewardType:
 *                 type: string
 *                 description: 奖励类型
 *               rewardAmount:
 *                 type: string
 *                 description: 奖励数量
 *               rewardCondition:
 *                 type: string
 *                 description: 奖励条件
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       201:
 *         description: 奖励规则创建成功
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/rule', apiKey, controller.createRewardRule);

/**
 * @swagger
 * /api/v1/reward-manager/distribute:
 *   post:
 *     summary: 发放奖励
 *     tags: [Reward Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient
 *               - ruleId
 *               - privateKey
 *             properties:
 *               recipient:
 *                 type: string
 *                 description: 接收者地址
 *               ruleId:
 *                 type: string
 *                 description: 奖励规则ID
 *               privateKey:
 *                 type: string
 *                 description: 管理员私钥
 *     responses:
 *       200:
 *         description: 奖励发放成功
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/distribute', apiKey, controller.distributeReward);

module.exports = router; 