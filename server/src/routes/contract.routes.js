/**
 * 合约相关路由
 */
const express = require('express');
const contractController = require('../controllers/contract.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

/**
 * @swagger
 * /api/v1/contract/abi:
 *   get:
 *     summary: 获取所有合约ABI信息
 *     description: 返回系统中所有已配置合约的ABI信息
 *     tags: [Contract]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功返回合约ABI列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
router.get('/abi', apiKey, contractController.getAllABI);

/**
 * @swagger
 * /api/v1/contract/abi/{contractName}:
 *   get:
 *     summary: 获取特定合约ABI信息
 *     description: 根据合约名称返回特定合约的ABI信息
 *     tags: [Contract]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contractName
 *         required: true
 *         schema:
 *           type: string
 *         description: 合约名称
 *     responses:
 *       200:
 *         description: 成功返回合约ABI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       401:
 *         description: 未授权
 *       404:
 *         description: 合约未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/abi/:contractName', apiKey, contractController.getABIByName);

/**
 * @swagger
 * /api/v1/contract/address:
 *   get:
 *     summary: 获取所有合约地址
 *     description: 返回系统中所有已配置合约的地址信息
 *     tags: [Contract]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功返回合约地址列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
router.get('/address', apiKey, contractController.getAllAddresses);

/**
 * @swagger
 * /api/v1/contract/address/{contractName}:
 *   get:
 *     summary: 获取特定合约地址
 *     description: 根据合约名称返回特定合约的地址
 *     tags: [Contract]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: contractName
 *         required: true
 *         schema:
 *           type: string
 *         description: 合约名称
 *     responses:
 *       200:
 *         description: 成功返回合约地址
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: string
 *       401:
 *         description: 未授权
 *       404:
 *         description: 合约未找到
 *       500:
 *         description: 服务器内部错误
 */
router.get('/address/:contractName', apiKey, contractController.getAddressByName);

module.exports = router; 