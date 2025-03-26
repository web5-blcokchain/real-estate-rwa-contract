const { ApiError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * 权限检查中间件
 * @param {Array<string>} requiredPermissions 所需权限列表
 * @returns {Function} Express中间件
 */
const checkPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // 获取用户角色
      const userRoles = req.user?.roles || [];
      
      // 检查用户是否具有所需权限
      const hasPermission = requiredPermissions.every(permission => {
        // 检查用户是否具有管理员角色
        if (userRoles.includes('admin')) {
          return true;
        }
        
        // 检查用户是否具有所需权限
        return userRoles.includes(permission);
      });

      if (!hasPermission) {
        logger.warn('Permission denied:', {
          user: req.user?.id,
          requiredPermissions,
          userRoles
        });
        throw new ApiError('Insufficient permissions', 'PERMISSION_DENIED');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkPermissions }; 