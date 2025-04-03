/**
 * API响应处理工具
 */

/**
 * 处理API响应
 * @param {Object} res - Express响应对象
 * @param {any} data - 响应数据
 * @param {string} errorMessage - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} - JSON响应
 */
function handleApiResponse(res, data = null, errorMessage = null, statusCode = 200) {
  const success = !errorMessage;
  
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    response.data = data;
  } else {
    response.error = {
      message: errorMessage
    };
  }
  
  return res.status(statusCode).json(response);
}

module.exports = {
  handleApiResponse
}; 