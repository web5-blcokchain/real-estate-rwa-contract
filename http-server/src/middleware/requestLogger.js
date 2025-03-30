/**
 * 请求日志中间件
 * 记录API请求的详细信息，包括请求方法、URL、响应状态和响应时间
 */
const logger = require('../utils/logger');

/**
 * 请求日志中间件函数
 * 记录所有HTTP请求的详细信息
 */
const requestLogger = (req, res, next) => {
  // 记录请求开始时间
  const startTime = Date.now();
  
  // 记录请求基本信息
  logger.debug(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent') || '-',
    category: 'request'
  });
  
  // 在开发环境下记录请求体
  if (process.env.NODE_ENV !== 'production' && req.method !== 'GET') {
    logger.debug('请求体:', { body: req.body });
  }
  
  // 在响应完成时记录详细信息
  res.on('finish', () => {
    // 计算响应时间
    const responseTime = Date.now() - startTime;
    
    // 记录API请求
    logger.apiRequest(req, res, responseTime);
    
    // 根据状态码决定日志级别
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    // 记录响应详细信息
    logger[logLevel](`${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      category: 'response'
    });
  });
  
  // 在响应关闭时记录信息
  res.on('close', () => {
    if (!res.finished) {
      logger.warn(`${req.method} ${req.originalUrl} - 客户端提前关闭连接`, {
        method: req.method,
        url: req.originalUrl,
        category: 'response',
        warning: 'CLIENT_CLOSED_CONNECTION'
      });
    }
  });
  
  // 继续处理请求
  next();
};

module.exports = requestLogger; 