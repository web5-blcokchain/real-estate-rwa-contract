/**
 * API密钥验证中间件
 * 用于验证API请求中的密钥
 */

const config = require('../config');
const { logger } = require('../utils/logger');
const { ApiError } = require('./errorHandler');

/**
 * 验证API密钥中间件
 * 支持两种验证方式:
 * 1. 通过查询参数 api_key=xxx
 * 2. 通过请求头 X-API-Key: xxx
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function apiKeyAuth(req, res, next) {
  try {
    // 获取API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    // 如果没有提供API密钥
    if (!apiKey) {
      logger.warn(`API请求未提供密钥: ${req.ip} - ${req.method} ${req.originalUrl}`);
      return next(new ApiError('未提供API密钥', 401, 'MISSING_API_KEY'));
    }
    
    // 检查API密钥是否有效
    if (apiKey !== config.api.key) {
      logger.warn(`API密钥无效: ${req.ip} - ${req.method} ${req.originalUrl}`);
      return next(new ApiError('API密钥无效', 403, 'INVALID_API_KEY'));
    }
    
    // API密钥有效，继续处理请求
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 选择性API密钥验证中间件
 * 允许没有API密钥的请求通过，但如果提供了API密钥则进行验证
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function optionalApiKeyAuth(req, res, next) {
  try {
    // 获取API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    // 如果没有提供API密钥，直接通过
    if (!apiKey) {
      return next();
    }
    
    // 如果提供了API密钥，检查其有效性
    if (apiKey !== config.api.key) {
      logger.warn(`API密钥无效: ${req.ip} - ${req.method} ${req.originalUrl}`);
      return next(new ApiError('API密钥无效', 403, 'INVALID_API_KEY'));
    }
    
    // API密钥有效，继续处理请求
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  apiKeyAuth,
  optionalApiKeyAuth
}; 