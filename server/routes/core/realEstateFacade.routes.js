const express = require('express');
const router = express.Router();
const RealEstateFacadeController = require('../../controllers/core/RealEstateFacadeController');
const AuthMiddleware = require('../../middleware/auth');
const ValidatorMiddleware = require('../../middleware/validator');

// 创建控制器实例
const realEstateFacadeController = new RealEstateFacadeController();

/**
 * @swagger
 * tags:
 *   name: RealEstateFacade
 *   description: 房产外观合约API
 */

/**
 * @swagger
 * /api/v1/core/real-estate-facade/register:
 *   post:
 *     summary: 注册房产并创建代币
 *     tags: [RealEstateFacade]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - propertyType
 *               - value
 *             properties:
 *               propertyId:
 *                 type: string
 *               propertyType:
 *                 type: number
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: 注册成功
 */
router.post('/register', 
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('propertyId'),
  async (req, res) => {
    try {
      await realEstateFacadeController.registerPropertyAndCreateToken(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/core/real-estate-facade/status:
 *   put:
 *     summary: 更新房产状态
 *     tags: [RealEstateFacade]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - status
 *             properties:
 *               propertyId:
 *                 type: string
 *               status:
 *                 type: number
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/status',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validatePropertyStatusUpdate,
  async (req, res) => {
    try {
      await realEstateFacadeController.updatePropertyStatus(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/core/real-estate-facade/trade:
 *   post:
 *     summary: 执行交易
 *     tags: [RealEstateFacade]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenAddress
 *               - from
 *               - to
 *               - amount
 *             properties:
 *               tokenAddress:
 *                 type: string
 *               from:
 *                 type: string
 *               to:
 *                 type: string
 *               amount:
 *                 type: string
 *     responses:
 *       200:
 *         description: 交易成功
 */
router.post('/trade',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateTradeExecution,
  async (req, res) => {
    try {
      await realEstateFacadeController.executeTrade(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/core/real-estate-facade/rewards/distribute:
 *   post:
 *     summary: 分配奖励
 *     tags: [RealEstateFacade]
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
 *         description: 分配成功
 */
router.post('/rewards/distribute',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateRewardDistribution,
  async (req, res) => {
    try {
      await realEstateFacadeController.distributeRewards(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/core/real-estate-facade/version:
 *   get:
 *     summary: 获取版本信息
 *     tags: [RealEstateFacade]
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/version',
  AuthMiddleware.validateApiKey,
  async (req, res) => {
    try {
      await realEstateFacadeController.getVersion(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/core/real-estate-facade/rewards/claim:
 *   post:
 *     summary: 领取奖励
 *     tags: [RealEstateFacade]
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
 *         description: 领取成功
 */
router.post('/rewards/claim',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateRewardClaim,
  async (req, res) => {
    try {
      await realEstateFacadeController.claimRewards(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/core/real-estate-facade/test:
 *   get:
 *     summary: 测试接口
 *     tags: [RealEstateFacade]
 *     responses:
 *       200:
 *         description: 测试成功
 */
router.get('/test', (req, res) => {
  // 这个接口不需要AuthMiddleware.validateApiKey
  res.json({
    status: 'success',
    message: 'RealEstateFacade 测试接口可用',
    timestamp: new Date().toISOString()
  });
});

// 创建订单
router.post('/orders',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateOrderCreation,
  async (req, res) => {
    try {
      await realEstateFacadeController.createOrder(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// 取消订单
router.post('/orders/:orderId/cancel',
  AuthMiddleware.validateApiKey,
  async (req, res) => {
    try {
      await realEstateFacadeController.cancelOrder(req, res);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router; 