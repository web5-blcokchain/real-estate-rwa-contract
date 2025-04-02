/**
 * RewardManager路由
 * 定义与奖励管理相关的API端点
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/rewardManagerController');

/**
 * @swagger
 * /api/v1/reward-manager/rewards:
 *   get:
 *     summary: 获取所有奖励活动
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回所有奖励活动
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/rewards', controller.getAllRewards);

/**
 * @swagger
 * /api/v1/reward-manager/rewards/{rewardId}:
 *   get:
 *     summary: 获取特定奖励活动
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: rewardId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 奖励活动ID
 *     responses:
 *       200:
 *         description: 成功，返回奖励活动详情
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       404:
 *         description: 奖励活动不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/rewards/:rewardId', controller.getRewardById);

/**
 * @swagger
 * /api/v1/reward-manager/user/{userAddress}/rewards:
 *   get:
 *     summary: 获取用户的奖励记录
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: userAddress
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户地址
 *     responses:
 *       200:
 *         description: 成功，返回用户的奖励记录
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/user/:userAddress/rewards', controller.getUserRewards);

/**
 * @swagger
 * /api/v1/reward-manager/create-reward:
 *   post:
 *     summary: 创建新的奖励活动
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rewardName
 *               - rewardAmount
 *               - startDate
 *               - endDate
 *               - conditions
 *               - privateKey
 *             properties:
 *               rewardName:
 *                 type: string
 *                 description: 奖励活动名称
 *               rewardAmount:
 *                 type: string
 *                 description: 奖励金额
 *               startDate:
 *                 type: string
 *                 description: 开始日期
 *               endDate:
 *                 type: string
 *                 description: 结束日期
 *               conditions:
 *                 type: object
 *                 description: 奖励条件
 *               privateKey:
 *                 type: string
 *                 description: 管理员的私钥
 *     responses:
 *       200:
 *         description: 成功，奖励活动已创建
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/create-reward', controller.createReward);

/**
 * @swagger
 * /api/v1/reward-manager/claim-reward:
 *   post:
 *     summary: 领取奖励
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rewardId
 *               - privateKey
 *             properties:
 *               rewardId:
 *                 type: string
 *                 description: 奖励活动ID
 *               privateKey:
 *                 type: string
 *                 description: 用户的私钥
 *     responses:
 *       200:
 *         description: 成功，奖励已领取
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       403:
 *         description: 不满足领取条件
 *       404:
 *         description: 奖励活动不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/claim-reward', controller.claimReward);

/**
 * @swagger
 * /api/v1/reward-manager/cancel-reward:
 *   post:
 *     summary: 取消奖励活动
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rewardId
 *               - privateKey
 *             properties:
 *               rewardId:
 *                 type: string
 *                 description: 奖励活动ID
 *               privateKey:
 *                 type: string
 *                 description: 管理员的私钥
 *     responses:
 *       200:
 *         description: 成功，奖励活动已取消
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       404:
 *         description: 奖励活动不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/cancel-reward', controller.cancelReward);

/**
 * @swagger
 * /api/v1/reward-manager/rule:
 *   post:
 *     summary: 创建奖励规则
 *     tags: [RewardManager]
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
 *         description: 成功，奖励规则已创建
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/rule', controller.createRewardRule);

/**
 * @swagger
 * /api/v1/reward-manager/rule/{ruleId}:
 *   get:
 *     summary: 获取奖励规则信息
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: ruleId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 奖励规则ID
 *     responses:
 *       200:
 *         description: 成功，返回奖励规则信息
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/rule/:ruleId', controller.getRewardRuleInfo);

/**
 * @swagger
 * /api/v1/reward-manager/distribute:
 *   post:
 *     summary: 发放奖励
 *     tags: [RewardManager]
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
 *         description: 成功，奖励已发放
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/distribute', controller.distributeReward);

/**
 * @swagger
 * /api/v1/reward-manager/history/{address}:
 *   get:
 *     summary: 获取用户奖励历史
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户地址
 *     responses:
 *       200:
 *         description: 成功，返回用户奖励历史
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/history/:address', controller.getUserRewardHistory);

/**
 * @swagger
 * /api/v1/reward-manager/rules:
 *   get:
 *     summary: 获取所有奖励规则
 *     tags: [RewardManager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回所有奖励规则
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/rules', controller.getAllRewardRules);

module.exports = router; 