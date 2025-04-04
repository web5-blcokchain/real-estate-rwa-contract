/**
 * API密钥验证中间件
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 *       description: 所有API都需要提供有效的API密钥才能访问
 * security:
 *   - ApiKeyAuth: []
 */
const { Logger } = require('../../../shared/src');

/**
 * API密钥验证
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function apiKey(req, res, next) {
  // 记录API调用
  Logger.debug('API请求', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // 从环境变量获取API密钥
  const configuredApiKey = process.env.API_KEY || 'default-api-key-123456';
  
  // 从URL参数或请求头获取API密钥
  const key = req.query.api_key || req.headers['x-api-key'];
  
  // 检查API密钥是否提供
  if (!key) {
    Logger.warn('API请求未提供密钥', {
      ip: req.ip,
      path: req.path
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '未提供API密钥'
      }
    });
  }
  
  // 验证API密钥是否匹配
  if (key !== configuredApiKey) {
    Logger.warn('API密钥验证失败', {
      ip: req.ip,
      path: req.path,
      key: '无效密钥'
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'API密钥无效'
      }
    });
  }
  
  // 验证通过
  next();
}

module.exports = apiKey; 