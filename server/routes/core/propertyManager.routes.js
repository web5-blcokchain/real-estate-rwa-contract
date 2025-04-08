const express = require('express');
const router = express.Router();
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
 *     summary: 获取房产列表（分页）
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: 分页起始位置（默认0）
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 每页数量（默认10，最大100）
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: 可选的状态筛选（0=未注册, 1=待审批, 2=已批准, 3=已拒绝, 4=已下架）
 *     responses:
 *       200:
 *         description: 房产列表获取成功
 *       400:
 *         description: 参数错误
 */
router.get('/properties',
    AuthMiddleware.validateApiKey,
    ControllerFactory.getHandler('PropertyManagerController', 'getProperties')
);

/**
 * @swagger
 * /api/v1/core/property-manager/properties/{owner}:
 *   get:
 *     summary: Get all properties for an owner
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 */
router.get('/properties/:owner',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('owner', 'params'),
    ControllerFactory.getHandler('PropertyManagerController', 'getOwnerProperties')
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
 *               - propertyDetails
 *             properties:
 *               propertyDetails:
 *                 type: object
 *                 required:
 *                   - propertyId
 *                   - propertyType
 *                   - value
 *                   - owner
 *                 properties:
 *                   propertyId:
 *                     type: string
 *                   propertyType:
 *                     type: integer
 *                   value:
 *                     type: string
 *                   owner:
 *                     type: string
 *     responses:
 *       200:
 *         description: Property registered successfully
 */
router.post('/register',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('propertyDetails.owner'),
    ControllerFactory.getHandler('PropertyManagerController', 'registerProperty')
);

/**
 * @swagger
 * /api/v1/core/property-manager/update-status:
 *   put:
 *     summary: Update property status
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
 *               - newStatus
 *             properties:
 *               propertyId:
 *                 type: string
 *               newStatus:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Property status updated successfully
 */
router.put('/update-status',
    AuthMiddleware.validateApiKey,
    ControllerFactory.getHandler('PropertyManagerController', 'updatePropertyStatus')
);

/**
 * @swagger
 * /api/v1/core/property-manager/transfer-ownership:
 *   post:
 *     summary: Transfer property ownership
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
 *               - newOwner
 *             properties:
 *               propertyId:
 *                 type: string
 *               newOwner:
 *                 type: string
 *     responses:
 *       200:
 *         description: Property ownership transferred successfully
 */
router.post('/transfer-ownership',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('newOwner'),
    ControllerFactory.getHandler('PropertyManagerController', 'transferPropertyOwnership')
);

/**
 * @swagger
 * /api/v1/core/property-manager/set-token:
 *   post:
 *     summary: Set property token
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
 *               - tokenAddress
 *             properties:
 *               propertyId:
 *                 type: string
 *               tokenAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Property token set successfully
 */
router.post('/set-token',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('tokenAddress'),
    ControllerFactory.getHandler('PropertyManagerController', 'setPropertyToken')
);

// 路由带通配符的路由

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
 *     responses:
 *       200:
 *         description: Property information retrieved successfully
 */
router.get('/:propertyId',
    AuthMiddleware.validateApiKey,
    ControllerFactory.getHandler('PropertyManagerController', 'getPropertyInfo')
);

/**
 * @swagger
 * /api/v1/core/property-manager/{propertyId}/details:
 *   get:
 *     summary: Get property detailed information
 *     tags: [Property Manager]
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
 *         description: Property details retrieved successfully
 */
router.get('/:propertyId/details',
    AuthMiddleware.validateApiKey,
    ControllerFactory.getHandler('PropertyManagerController', 'getPropertyDetails')
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
 *     responses:
 *       200:
 *         description: Property token information retrieved successfully
 */
router.get('/:propertyId/token',
    AuthMiddleware.validateApiKey,
    ControllerFactory.getHandler('PropertyManagerController', 'getPropertyToken')
);

/**
 * @swagger
 * /api/v1/core/property-manager/verify-ownership/{propertyId}/{owner}:
 *   get:
 *     summary: Verify property ownership
 *     tags: [Property Manager]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property ownership verification result
 */
router.get('/verify-ownership/:propertyId/:owner',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('owner', 'params'),
    ControllerFactory.getHandler('PropertyManagerController', 'verifyPropertyOwnership')
);

module.exports = router; 