/**
 * 认证与授权中间件
 */

const { createAPIError } = require('./errorHandler');

/**
 * 检查用户认证状态
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一个中间件
 */
const checkAuthentication = (req, res, next) => {
  try {
    // 检查API密钥（简单实现，生产环境应使用JWT或其他认证方式）
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return next(createAPIError.unauthorized('访问未授权，请提供有效的API密钥'));
    }
    
    // 设置用户角色，在真实实现中应从数据库或JWT中获取
    // 这里为简单示例，给予所有提供正确API密钥的请求ADMIN角色
    req.user = {
      role: 'ADMIN'
    };
    
    next();
  } catch (error) {
    next(createAPIError.unauthorized('认证过程中发生错误'));
  }
};

/**
 * 检查用户授权
 * @param {string[]} allowedRoles 允许的角色列表
 * @returns {function} 中间件函数
 */
const checkAuthorization = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return next(createAPIError.unauthorized('用户未经过认证'));
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        return next(createAPIError.forbidden('权限不足，无法执行此操作'));
      }
      
      next();
    } catch (error) {
      next(createAPIError.forbidden('授权过程中发生错误'));
    }
  };
};

module.exports = {
  checkAuthentication,
  checkAuthorization
}; 