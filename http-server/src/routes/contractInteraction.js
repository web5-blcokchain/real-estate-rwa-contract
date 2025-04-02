/**
 * ContractInteraction路由
 * 提供通用的合约交互API端点
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractInteractionController');

/**
 * @swagger
 * /api/v1/contract-interaction/read:
 *   post:
 *     summary: 调用合约只读方法
 *     tags: [ContractInteraction]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractName
 *               - methodName
 *             properties:
 *               contractName:
 *                 type: string
 *                 description: 合约名称
 *               methodName:
 *                 type: string
 *                 description: 方法名称
 *               args:
 *                 type: array
 *                 description: 参数数组
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 成功，返回调用结果
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/read', controller.callContractReadMethod);

/**
 * @swagger
 * /api/v1/contract-interaction/write:
 *   post:
 *     summary: 发送交易到合约方法
 *     tags: [ContractInteraction]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractName
 *               - methodName
 *               - privateKey
 *             properties:
 *               contractName:
 *                 type: string
 *                 description: 合约名称
 *               methodName:
 *                 type: string
 *                 description: 方法名称
 *               args:
 *                 type: array
 *                 description: 参数数组
 *                 items:
 *                   type: string
 *               privateKey:
 *                 type: string
 *                 description: 私钥
 *     responses:
 *       200:
 *         description: 成功，返回交易结果
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/write', controller.sendContractWriteTransaction);

/**
 * @swagger
 * /api/v1/contract-interaction/abi/{contractName}:
 *   get:
 *     summary: 获取合约ABI
 *     tags: [ContractInteraction]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: contractName
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: 合约名称
 *     responses:
 *       200:
 *         description: 成功，返回合约ABI
 *       400:
 *         description: 参数验证失败
 *       401:
 *         description: 未授权
 *       404:
 *         description: 找不到指定合约ABI
 *       500:
 *         description: 服务器错误
 */
router.get('/abi/:contractName', controller.getContractAbi);

/**
 * @swagger
 * /api/v1/contract-interaction/network:
 *   get:
 *     summary: 获取网络信息
 *     tags: [ContractInteraction]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功，返回网络信息
 *       401:
 *         description: 未授权
 *       404:
 *         description: 找不到活动网络
 *       500:
 *         description: 服务器错误
 */
router.get('/network', controller.getNetworkInfo);

module.exports = router; 