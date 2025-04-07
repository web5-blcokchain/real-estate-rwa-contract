const express = require('express');
const router = express.Router();
const RewardController = require('../../controllers/core/RewardController');
const AuthMiddleware = require('../../middleware/auth');
const ValidatorMiddleware = require('../../middleware/validator');
const { ControllerFactory } = require('../../utils');

/**
 * @swagger
 * tags:
 *   name: Reward
 *   description: 奖励管理API
 */

/**
 * @swagger
 * /api/v1/core/rewards/distribute:
 *   post:
 *     summary: 分配奖励
 *     tags: [Reward]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - amount
 *             properties:
 *               propertyId:
 *                 type: string
 *               amount:
 *                 type: string
 *     responses:
 *       200:
 *         description: 奖励分配成功
 */
router.post('/distribute',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('propertyId'),
  ControllerFactory.getHandler(RewardController, 'distributeRewards')
);

/**
 * @swagger
 * /api/v1/core/rewards/claim:
 *   post:
 *     summary: 领取奖励
 *     tags: [Reward]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *             properties:
 *               propertyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 奖励领取成功
 */
router.post('/claim',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('propertyId'),
  ControllerFactory.getHandler(RewardController, 'claimRewards')
);

/**
 * @swagger
 * /api/v1/core/rewards/pending/{propertyId}/{account}:
 *   get:
 *     summary: 获取待领取奖励
 *     tags: [Reward]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: account
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 待领取奖励信息
 */
router.get('/pending/:propertyId/:account',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('propertyId', 'params'),
  ValidatorMiddleware.validateAddress('account', 'params'),
  ControllerFactory.getHandler(RewardController, 'getPendingRewards')
);

/**
 * @swagger
 * /api/v1/core/rewards/history/{propertyId}:
 *   get:
 *     summary: 获取奖励历史
 *     tags: [Reward]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 奖励历史记录
 */
router.get('/history/:propertyId',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('propertyId', 'params'),
  ControllerFactory.getHandler(RewardController, 'getRewardHistory')
);

module.exports = router; 