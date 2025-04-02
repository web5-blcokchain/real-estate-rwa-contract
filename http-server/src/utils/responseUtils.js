/**
 * 响应工具函数
 * 提供统一的API响应格式
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {String} message - 响应消息
 * @param {Number} statusCode - HTTP状态码，默认200
 * @returns {Object} Express响应对象
 */
exports.success = (res, data = null, message = '操作成功', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {String} message - 错误消息
 * @param {String} error - 错误类型
 * @param {Number} statusCode - HTTP状态码，默认500
 * @param {*} details - 错误详情，仅在开发环境返回
 * @returns {Object} Express响应对象
 */
exports.error = (res, message = '服务器内部错误', error = 'InternalServerError', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error,
    message
  };
  
  // 在开发环境添加错误详情
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * 验证错误响应
 * @param {Object} res - Express响应对象
 * @param {String} message - 错误消息
 * @param {*} details - 验证错误详情
 * @returns {Object} Express响应对象
 */
exports.validationError = (res, message = '数据验证失败', details = null) => {
  return exports.error(res, message, 'ValidationError', 400, details);
};

/**
 * 资源未找到响应
 * @param {Object} res - Express响应对象
 * @param {String} message - 错误消息
 * @returns {Object} Express响应对象
 */
exports.notFound = (res, message = '请求的资源不存在') => {
  return exports.error(res, message, 'NotFoundError', 404);
};

/**
 * 未授权响应
 * @param {Object} res - Express响应对象
 * @param {String} message - 错误消息
 * @returns {Object} Express响应对象
 */
exports.unauthorized = (res, message = '未授权访问') => {
  return exports.error(res, message, 'UnauthorizedError', 401);
}; 