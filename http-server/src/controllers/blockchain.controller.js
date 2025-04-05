/**
 * 区块链控制器
 */
const { Logger, Provider, Validation } = require('../../../shared/src');
const blockchainService = require('../services/blockchainService');
const { success, error } = require('../utils/responseFormatter');

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
    Logger.error('获取区块链网络信息失败', { error: err });
    return next(err);
  }
}

/**
 * 获取区块链连接状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getConnectionStatus(req, res, next) {
  try {
    const isConnected = await blockchainService.isConnected();
    return success(res, {
      connected: isConnected,
      networkType: blockchainService.getNetworkType()
    });
  } catch (err) {
    Logger.error('获取区块链连接状态失败', { error: err });
    return next(err);
  }
}

/**
 * 获取交易信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getTransaction(req, res, next) {
  try {
    const { hash } = req.params;
    
    // 验证交易哈希格式
    if (!Validation.isValidTxHash(hash)) {
      return error(res, {
        message: '无效的交易哈希格式',
        code: 'INVALID_TX_HASH'
      }, 400);
    }
    
    const provider = blockchainService.getProvider();
    const transaction = await Provider.getTransaction(provider, hash);
    
    if (!transaction) {
      return error(res, {
        message: `交易未找到: ${hash}`,
        code: 'TX_NOT_FOUND'
      }, 404);
    }
    
    return success(res, transaction);
  } catch (err) {
    Logger.error(`获取交易信息失败: ${req.params.hash}`, { error: err });
    return next(err);
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
    const provider = blockchainService.getProvider();
    const gasPrice = await Provider.getGasPrice(provider);
    
    return success(res, {
      gasPrice: gasPrice.toString(),
      formattedGasPrice: `${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`
    });
  } catch (err) {
    Logger.error('获取Gas价格失败', { error: err });
    return next(err);
  }
}

module.exports = {
  getNetworkInfo,
  getConnectionStatus,
  getTransaction,
  getGasPrice
}; 