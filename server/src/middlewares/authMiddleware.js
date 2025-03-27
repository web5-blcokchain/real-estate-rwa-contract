const { ApiError } = require('../../../shared/utils/errors');
const logger = require('../utils/logger');

/**
 * 获取请求中的API密钥
 * @param {object} req Express 请求对象
 * @returns {string|null} API密钥或 null
 */
const getApiKeyFromRequest = (req) => {
  // 从头部获取 API 密钥
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return apiKey;
  }
  
  // 从查询参数获取 API 密钥
  if (req.query && req.query.apiKey) {
    return req.query.apiKey;
  }
  
  return null;
};

/**
 * 简单认证中间件
 * 验证API密钥
 */
const authMiddleware = () => {
  // 检查当前环境 - 开发环境下使用模拟认证
  if (process.env.NODE_ENV === 'development') {
    return mockAuthMiddleware();
  }

  return async (req, res, next) => {
    try {
      // 从环境变量获取API密钥
      const validApiKey = process.env.API_KEY || 'japan-rwa-default-key';
      
      // 获取请求中的API密钥
      const apiKey = getApiKeyFromRequest(req);
      
      if (!apiKey) {
        throw new ApiError({
          message: '未提供API密钥',
          statusCode: 401,
          code: 'UNAUTHORIZED'
        });
      }
      
      // 简单字符串比较验证
      if (apiKey !== validApiKey) {
        logger.warn(`无效的API密钥尝试: ${apiKey}`);
        throw new ApiError({
          message: '无效的API密钥',
          statusCode: 401,
          code: 'UNAUTHORIZED'
        });
      }
      
      // 添加用户标识到请求
      req.user = {
        authenticated: true,
        apiKey: apiKey
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 开发环境认证中间件（不做验证）
 */
const mockAuthMiddleware = () => {
  return (req, res, next) => {
    // 为请求添加默认认证
    req.user = {
      authenticated: true,
      apiKey: 'dev-mode'
    };
    
    next();
  };
};

// 导出中间件
module.exports = {
  authMiddleware
}; 