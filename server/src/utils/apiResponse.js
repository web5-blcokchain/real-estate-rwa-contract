/**
 * API响应工具
 */
const { ErrorHandler } = require('../lib/shared');
const { HTTP_STATUS } = require('../constants');

/**
 * 处理API响应
 * @param {Object} res - Express响应对象
 * @param {any} data - 响应数据
 * @param {string|Error|null} error - 错误消息或错误对象
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} - JSON响应
 */
function handleApiResponse(res, data = null, error = null, statusCode = 200) {
  const success = !error;
  
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    response.data = data;
  } else {
    // 处理错误信息
    let errorMessage = '';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      // 使用 ErrorHandler 处理错误
      const handledError = ErrorHandler.handle(error, {
        type: 'api',
        context: { path: res.req?.path }
      });
      
      errorMessage = handledError.message;
      errorCode = handledError.code || errorCode;
      
      // 如果错误对象指定了状态码，则使用它
      if (handledError.statusCode && statusCode === 200) {
        statusCode = handledError.statusCode;
      }
    }
    
    response.error = {
      code: errorCode,
      message: errorMessage
    };
    
    // 添加详细错误信息（仅在开发环境）
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      response.error.stack = error.stack;
    }
  }
  
  return res.status(statusCode).json(response);
}

/**
 * 发送成功响应
 * @param {Object} res - Express响应对象
 * @param {any} data - 响应数据
 * @returns {Object} - JSON响应
 */
function success(res, data = null) {
  return handleApiResponse(res, data);
}

/**
 * 发送错误响应
 * @param {Object} res - Express响应对象
 * @param {string|Error} error - 错误消息或错误对象
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} - JSON响应
 */
function error(res, error, statusCode = 500) {
  return handleApiResponse(res, null, error, statusCode);
}

module.exports = {
  handleApiResponse,
  success,
  error
}; 