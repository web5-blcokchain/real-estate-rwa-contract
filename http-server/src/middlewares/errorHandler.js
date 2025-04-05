/**
 * 全局错误处理中间件
 */
const { Logger, ErrorHandler } = require('../../../shared/src');
const { error: formatError } = require('../utils/responseFormatter');

/**
 * 处理API错误并返回统一格式的响应
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function errorHandler(err, req, res, next) {
  // 检查res是否有效
  if (!res || typeof res.status !== 'function') {
    console.error('错误处理中间件: 响应对象不可用或无效', { err });
    // 如果res无效且存在next，让Express的默认错误处理接管
    if (typeof next === 'function') {
      return next(err);
    }
    return;
  }

  try {
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
    
    // 记录错误日志
    Logger.error(`API错误: ${handledError.message}`, {
      error: handledError,
      path: req.path,
      method: req.method,
      statusCode,
      requestId: req.requestId
    });
    
    // 使用responseFormatter发送错误响应
    return formatError(res, handledError, statusCode);
  } catch (formatError) {
    // 如果格式化过程中出错，记录日志并尝试发送基本错误响应
    console.error('Error in error handler:', formatError);
    
    try {
      return res.status(500).json({
        success: false,
        error: {
          code: 'ERROR_HANDLER_FAILED',
          message: '处理错误时出现问题'
        },
        timestamp: new Date().toISOString()
      });
    } catch (finalError) {
      console.error('无法发送最终错误响应:', finalError);
      // 在这里，我们已经尽力了，只能让Express的默认错误处理接管
      next(finalError);
    }
  }
}

module.exports = errorHandler; 