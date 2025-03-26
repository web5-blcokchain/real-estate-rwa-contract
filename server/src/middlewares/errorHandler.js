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
 * 错误处理中间件
 * 统一处理API错误
 */
const errorHandler = (err, req, res, next) => {
  try {
    // 记录错误
    logger.error(`API错误 - ${err.message}`, {
      error: err,
      request: {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params
      }
    });
    
    // 处理API错误
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          message: err.message,
          details: err.details,
          timestamp: err.timestamp
        }
      });
    }
    
    // 处理验证错误
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          message: '验证错误',
          details: err.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 处理JWT错误
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: '无效的令牌',
          details: err.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: '令牌已过期',
          details: err.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 处理数据库错误
    if (err.name === 'MongoError') {
      return res.status(500).json({
        success: false,
        error: {
          message: '数据库错误',
          details: err.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 处理区块链错误
    if (err.code === 'NETWORK_ERROR') {
      return res.status(503).json({
        success: false,
        error: {
          message: '网络连接失败',
          details: err.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (err.code === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        success: false,
        error: {
          message: '余额不足',
          details: err.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (err.code === 'CALL_EXCEPTION') {
      return res.status(400).json({
        success: false,
        error: {
          message: '合约调用失败',
          details: err.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 处理其他错误
    return res.status(500).json({
      success: false,
      error: {
        message: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // 处理错误处理过程中的错误
    logger.error('错误处理失败', {
      originalError: err,
      handlerError: error
    });
    
    return res.status(500).json({
      success: false,
      error: {
        message: '服务器内部错误',
        timestamp: new Date().toISOString()
      }
    });
  }
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