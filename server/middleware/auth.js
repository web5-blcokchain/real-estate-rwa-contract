const { EnvUtils, Logger } = require('../../common');

/**
 * 认证中间件
 */
class AuthMiddleware {
  /**
   * 验证API密钥
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  static validateApiKey(req, res, next) {
    // 从请求头或URL查询参数中获取API密钥
    const headerApiKey = req.headers['x-api-key'];
    const queryApiKey = req.query.apiKey;
    const apiKey = headerApiKey || queryApiKey;
    const expectedApiKey = EnvUtils.getApiKey();

    if (!apiKey || apiKey !== expectedApiKey) {
      Logger.warn('无效的API密钥', { 
        ip: req.ip, 
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json({
        success: false,
        error: '无效的API密钥',
        message: '请在请求头 x-api-key 或 URL 参数 apiKey 中提供有效的API密钥'
      });
    }

    next();
  }
}

module.exports = AuthMiddleware; 