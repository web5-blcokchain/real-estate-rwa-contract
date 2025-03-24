const logger = require('../utils/logger');

/**
 * API错误类
 * 用于标准化API错误响应
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * 创建400错误 - 错误的请求
   * @param {string} message 错误信息
   * @returns {ApiError} ApiError实例
   */
  static badRequest(message) {
    return new ApiError(400, message);
  }
  
  /**
   * 创建401错误 - 未授权
   * @param {string} message 错误信息
   * @returns {ApiError} ApiError实例
   */
  static unauthorized(message = '未提供有效的认证信息') {
    return new ApiError(401, message);
  }
  
  /**
   * 创建403错误 - 禁止访问
   * @param {string} message 错误信息
   * @returns {ApiError} ApiError实例
   */
  static forbidden(message = '您没有权限执行此操作') {
    return new ApiError(403, message);
  }
  
  /**
   * 创建404错误 - 资源未找到
   * @param {string} message 错误信息
   * @returns {ApiError} ApiError实例
   */
  static notFound(message = '请求的资源不存在') {
    return new ApiError(404, message);
  }
  
  /**
   * 创建422错误 - 无法处理的实体
   * @param {string} message 错误信息
   * @returns {ApiError} ApiError实例
   */
  static unprocessableEntity(message) {
    return new ApiError(422, message);
  }
  
  /**
   * 创建500错误 - 服务器内部错误
   * @param {string} message 错误信息
   * @param {boolean} isOperational 是否是可操作的错误
   * @returns {ApiError} ApiError实例
   */
  static internal(message = '服务器内部错误', isOperational = true) {
    return new ApiError(500, message, isOperational);
  }
  
  /**
   * 创建503错误 - 服务不可用
   * @param {string} message 错误信息
   * @returns {ApiError} ApiError实例
   */
  static serviceUnavailable(message = '服务暂时不可用') {
    return new ApiError(503, message);
  }
  
  /**
   * 创建链上操作错误
   * @param {string} message 错误信息
   * @returns {ApiError} ApiError实例
   */
  static contractError(message) {
    return new ApiError(500, `区块链操作失败: ${message}`, true);
  }
}

/**
 * 处理404路由错误
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一个中间件
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`找不到路由: ${req.originalUrl}`));
};

/**
 * 全局错误处理中间件
 * @param {Error} err 错误对象
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一个中间件
 */
const errorHandler = (err, req, res, next) => {
  let error = err;
  
  // 如果不是ApiError实例，则转换为ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || '发生了未知错误';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  // 记录错误日志
  logger.error(
    `[${req.method}] ${req.path} >> StatusCode: ${error.statusCode}, Message: ${error.message}`,
    error.stack
  );
  
  // 发送响应
  const response = {
    success: false,
    error: {
      status: error.statusCode,
      message: error.message
    }
  };
  
  // 在开发环境中添加错误堆栈
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack;
  }
  
  res.status(error.statusCode).json(response);
};

/**
 * 异步处理包装器
 * 捕获异步中间件中的错误
 * @param {function} fn 异步函数
 * @returns {function} 包装后的函数
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler
}; 