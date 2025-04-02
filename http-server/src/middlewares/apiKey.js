/**
 * API密钥验证中间件
 * 检查请求是否包含有效的API密钥
 */

/**
 * 验证API密钥
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件
 */
function apiKey(req, res, next) {
  // 获取配置的API密钥列表
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  // 没有配置API密钥时，跳过验证
  if (validApiKeys.length === 0) {
    return next();
  }
  
  // 从请求中获取API密钥（支持查询参数和请求头）
  const apiKeyFromQuery = req.query.api_key;
  const apiKeyFromHeader = req.headers['x-api-key'];
  const apiKey = apiKeyFromQuery || apiKeyFromHeader;
  
  // 验证API密钥
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    const error = new Error('无效的API密钥');
    error.name = 'AuthorizationError';
    error.statusCode = 401;
    return next(error);
  }
  
  // API密钥有效，继续处理请求
  next();
}

module.exports = apiKey; 