/**
 * 区块链相关控制器
 */
const { Logger, ErrorHandler } = require('../../../shared/src');
const { validateParams } = require('../utils');
const { success, error } = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../constants');
const blockchainService = require('../services/blockchain.service');

/**
 * 获取区块链网络信息
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

module.exports = {
  getNetworkInfo,
  getTransaction,
  getGasPrice
}; 