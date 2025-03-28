/**
 * 认证中间件
 * 实现简单的API密钥认证
 */

const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * API密钥认证中间件
 * 从URL参数api_key中获取密钥，并与配置的API密钥进行比较
 */
function apiKeyAuth(req, res, next) {
  // 从URL参数获取api_key
  const apiKey = req.query.api_key;
  
  // 检查API密钥是否存在
  if (!apiKey) {
    logger.warn(`认证失败: 缺少API密钥 - IP: ${req.ip}, 路由: ${req.originalUrl}`);
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '认证失败: 缺少API密钥'
      }
    });
  }
  
  // 检查API密钥是否有效
  if (apiKey !== config.server.apiKey) {
    logger.warn(`认证失败: API密钥无效 - IP: ${req.ip}, 路由: ${req.originalUrl}`);
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '认证失败: API密钥无效'
      }
    });
  }
  
  // 认证成功，继续处理请求
  next();
}

module.exports = {
  apiKeyAuth
}; 