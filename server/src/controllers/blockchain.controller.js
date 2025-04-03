/**
 * 区块链相关控制器
 */
const { Logger, ErrorHandler } = require('../../../shared/src');
const { validateParams } = require('../utils');
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
    res.json({
      success: true,
      data: networkInfo
    });
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'api',
      context: {
        method: 'getNetworkInfo'
      }
    });
    Logger.error('获取区块链网络信息失败', { error: handledError });
    next(handledError);
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
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: `交易 ${hash} 不存在或尚未确认`
        }
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'api',
      context: {
        method: 'getTransaction',
        hash: req.params.hash
      }
    });
    Logger.error(`获取交易 ${req.params.hash} 详情失败`, { error: handledError });
    next(handledError);
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
    res.json({
      success: true,
      data: {
        gasPrice: gasPrice.toString(),
        formattedGasPrice: `${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`
      }
    });
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'api',
      context: {
        method: 'getGasPrice'
      }
    });
    Logger.error('获取Gas价格失败', { error: handledError });
    next(handledError);
  }
}

module.exports = {
  getNetworkInfo,
  getTransaction,
  getGasPrice
}; 