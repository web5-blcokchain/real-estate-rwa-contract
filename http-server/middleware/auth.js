/**
 * API身份验证中间件
 * 通过URL参数进行简单的API密钥验证
 */
const { EnvUtils, Logger } = require('../../common');

class AuthMiddleware {
  /**
   * 验证API密钥
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  static validateApiKey(req, res, next) {
    // 从URL查询参数中获取API密钥
    const apiKey = req.query.apiKey;
    const expectedApiKey = EnvUtils.getApiKey() || '123456';

    if (!apiKey || apiKey !== expectedApiKey) {
      Logger.warn('无效的API密钥', { 
        ip: req.ip, 
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json({
        success: false,
        error: '无效的API密钥',
        message: '请在URL参数apiKey中提供有效的API密钥',
        timestamp: new Date().toISOString()
      });
    }

    next();
  }

  /**
   * 验证角色权限
   * @param {string[]} allowedRoles - 允许的角色数组
   * @returns {Function} 中间件函数
   */
  static validateRole(allowedRoles = []) {
    return (req, res, next) => {
      // 这里简化处理，实际应用中可能需要从令牌或用户会话获取角色信息
      const userRole = req.query.role || 'user';
      
      if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
        return next();
      }
      
      Logger.warn('权限不足', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userRole,
        allowedRoles
      });
      
      return res.status(403).json({
        success: false,
        error: '权限不足',
        message: `您的角色 '${userRole}' 没有执行此操作的权限`,
        timestamp: new Date().toISOString()
      });
    };
  }
}

module.exports = AuthMiddleware; 