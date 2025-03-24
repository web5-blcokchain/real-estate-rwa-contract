const { ApiError } = require('./errorHandler');
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
  return async (req, res, next) => {
    try {
      // 从环境变量获取API密钥
      const validApiKey = process.env.API_KEY || 'japan-rwa-default-key';
      
      // 获取请求中的API密钥
      const apiKey = getApiKeyFromRequest(req);
      
      if (!apiKey) {
        throw ApiError.unauthorized('未提供API密钥');
      }
      
      // 简单字符串比较验证
      if (apiKey !== validApiKey) {
        logger.warn(`无效的API密钥尝试: ${apiKey}`);
        throw ApiError.unauthorized('无效的API密钥');
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

// 根据环境导出适当的中间件
const isProduction = process.env.NODE_ENV === 'production';
module.exports = {
  authMiddleware: isProduction ? authMiddleware : mockAuthMiddleware
}; 