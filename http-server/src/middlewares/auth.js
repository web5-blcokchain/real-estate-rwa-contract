import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

/**
 * API Key中间件 - 验证请求中的API Key
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
export const apiKeyMiddleware = (req, res, next) => {
  // 在测试环境中跳过API Key验证
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  try {
    // 从请求头或查询参数中获取API Key
    const apiKey = req.header('x-api-key') || req.query.api_key;
    
    // 检查API Key是否存在
    if (!apiKey) {
      logger.warn('请求缺少API Key');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '未提供API密钥'
      });
    }
    
    // 检查API Key是否有效
    const validApiKey = process.env.API_KEY;
    if (apiKey !== validApiKey) {
      logger.warn('API Key验证失败');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'API密钥无效'
      });
    }
    
    // API Key验证通过
    next();
  } catch (error) {
    logger.error('API Key验证发生错误:', error);
    // 确保认证错误总是返回401而不是500
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API认证失败'
    });
  }
}; 