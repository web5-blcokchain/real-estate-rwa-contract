/**
 * API响应格式化工具
 */
const { ErrorHandler } = require('../../../shared/src');

/**
 * 成功响应格式化
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {number} statusCode - HTTP状态码，默认200
 * @returns {Object} 格式化后的响应
 */
function success(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * 错误响应格式化
 * @param {Object} res - Express响应对象
 * @param {Error|string} error - 错误对象或错误消息
 * @param {number} statusCode - HTTP状态码，默认400
 * @returns {Object} 格式化后的响应
 */
function error(res, error, statusCode = 400) {
  // 使用ErrorHandler处理错误
  const handledError = ErrorHandler.handle(error, { type: 'api' });
  
  // 确定状态码
  statusCode = handledError.statusCode || statusCode;
  
  // 构建错误响应
  return res.status(statusCode).json({
    success: false,
    error: {
      code: handledError.code || 'ERROR',
      message: handledError.message || '未知错误'
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * 分页响应格式化
 * @param {Object} res - Express响应对象
 * @param {Array} items - 分页数据项
 * @param {Object} pagination - 分页信息
 * @param {number} statusCode - HTTP状态码，默认200
 * @returns {Object} 格式化后的分页响应
 */
function paginated(res, items, pagination, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data: {
      items,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.totalItems,
        totalPages: pagination.totalPages
      }
    },
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  success,
  error,
  paginated
}; 