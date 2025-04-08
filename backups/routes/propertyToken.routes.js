const express = require('express');
const router = express.Router();
const PropertyTokenController = require('../../controllers/core/PropertyTokenController');
const AuthMiddleware = require('../../middleware/auth');
const ValidatorMiddleware = require('../../middleware/validator');
const { ControllerFactory } = require('../../utils');

/**
 * @swagger
 * tags:
 *   name: Property Token
 *   description: Property token operations
 */

/**
 * @swagger
 * /api/v1/core/property-token/{tokenId}:
 *   get:
 *     summary: Get token information
 *     tags: [Property Token]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
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
 *         description: Token information retrieved successfully
 */
router.get('/:tokenId',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(PropertyTokenController, 'getTokenInfo')
);

/**
 * @swagger
 * /api/v1/core/property-token/balance/{address}:
 *   get:
 *     summary: Get token balance
 *     tags: [Property Token]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: address
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
 *         description: Token balance retrieved successfully
 */
router.get('/balance/:address',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ValidatorMiddleware.validateAddress('address'),
    ControllerFactory.getHandler(PropertyTokenController, 'getTokenBalance')
);

/**
 * @swagger
 * /api/v1/core/property-token/{tokenId}/owner:
 *   get:
 *     summary: Get token owner
 *     tags: [Property Token]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
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
 *         description: Token owner retrieved successfully
 */
router.get('/:tokenId/owner',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(PropertyTokenController, 'getTokenInfo')
);

/**
 * @swagger
 * /api/v1/core/property-token/{tokenId}/property-id:
 *   get:
 *     summary: Get property ID
 *     tags: [Property Token]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
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
 *         description: Property ID retrieved successfully
 */
router.get('/:tokenId/property-id',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(PropertyTokenController, 'getTokenInfo')
);

/**
 * @swagger
 * /api/v1/core/property-token/{tokenId}/property-id-hash:
 *   get:
 *     summary: Get property ID hash
 *     tags: [Property Token]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
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
 *         description: Property ID hash retrieved successfully
 */
router.get('/:tokenId/property-id-hash',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(PropertyTokenController, 'getTokenInfo')
);

/**
 * @swagger
 * /api/v1/core/property-token/{tokenId}/property-type:
 *   get:
 *     summary: Get property type
 *     tags: [Property Token]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
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
router.get('/:tokenId/property-type',
    AuthMiddleware.validateApiKey,
    ValidatorMiddleware.validateAddress('contractAddress'),
    ControllerFactory.getHandler(PropertyTokenController, 'getTokenInfo')
);

module.exports = router; 