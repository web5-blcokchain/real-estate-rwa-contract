/**
 * 中间件索引
 * 导出所有中间件
 */

// 引入中间件
const AuthMiddleware = require('./auth');

// 身份验证中间件别名，方便使用
const authMiddleware = AuthMiddleware.validateApiKey;
const roleMiddleware = AuthMiddleware.validateRole;

// 导出所有中间件
module.exports = {
  // 中间件类
  AuthMiddleware,
  
  // 中间件函数别名
  authMiddleware,
  roleMiddleware
}; 