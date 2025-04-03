/**
 * API密钥验证中间件
 */
const { Logger } = require('../../../shared/src/utils');
const serverConfig = require('../config');

/**
 * API密钥验证
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function apiKey(req, res, next) {
  // 获取认证配置
  const authConfig = serverConfig.getAuthConfig();
  
  // 如果不需要认证，直接通过
  if (!authConfig.requireAuth) {
    return next();
  }
  
  // 从URL参数或请求头获取API密钥
  const key = req.query.api_key || req.headers['x-api-key'];
  
  // 验证API密钥
  if (!key || key !== authConfig.apiKey) {
    Logger.warn('API密钥验证失败', {
      ip: req.ip,
      path: req.path,
      key: key ? '无效密钥' : '未提供密钥'
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'API密钥无效或未提供'
      }
    });
  }
  
  // 验证通过
  next();
}

module.exports = apiKey; 