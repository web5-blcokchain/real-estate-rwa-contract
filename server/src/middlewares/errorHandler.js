/**
 * 全局错误处理中间件
 */
const { Logger, ErrorHandler } = require('../lib/shared');
const { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES } = require('../constants');

/**
 * 错误处理
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function errorHandler(err, req, res, next) {
  // 使用 ErrorHandler 统一处理错误
  const handledError = ErrorHandler.handle(err, {
    type: 'api',
    context: {
      path: req.path,
      method: req.method,
      ip: req.ip
    }
  });
  
  // 提取错误信息
  const statusCode = handledError.statusCode || 500;
  const errorCode = handledError.code || 'INTERNAL_SERVER_ERROR';
  const message = handledError.message || '服务器内部错误';
  
  // 记录错误日志
  Logger.error(`API错误: ${message}`, {
    error: handledError,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // 格式化错误响应
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message
    }
  };
  
  // 在开发环境中添加详细信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = handledError.stack;
    
    // 如果是区块链错误，添加更多上下文
    if (handledError.originalError) {
      errorResponse.error.originalError = {
        message: handledError.originalError.message,
        code: handledError.originalError.code
      };
    }
    
    // 添加上下文信息（如果有）
    if (handledError.context) {
      errorResponse.error.context = handledError.context;
    }
  }
  
  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler; 