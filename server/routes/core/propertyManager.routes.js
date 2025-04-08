const express = require('express');
const router = express.Router();
const PropertyManagerController = require('../../controllers/core/PropertyManagerController');
const AuthMiddleware = require('../../middleware/auth');
const ValidatorMiddleware = require('../../middleware/validator');
const { ControllerFactory } = require('../../utils');

/**
 * @swagger
 * tags:
 *   name: Property Manager
 *   description: Property manager operations
 */

/**
 * @swagger
 * /api/v1/core/property-manager/test:
 *   get:
 *     summary: 测试接口
 *     tags: [Property Manager]
 *     responses:
 *       200:
 *         description: 测试成功
 */
router.get('/test', (req, res) => {
  // 这个接口不需要任何认证和验证
  res.json({
    status: 'success',
    message: 'PropertyManager 测试接口可用',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/v1/core/property-manager/auth-test:
 *   get:
 *     summary: 需要认证的测试接口
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 认证测试成功
 */
router.get('/auth-test', 
  AuthMiddleware.validateApiKey,
  (req, res) => {
    res.json({
      status: 'success',
      message: 'PropertyManager API密钥认证成功',
      timestamp: new Date().toISOString(),
      method: '使用方式',
      header: req.headers['x-api-key'] ? '通过请求头' : '',
      query: req.query.apiKey ? '通过URL参数' : ''
    });
  }
);

/**
 * @swagger
 * /api/v1/core/property-manager/properties:
 *   get:
 *     summary: Get all properties
 *     tags: [Property Manager]
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
 *         description: Properties retrieved successfully
 */
router.get('/properties',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(PropertyManagerController, 'getOwnerProperties')
);

/**
 * @swagger
 * /api/v1/core/property-manager/register:
 *   post:
 *     summary: Register a new property
 *     tags: [Property Manager]
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
 *               - propertyType
 *               - value
 *               - owner
 *               - contractAddress
 *             properties:
 *               propertyId:
 *                 type: string
 *               propertyType:
 *                 type: string
 *               value:
 *                 type: string
 *               owner:
 *                 type: string
 *               contractAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Property registered successfully
 */
router.post('/register',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ValidatorMiddleware.validateAddress('owner'),
    ControllerFactory.getHandler(PropertyManagerController, 'registerProperty')
);

/**
 * @swagger
 * /api/v1/core/property-manager/update:
 *   put:
 *     summary: Update property information
 *     tags: [Property Manager]
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
 *               - propertyType
 *               - value
 *               - contractAddress
 *             properties:
 *               propertyId:
 *                 type: string
 *               propertyType:
 *                 type: string
 *               value:
 *                 type: string
 *               contractAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Property updated successfully
 */
router.put('/update',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(PropertyManagerController, 'updatePropertyStatus')
);

// 现在放置所有带通配符的路由

/**
 * @swagger
 * /api/v1/core/property-manager/{propertyId}:
 *   get:
 *     summary: Get property information
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property information retrieved successfully
 */
router.get('/:propertyId',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ValidatorMiddleware.validateAddress('propertyId', 'params'),
    ControllerFactory.getHandler(PropertyManagerController, 'getPropertyInfo')
);

/**
 * @swagger
 * /api/v1/core/property-manager/{propertyId}/token:
 *   get:
 *     summary: Get property token information
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property token information retrieved successfully
 */
router.get('/:propertyId/token',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ValidatorMiddleware.validateAddress('propertyId', 'params'),
    ControllerFactory.getHandler(PropertyManagerController, 'getPropertyToken')
);

/**
 * @swagger
 * /api/v1/core/property-manager/{propertyId}/status:
 *   get:
 *     summary: Get property status
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property status retrieved successfully
 */
router.get('/:propertyId/status',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ValidatorMiddleware.validateAddress('propertyId', 'params'),
    ControllerFactory.getHandler(PropertyManagerController, 'getPropertyInfo')
);

/**
 * @swagger
 * /api/v1/core/property-manager/{propertyId}/type:
 *   get:
 *     summary: Get property type
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property type retrieved successfully
 */
router.get('/:propertyId/type',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ValidatorMiddleware.validateAddress('propertyId', 'params'),
    ControllerFactory.getHandler(PropertyManagerController, 'getPropertyInfo')
);

/**
 * @swagger
 * /api/v1/core/property-manager/{propertyId}/value:
 *   get:
 *     summary: Get property value
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: contractAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property value retrieved successfully
 */
router.get('/:propertyId/value',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ValidatorMiddleware.validateAddress('propertyId', 'params'),
    ControllerFactory.getHandler(PropertyManagerController, 'getPropertyInfo')
);

module.exports = router; 