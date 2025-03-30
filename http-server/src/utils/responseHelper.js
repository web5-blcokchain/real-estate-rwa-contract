/**
 * 响应格式化工具
 * 为API响应提供统一的格式化
 */

/**
 * 创建成功响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 成功消息
 * @returns {Object} 格式化的响应对象
 */
function createSuccessResponse(data = null, message = '操作成功') {
  return {
    status: 'success',
    message,
    data
  };
}

/**
 * 创建错误响应对象
 * @param {string} message - 错误消息
 * @param {string} code - 错误代码
 * @param {*} details - 错误详情
 * @returns {Object} 格式化的错误响应对象
 */
function createErrorResponse(message = '操作失败', code = 'UNKNOWN_ERROR', details = null) {
  const response = {
    status: 'error',
    message,
    code
  };

  if (details) {
    response.details = details;
  }

  return response;
}

/**
 * 创建分页响应对象
 * @param {Array} items - 分页项目
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总记录数
 * @param {string} message - 成功消息
 * @returns {Object} 格式化的分页响应对象
 */
function createPaginatedResponse(items = [], page = 1, limit = 10, total = 0, message = '获取数据成功') {
  return {
    status: 'success',
    message,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  };
}

/**
 * 创建交易响应对象
 * @param {string} txHash - 交易哈希
 * @param {string} message - 成功消息
 * @returns {Object} 格式化的交易响应对象
 */
function createTransactionResponse(txHash, message = '交易已提交') {
  return {
    status: 'success',
    message,
    data: {
      txHash,
      timestamp: new Date().toISOString()
    }
  };
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createTransactionResponse
}; 