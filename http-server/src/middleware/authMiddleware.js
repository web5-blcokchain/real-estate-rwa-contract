/**
 * API密钥验证中间件
 * 用于保护API端点，验证请求中包含有效的API密钥
 */

const config = require('../config');
const { logger } = require('../utils/logger');

// API密钥验证中间件
function apiKeyAuth(req, res, next) {
  // 从请求头中获取API密钥
  const apiKey = req.query.api_key;
  
  // 检查API密钥是否存在且有效
  if (!apiKey || apiKey !== config.server.apiKey) {
    logger.warn(`无效的API密钥尝试: ${apiKey || '未提供'}, IP: ${req.ip}`);
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '无效的API密钥'
      }
    });
  }
  
  logger.debug(`API密钥验证通过: ${req.method} ${req.originalUrl}`);
  next();
}

module.exports = {
  apiKeyAuth
}; 