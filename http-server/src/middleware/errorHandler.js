/**
 * 错误处理中间件
 * 统一处理API错误响应
 */

const { logger } = require('../utils/logger');

/**
 * 处理404错误
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    message: `未找到路径: ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
}

/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || '服务器内部错误';
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  
  // 记录错误日志
  logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode} ${errorMessage}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // 发送错误响应
  res.status(statusCode).json({
    status: 'error',
    message: errorMessage,
    code: errorCode,
    stack: stack,
    path: req.originalUrl
  });
}

/**
 * 自定义API错误类
 */
class ApiError extends Error {
  /**
   * 创建API错误
   * @param {string} message - 错误消息
   * @param {number} statusCode - HTTP状态码
   * @param {string} code - 错误代码
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * 创建400错误(Bad Request)
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   */
  static badRequest(message, code = 'BAD_REQUEST') {
    return new ApiError(message, 400, code);
  }
  
  /**
   * 创建401错误(Unauthorized)
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   */
  static unauthorized(message = '未授权访问', code = 'UNAUTHORIZED') {
    return new ApiError(message, 401, code);
  }
  
  /**
   * 创建403错误(Forbidden)
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   */
  static forbidden(message = '禁止访问', code = 'FORBIDDEN') {
    return new ApiError(message, 403, code);
  }
  
  /**
   * 创建404错误(Not Found)
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   */
  static notFound(message = '资源不存在', code = 'NOT_FOUND') {
    return new ApiError(message, 404, code);
  }
  
  /**
   * 创建429错误(Too Many Requests)
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   */
  static tooManyRequests(message = '请求过于频繁', code = 'TOO_MANY_REQUESTS') {
    return new ApiError(message, 429, code);
  }
  
  /**
   * 创建500错误(Internal Server Error)
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   */
  static internal(message = '服务器内部错误', code = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(message, 500, code);
  }
  
  /**
   * 创建503错误(Service Unavailable)
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   */
  static serviceUnavailable(message = '服务暂时不可用', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(message, 503, code);
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  ApiError
}; 