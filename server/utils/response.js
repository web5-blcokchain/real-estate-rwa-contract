/**
 * 响应格式化工具类
 * 用于统一API响应格式
 */
const { Logger } = require('../../common');

class ResponseUtils {
  /**
   * 生成成功响应
   * @param {Object} data - 响应数据
   * @param {Object} [meta] - 元数据
   * @returns {Object} 格式化的响应对象
   */
  static success(data, meta = {}) {
    return {
      success: true,
      data,
      meta
    };
  }

  /**
   * 生成错误响应
   * @param {string} error - 错误消息
   * @param {number} [status=500] - HTTP状态码
   * @param {Object} [details] - 错误详情
   * @returns {Object} 格式化的错误响应对象
   */
  static error(error, status = 500, details = {}) {
    return {
      success: false,
      error,
      status,
      details
    };
  }

  /**
   * 格式化合约错误
   * @param {Error} error - 错误对象
   * @returns {Object} 格式化的合约错误响应
   */
  static formatContractError(error) {
    Logger.error('合约错误', { error: error.message, code: error.code, stack: error.stack });

    // 合约调用错误
    if (error.code === 'CALL_EXCEPTION') {
      return ResponseUtils.error(
        '合约调用失败', 
        400, 
        { reason: error.reason || error.message }
      );
    }
    
    // 余额不足
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return ResponseUtils.error('余额不足', 400);
    }
    
    // 网络错误
    if (error.code === 'NETWORK_ERROR') {
      return ResponseUtils.error(
        '网络错误', 
        503, 
        { message: error.message }
      );
    }

    // 交易被拒绝
    if (error.code === 'ACTION_REJECTED') {
      return ResponseUtils.error('交易被拒绝', 400);
    }
    
    // 参数错误
    if (error.code === 'INVALID_ARGUMENT') {
      return ResponseUtils.error(
        '无效的参数', 
        400, 
        { message: error.message }
      );
    }

    // 其他错误
    return ResponseUtils.error(
      '未知错误', 
      500, 
      { message: error.message }
    );
  }

  /**
   * 发送成功响应
   * @param {Object} res - Express响应对象
   * @param {Object} data - 响应数据
   * @param {Object} [meta] - 元数据
   */
  static sendSuccess(res, data, meta = {}) {
    res.json(ResponseUtils.success(data, meta));
  }

  /**
   * 发送错误响应
   * @param {Object} res - Express响应对象
   * @param {string} error - 错误消息
   * @param {number} [status=500] - HTTP状态码
   * @param {Object} [details] - 错误详情
   */
  static sendError(res, error, status = 500, details = {}) {
    res.status(status).json(ResponseUtils.error(error, status, details));
  }

  /**
   * 发送合约错误响应
   * @param {Object} res - Express响应对象
   * @param {Error} error - 错误对象
   */
  static sendContractError(res, error) {
    const errorResponse = ResponseUtils.formatContractError(error);
    res.status(errorResponse.status).json(errorResponse);
  }
}

module.exports = ResponseUtils; 