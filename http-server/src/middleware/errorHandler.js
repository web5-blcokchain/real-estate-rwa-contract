/**
 * 错误处理中间件
 * 统一处理API错误响应
 */

const { logger } = require('../utils/logger');

/**
 * API错误类
 */
class ApiError extends Error {
  constructor(status, message, errorCode = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.errorCode = errorCode || `API_ERROR_${status}`;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 创建400错误 - 错误的请求
   * @param {string} message 错误消息
   * @returns {ApiError} 错误实例
   */
  static badRequest(message) {
    return new ApiError(400, message, 'BAD_REQUEST');
  }

  /**
   * 创建401错误 - 未授权
   * @param {string} message 错误消息
   * @returns {ApiError} 错误实例
   */
  static unauthorized(message = '未授权，请提供有效的API密钥') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  /**
   * 创建403错误 - 禁止访问
   * @param {string} message 错误消息
   * @returns {ApiError} 错误实例
   */
  static forbidden(message = '禁止访问此资源') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  /**
   * 创建404错误 - 未找到
   * @param {string} message 错误消息
   * @returns {ApiError} 错误实例
   */
  static notFound(message = '资源未找到') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  /**
   * 创建500错误 - 服务器内部错误
   * @param {string} message 错误消息
   * @returns {ApiError} 错误实例
   */
  static internal(message = '服务器内部错误') {
    return new ApiError(500, message, 'SERVER_ERROR');
  }

  /**
   * 创建502错误 - 网关错误
   * @param {string} message 错误消息
   * @returns {ApiError} 错误实例
   */
  static gatewayError(message = '区块链网关错误') {
    return new ApiError(502, message, 'BLOCKCHAIN_ERROR');
  }
}

/**
 * API错误处理中间件
 * @param {Error} err 错误对象
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {Function} next 下一个中间件
 */
const errorHandler = (err, req, res, next) => {
  let status = 500;
  let message = '服务器内部错误';
  let errorCode = 'SERVER_ERROR';
  let errorDetails = undefined;

  // 如果是ApiError实例，使用其状态码和消息
  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    errorCode = err.errorCode;
  } else if (err.name === 'SyntaxError' && err.status === 400) {
    // JSON解析错误
    status = 400;
    message = '无效的JSON格式';
    errorCode = 'INVALID_JSON';
  } else if (err.name === 'ValidationError') {
    // 验证错误
    status = 400;
    message = '请求数据验证失败';
    errorCode = 'VALIDATION_ERROR';
    errorDetails = err.details;
  } else {
    // 记录未预期的错误
    logger.error('未捕获的错误:', err);
  }

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: message
    }
  };

  // 如果有详细错误信息，添加到响应中
  if (errorDetails) {
    errorResponse.error.details = errorDetails;
  }

  // 在非生产环境下添加堆栈跟踪
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.error.stack = err.stack.split('\n');
  }

  res.status(status).json(errorResponse);
};

/**
 * 404错误处理中间件
 * 处理未匹配的路由
 */
const notFoundHandler = (req, res) => {
  const errorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `未找到路由: ${req.method} ${req.originalUrl}`
    }
  };
  
  res.status(404).json(errorResponse);
};

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler
}; 