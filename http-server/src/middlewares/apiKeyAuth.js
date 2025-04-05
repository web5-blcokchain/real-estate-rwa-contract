/**
 * API密钥认证中间件
 */
const { Logger } = require('../../../shared/src');

/**
 * 验证API密钥
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function apiKeyAuth(req, res, next) {
  // 从环境变量获取API密钥配置
  const configuredApiKey = process.env.API_KEY;
  
  // 从URL参数获取API密钥
  const apiKey = req.query.api_key;
  
  // 在开发模式下禁用API密钥验证
  const isDevelopment = process.env.NODE_ENV === 'development';
  const disableAuth = process.env.DISABLE_API_AUTH === 'true';
  
  if ((isDevelopment && disableAuth) || !configuredApiKey) {
    Logger.debug('API密钥验证已禁用，跳过验证', {
      path: req.path,
      method: req.method
    });
    return next();
  }
  
  // 检查API密钥是否提供
  if (!apiKey) {
    Logger.warn('API请求未提供密钥', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'API密钥未提供',
        details: '请在URL中添加api_key参数'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // 验证API密钥
  if (apiKey !== configuredApiKey) {
    Logger.warn('API密钥验证失败', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      providedKey: apiKey.substring(0, 4) + '****'
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'API密钥无效'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // 验证通过
  Logger.debug('API密钥验证通过', {
    path: req.path,
    method: req.method
  });
  
  next();
}

module.exports = apiKeyAuth; 