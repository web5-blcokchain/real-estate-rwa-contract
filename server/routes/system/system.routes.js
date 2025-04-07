const express = require('express');
const router = express.Router();
const SystemController = require('../../controllers/system/SystemController');
const HealthController = require('../../controllers/system/HealthController');
const AuthMiddleware = require('../../middleware/auth');
const ValidatorMiddleware = require('../../middleware/validator');
const { apiRateLimit } = require('../../middleware/rate-limit');
const { ControllerFactory } = require('../../utils');

/**
 * @swagger
 * tags:
 *   name: System
 *   description: System operations
 */

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: 系统健康检查
 *     tags: [System]
 *     responses:
 *       200:
 *         description: 系统健康状态
 */
router.get('/health', 
  apiRateLimit,
  ControllerFactory.getHandler(HealthController, 'checkHealth')
);

/**
 * @swagger
 * /api/system/info:
 *   get:
 *     summary: 获取系统信息
 *     tags: [System]
 *     responses:
 *       200:
 *         description: 系统信息
 */
router.get('/info', 
  apiRateLimit,
  ControllerFactory.getHandler(HealthController, 'getSystemInfo')
);

/**
 * @swagger
 * /api/v1/system/block/{blockNumber}:
 *   get:
 *     tags: [System]
 *     summary: 获取区块信息
 *     parameters:
 *       - in: path
 *         name: blockNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: 区块号
 *     responses:
 *       200:
 *         description: 成功获取区块信息
 */
router.get('/block/:blockNumber',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateNumber('blockNumber'),
  ControllerFactory.getHandler(SystemController, 'getBlock')
);

/**
 * @swagger
 * /api/v1/system/transaction/{hash}:
 *   get:
 *     tags: [System]
 *     summary: 获取交易信息
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易哈希
 *     responses:
 *       200:
 *         description: 成功获取交易信息
 */
router.get('/transaction/:hash',
  AuthMiddleware.validateApiKey,
  ControllerFactory.getHandler(SystemController, 'getTransaction')
);

/**
 * @swagger
 * /api/v1/system/receipt/{hash}:
 *   get:
 *     tags: [System]
 *     summary: 获取交易收据
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易哈希
 *     responses:
 *       200:
 *         description: 成功获取交易收据
 */
router.get('/receipt/:hash',
  AuthMiddleware.validateApiKey,
  ControllerFactory.getHandler(SystemController, 'getTransactionReceipt')
);

/**
 * @swagger
 * /api/v1/system/balance/{address}:
 *   get:
 *     tags: [System]
 *     summary: 获取账户余额
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: 账户地址
 *     responses:
 *       200:
 *         description: 成功获取账户余额
 */
router.get('/balance/:address',
  AuthMiddleware.validateApiKey,
  ValidatorMiddleware.validateAddress('address'),
  ControllerFactory.getHandler(SystemController, 'getBalance')
);

/**
 * @swagger
 * /api/v1/system/version:
 *   get:
 *     summary: Get system version
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: System version retrieved successfully
 */
router.get('/version',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(SystemController, 'getVersion')
);

/**
 * @swagger
 * /api/v1/system/contract-addresses:
 *   get:
 *     summary: Get contract addresses
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract addresses retrieved successfully
 */
router.get('/contract-addresses',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(SystemController, 'getContractAddresses')
);

/**
 * @swagger
 * /api/v1/system/contract-roles:
 *   get:
 *     summary: Get contract roles
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract roles retrieved successfully
 */
router.get('/contract-roles',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(SystemController, 'getContractRoles')
);

/**
 * @swagger
 * /api/v1/system/contract-config:
 *   get:
 *     summary: Get contract config
 *     tags: [System]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract config retrieved successfully
 */
router.get('/contract-config',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(SystemController, 'getContractConfig')
);

module.exports = router; 