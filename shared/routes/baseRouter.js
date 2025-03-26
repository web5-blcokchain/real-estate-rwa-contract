const express = require('express');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validateRequest');
const { checkPermissions } = require('../middlewares/checkPermissions');
const { ApiError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * 基础路由类
 * 提供通用的路由功能
 */
class BaseRouter {
  constructor() {
    this.router = express.Router();
    this.setupCommonMiddleware();
  }

  /**
   * 设置通用中间件
   */
  setupCommonMiddleware() {
    // 请求日志记录
    this.router.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.body,
        params: req.params
      });
      next();
    });

    // 错误处理 - 使用更健壮的错误处理方式
    this.router.use((err, req, res, next) => {
      try {
        // 记录错误
        logger.error('Route error:', err);
        
        // 处理 ApiError 类型的错误
        if (err && err instanceof ApiError) {
          return res.status(err.statusCode || 500).json({
            success: false,
            error: {
              code: err.code || 'API_ERROR',
              message: err.message || 'An unexpected error occurred'
            }
          });
        }
        
        // 处理其他类型的错误
        const errorMessage = err && typeof err === 'object' && err.message 
          ? err.message 
          : 'An unexpected error occurred';
          
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage
          }
        });
      } catch (handlerError) {
        // 处理错误处理器本身的错误
        logger.error('Error in error handler:', handlerError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'ERROR_HANDLER_FAILED',
            message: 'An error occurred while processing the error'
          }
        });
      }
    });
  }

  /**
   * 添加GET路由
   * @param {string} path 路由路径
   * @param {Function} handler 处理函数
   * @param {Object} options 选项
   * @param {boolean} options.auth 是否需要认证
   * @param {Array} options.permissions 所需权限
   * @param {Object} options.validation 验证规则
   */
  get(path, handler, options = {}) {
    const middlewares = this._getMiddlewares(options);
    this.router.get(path, ...middlewares, asyncHandler(handler));
  }

  /**
   * 添加POST路由
   * @param {string} path 路由路径
   * @param {Function} handler 处理函数
   * @param {Object} options 选项
   * @param {boolean} options.auth 是否需要认证
   * @param {Array} options.permissions 所需权限
   * @param {Object} options.validation 验证规则
   */
  post(path, handler, options = {}) {
    const middlewares = this._getMiddlewares(options);
    this.router.post(path, ...middlewares, asyncHandler(handler));
  }

  /**
   * 添加PUT路由
   * @param {string} path 路由路径
   * @param {Function} handler 处理函数
   * @param {Object} options 选项
   * @param {boolean} options.auth 是否需要认证
   * @param {Array} options.permissions 所需权限
   * @param {Object} options.validation 验证规则
   */
  put(path, handler, options = {}) {
    const middlewares = this._getMiddlewares(options);
    this.router.put(path, ...middlewares, asyncHandler(handler));
  }

  /**
   * 添加DELETE路由
   * @param {string} path 路由路径
   * @param {Function} handler 处理函数
   * @param {Object} options 选项
   * @param {boolean} options.auth 是否需要认证
   * @param {Array} options.permissions 所需权限
   * @param {Object} options.validation 验证规则
   */
  delete(path, handler, options = {}) {
    const middlewares = this._getMiddlewares(options);
    this.router.delete(path, ...middlewares, asyncHandler(handler));
  }

  /**
   * 获取中间件列表
   * @param {Object} options 选项
   * @returns {Array} 中间件列表
   */
  _getMiddlewares(options) {
    const middlewares = [];

    // 添加认证中间件
    if (options.auth) {
      middlewares.push(authMiddleware());
    }

    // 添加权限检查中间件
    if (options.permissions && options.permissions.length > 0) {
      middlewares.push(checkPermissions(options.permissions));
    }

    // 添加请求验证中间件
    if (options.validation) {
      middlewares.push(validateRequest(options.validation));
    }

    return middlewares;
  }

  /**
   * 获取路由实例
   * @returns {express.Router} Express路由实例
   */
  getRouter() {
    return this.router;
  }
}

module.exports = BaseRouter; 