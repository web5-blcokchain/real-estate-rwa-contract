/**
 * 全局错误处理中间件
 * 统一处理API请求中的错误
 */
const { Logger } = require('../../../shared/src');

/**
 * 错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
function errorHandler(err, req, res, next) {
  // 默认错误状态码和类型
  let statusCode = err.statusCode || 500;
  let errorType = err.name || 'ServerError';
  let errorMessage = err.message || '服务器内部错误';
  
  // 根据错误类型设置适当的状态码和错误类型
  switch (errorType) {
    case 'ValidationError':
      statusCode = 400;
      break;
      
    case 'AuthorizationError':
      statusCode = 401;
      break;
      
    case 'AccessDeniedError':
      statusCode = 403;
      break;
      
    case 'NotFoundError':
      statusCode = 404;
      break;
      
    case 'WalletError':
    case 'ContractError':
    case 'NetworkError':
      statusCode = 400;
      break;
      
    case 'RateLimitError':
      statusCode = 429;
      break;
      
    default:
      if (statusCode >= 400 && statusCode < 500) {
        errorType = 'ClientError';
      } else {
        errorType = 'ServerError';
      }
  }
  
  // 记录错误日志
  // 对于5xx错误，记录完整的堆栈信息
  if (statusCode >= 500) {
    Logger.error('服务器错误', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorType,
      errorMessage,
      stack: err.stack
    });
  } else {
    // 对于4xx错误，仅记录基本信息
    Logger.warn('客户端错误', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorType,
      errorMessage
    });
  }
  
  // 构造错误响应
  const errorResponse = {
    success: false,
    error: errorType,
    message: errorMessage
  };
  
  // 在开发环境下添加堆栈信息
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }
  
  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler; 