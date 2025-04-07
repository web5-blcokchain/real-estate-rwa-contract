const express = require('express');
const router = express.Router();
const RealEstateFacadeController = require('../../controllers/core/RealEstateFacadeController');
const AuthMiddleware = require('../../middleware/auth');
const ValidatorMiddleware = require('../../middleware/validator');
const { ControllerFactory } = require('../../utils');

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
  ControllerFactory.getHandler(RealEstateFacadeController, 'registerPropertyAndCreateToken')
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
  ValidatorMiddleware.validateAddress('propertyId'),
  ControllerFactory.getHandler(RealEstateFacadeController, 'updatePropertyStatus')
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
  ValidatorMiddleware.validateAddress('tokenAddress'),
  ValidatorMiddleware.validateAddress('from'),
  ValidatorMiddleware.validateAddress('to'),
  ControllerFactory.getHandler(RealEstateFacadeController, 'executeTrade')
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
  ValidatorMiddleware.validateAddress('propertyId'),
  ControllerFactory.getHandler(RealEstateFacadeController, 'distributeRewards')
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
  ControllerFactory.getHandler(RealEstateFacadeController, 'getVersion')
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
  ValidatorMiddleware.validateAddress('propertyId'),
  ControllerFactory.getHandler(RealEstateFacadeController, 'claimRewards')
);

module.exports = router; 