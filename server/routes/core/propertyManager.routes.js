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
    PropertyManagerController.registerProperty
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
    PropertyManagerController.updateProperty
);

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
    ControllerFactory.getHandler(PropertyManagerController, 'getPropertyStatus')
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
    ControllerFactory.getHandler(PropertyManagerController, 'getPropertyType')
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
    ControllerFactory.getHandler(PropertyManagerController, 'getPropertyValue')
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
    ControllerFactory.getHandler(PropertyManagerController, 'getAllProperties')
);

module.exports = router; 