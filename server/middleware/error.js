const { Logger } = require('../../common');
const { ResponseUtils } = require('../utils');

/**
 * 错误处理中间件
 */
class ErrorMiddleware {
  /**
   * 处理错误
   * @param {Error} err - 错误对象
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  static handleError(err, req, res, next) {
    // 记录错误日志
    Logger.error('请求处理错误', { error: err.message, stack: err.stack });

    // 设置默认错误状态码
    const statusCode = err.statusCode || 500;
    
    // 使用统一的响应格式
    ResponseUtils.sendError(
      res, 
      err.message || '服务器内部错误', 
      statusCode, 
      process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}
    );
  }

  /**
   * 处理404错误
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static handleNotFound(req, res) {
    Logger.warn('请求的资源不存在', { path: req.path });
    
    // 使用统一的响应格式
    ResponseUtils.sendError(res, '请求的资源不存在', 404);
  }
}

module.exports = ErrorMiddleware; 