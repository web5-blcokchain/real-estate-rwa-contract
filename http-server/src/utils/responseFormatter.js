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
 * @param {Error|string} err - 错误对象或错误消息
 * @param {number} statusCode - HTTP状态码，默认400
 * @returns {Object} 格式化后的响应
 */
function error(res, err, statusCode = 400) {
  // 检查res是否有效
  if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
    console.error('Invalid response object in error formatter:', res);
    throw new Error('Invalid response object provided to error formatter');
  }

  // 如果是字符串，创建一个错误对象
  const error = typeof err === 'string' ? new Error(err) : err;
  
  // 构建错误响应
  return res.status(statusCode).json({
    success: false,
    error: {
      code: error.code || 'ERROR',
      message: error.message || '未知错误'
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * 业务失败响应格式化
 * @param {Object} res - Express响应对象
 * @param {string} message - 失败消息
 * @param {Object} details - 额外的失败详情
 * @param {number} statusCode - HTTP状态码，默认400
 * @returns {Object} 格式化后的响应
 */
function failure(res, message, details = null, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    failure: {
      message: message || '操作失败',
      details: details
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
  failure,
  paginated
}; 