/**
 * 认证中间件
 * 验证API请求的访问权限
 */
const { ApiError } = require('../utils/errors');

/**
 * API密钥验证配置
 */
const AUTH_CONFIG = {
  apiKey: process.env.API_KEY || 'dev-api-key',
  header: 'x-api-key'
};

/**
 * 认证中间件函数
 * @returns {Function} Express中间件函数
 */
function authMiddleware() {
  return (req, res, next) => {
    // 获取请求头中的API密钥
    const apiKey = req.header(AUTH_CONFIG.header);

    // 验证API密钥是否存在且有效
    if (!apiKey || apiKey !== AUTH_CONFIG.apiKey) {
      throw new ApiError({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: '未授权访问，需要有效的API密钥'
      });
    }

    // 继续处理请求
    next();
  };
}

module.exports = { authMiddleware }; 