const logger = require('../../../shared/utils/logger');
const { ApiError, BaseError, ValidationError, NetworkError, ContractError } = require('../../../shared/utils/errors');

/**
 * 处理404路由错误
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一个中间件
 */
const notFoundHandler = (req, res, next) => {
  next(new ApiError({
    message: `找不到路由: ${req.originalUrl}`,
    statusCode: 404,
    code: 'NOT_FOUND'
  }));
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
    
    // 处理API错误和BaseError
    if (err instanceof BaseError) {
      const statusCode = err.statusCode || 
                        (err.code === 'NETWORK_ERROR' ? 503 : 
                        err.code === 'VALIDATION_ERROR' ? 400 : 
                        err.code === 'CONTRACT_ERROR' ? 400 : 500);
      
      return res.status(statusCode).json({
        success: false,
        error: {
          message: err.message,
          code: err.code,
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
          code: 'VALIDATION_ERROR',
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
          code: 'INVALID_TOKEN',
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
          code: 'TOKEN_EXPIRED',
          details: err.message,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 处理其他所有错误
    const statusCode = err.statusCode || 500;
    const errorResponse = {
      success: false,
      error: {
        message: statusCode === 500 ? '服务器内部错误' : err.message,
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      }
    };
    
    if (err.details) {
      errorResponse.error.details = err.details;
    }
    
    return res.status(statusCode).json(errorResponse);
  } catch (error) {
    // 处理错误处理器中的错误
    logger.error('错误处理器失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: '服务器内部错误',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 创建常用错误的便捷函数
 */
const createError = {
  badRequest: (message, details = {}) => new ApiError({
    message,
    statusCode: 400,
    code: 'BAD_REQUEST',
    details
  }),
  
  unauthorized: (message = '未提供有效的认证信息', details = {}) => new ApiError({
    message,
    statusCode: 401,
    code: 'UNAUTHORIZED',
    details
  }),
  
  forbidden: (message = '您没有权限执行此操作', details = {}) => new ApiError({
    message,
    statusCode: 403,
    code: 'FORBIDDEN',
    details
  }),
  
  notFound: (message = '请求的资源不存在', details = {}) => new ApiError({
    message,
    statusCode: 404,
    code: 'NOT_FOUND',
    details
  }),
  
  conflict: (message, details = {}) => new ApiError({
    message,
    statusCode: 409,
    code: 'CONFLICT',
    details
  }),
  
  unprocessableEntity: (message, details = {}) => new ApiError({
    message,
    statusCode: 422,
    code: 'UNPROCESSABLE_ENTITY',
    details
  }),
  
  internal: (message = '服务器内部错误', details = {}) => new ApiError({
    message,
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    details
  }),
  
  serviceUnavailable: (message = '服务暂时不可用', details = {}) => new ApiError({
    message,
    statusCode: 503,
    code: 'SERVICE_UNAVAILABLE',
    details
  }),
  
  contractError: (message, details = {}) => new ContractError(message, details),
  
  validationError: (message, details = {}) => new ValidationError(message, details),
  
  networkError: (message, details = {}) => new NetworkError(message, details)
};

module.exports = {
  notFoundHandler,
  errorHandler,
  createError
}; 