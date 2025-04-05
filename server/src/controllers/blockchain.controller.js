/**
 * 区块链相关控制器
 * @swagger
 * tags:
 *   name: Blockchain
 *   description: 区块链相关API
 */
const { Logger, ErrorHandler } = require('../lib/shared');
const { validateParams } = require('../utils');
const { success, error } = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../constants');
const blockchainService = require('../services/blockchain.service');

/**
 * 获取区块链网络信息
 * @swagger
 * /api/v1/blockchain/info:
 *   get:
 *     summary: 获取区块链网络信息
 *     description: 返回当前连接的区块链网络信息，包括网络类型、区块高度等
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功返回区块链网络信息
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
 *                   properties:
 *                     networkType:
 *                       type: string
 *                       example: "testnet"
 *                     blockHeight:
 *                       type: number
 *                       example: 12345678
 *                     isConnected:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getNetworkInfo(req, res, next) {
  try {
    const networkInfo = await blockchainService.getNetworkInfo();
    return success(res, networkInfo);
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'api',
      context: {
        method: 'getNetworkInfo'
      }
    });
    Logger.error('获取区块链网络信息失败', { error: handledError });
    return error(res, handledError, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * 获取交易详情
 * @swagger
 * /api/v1/blockchain/tx/{hash}:
 *   get:
 *     summary: 获取交易信息
 *     description: 根据交易哈希获取交易详情
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易哈希
 *     responses:
 *       200:
 *         description: 成功返回交易信息
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
 *         description: 交易未找到
 *       500:
 *         description: 服务器内部错误
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getTransaction(req, res, next) {
  try {
    const { hash } = req.params;
    
    // 验证参数
    validateParams(
      { hash },
      {
        hash: { type: 'string', required: true, format: 'txHash' }
      }
    );
    
    const transaction = await blockchainService.getTransaction(hash);
    
    if (!transaction) {
      const notFoundError = new Error(`交易 ${hash} 不存在或尚未确认`);
      notFoundError.code = ERROR_CODES.TRANSACTION_NOT_FOUND;
      notFoundError.statusCode = HTTP_STATUS.NOT_FOUND;
      return error(res, notFoundError, HTTP_STATUS.NOT_FOUND);
    }
    
    return success(res, transaction);
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'api',
      context: {
        method: 'getTransaction',
        hash: req.params.hash
      }
    });
    Logger.error(`获取交易 ${req.params.hash} 详情失败`, { error: handledError });
    return error(res, handledError);
  }
}

/**
 * 获取当前Gas价格
 * @swagger
 * /api/v1/blockchain/gas-price:
 *   get:
 *     summary: 获取当前Gas价格
 *     description: 返回当前网络的Gas价格估计
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功返回Gas价格信息
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
 *                   properties:
 *                     gasPrice:
 *                       type: string
 *                       example: "25000000000"
 *                     formattedGasPrice:
 *                       type: string
 *                       example: "25.00 Gwei"
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getGasPrice(req, res, next) {
  try {
    const gasPrice = await blockchainService.getGasPrice();
    return success(res, {
      gasPrice: gasPrice.toString(),
      formattedGasPrice: `${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`
    });
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'api',
      context: {
        method: 'getGasPrice'
      }
    });
    Logger.error('获取Gas价格失败', { error: handledError });
    return error(res, handledError);
  }
}

/**
 * 获取区块链状态
 * @swagger
 * /api/v1/blockchain/status:
 *   get:
 *     summary: 获取区块链连接状态
 *     description: 检查区块链连接状态及基本网络信息
 *     tags: [Blockchain]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功返回区块链连接状态
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
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                       example: true
 *                     networkInfo:
 *                       type: object
 *                       properties:
 *                         networkType:
 *                           type: string
 *                           example: "localhost"
 *                         chainId:
 *                           type: number
 *                           example: 31337
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getStatus(req, res, next) {
  try {
    const isConnected = await blockchainService.isConnected();
    const networkInfo = isConnected ? await blockchainService.getNetworkInfo() : null;
    
    return success(res, {
      connected: isConnected,
      networkInfo: networkInfo
    });
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'api',
      context: {
        method: 'getStatus'
      }
    });
    Logger.error('获取区块链状态失败', { error: handledError });
    return error(res, handledError);
  }
}

module.exports = {
  getNetworkInfo,
  getTransaction,
  getGasPrice,
  getStatus
}; 