/**
 * 全局错误处理中间件
 */
const { Logger, ErrorHandler } = require('../../../shared/src');

/**
 * 处理API错误并返回统一格式的响应
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function errorHandler(err, req, res, next) {
  // 使用shared的ErrorHandler统一处理错误
  const handledError = ErrorHandler.handle(err, {
    type: 'api',
    context: {
      path: req.path,
      method: req.method,
      ip: req.ip
    }
  });
  
  // 确定状态码
  const statusCode = handledError.statusCode || 
                    (handledError.code === 'NOT_FOUND' ? 404 : 
                     handledError.code === 'UNAUTHORIZED' ? 401 : 
                     handledError.code === 'FORBIDDEN' ? 403 : 
                     handledError.code === 'BAD_REQUEST' ? 400 : 500);
  
  // 准备错误响应
  const errorResponse = {
    success: false,
    error: {
      code: handledError.code || 'INTERNAL_SERVER_ERROR',
      message: handledError.message || '服务器内部错误'
    },
    timestamp: new Date().toISOString()
  };
  
  // 在开发环境中添加错误堆栈
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = handledError.stack;
    
    // 如果有原始错误，也包含它的信息
    if (handledError.originalError) {
      errorResponse.error.originalError = {
        message: handledError.originalError.message,
        stack: handledError.originalError.stack
      };
    }
  }
  
  // 记录错误日志
  Logger.error(`API错误: ${handledError.message}`, {
    error: handledError,
    path: req.path,
    method: req.method,
    statusCode,
    requestId: req.requestId
  });
  
  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler; 