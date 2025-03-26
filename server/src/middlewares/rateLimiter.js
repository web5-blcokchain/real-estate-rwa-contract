/**
 * 速率限制中间件
 * 限制API请求频率以防止滥用
 */

const { caches } = require('@server/utils/cacheManager');
const { createAPIError } = require('./errorHandler');
const logger = require('@server/utils/logger');

// 创建专用的速率限制缓存
const rateCache = caches.create('rateLimit', { ttl: 60 }); // 1分钟TTL

/**
 * 基于IP的速率限制中间件
 * @param {object} options 速率限制选项
 * @returns {function} 中间件函数
 */
function ipRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 时间窗口，默认1分钟
    max = 100, // 最大请求数，默认每窗口100次
    message = '请求过于频繁，请稍后再试',
    statusCode = 429, // Too Many Requests
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown', // 默认使用IP作为键
    skip = () => false // 默认不跳过任何请求
  } = options;
  
  // 转换时间窗口为秒
  const windowSec = Math.ceil(windowMs / 1000);
  
  return (req, res, next) => {
    // 如果请求应跳过限制
    if (skip(req)) {
      return next();
    }
    
    // 生成唯一键
    const key = keyGenerator(req);
    
    // 获取当前计数
    let requestCount = rateCache.get(key) || 0;
    
    // 增加计数
    requestCount++;
    
    // 更新缓存，设置TTL为时间窗口
    rateCache.set(key, requestCount, windowSec);
    
    // 设置RateLimit信息到响应头
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requestCount));
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + windowSec);
    
    // 如果超出限制，返回错误
    if (requestCount > max) {
      logger.warn(`Rate limit exceeded for ${key}`);
      return next(createAPIError.serviceUnavailable(message));
    }
    
    next();
  };
}

/**
 * 基于API路由的速率限制中间件
 * 对不同路由使用不同的限制
 * @param {object} options 速率限制选项
 * @returns {function} 中间件函数
 */
function routeRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 60 * 1000, // 默认1分钟
    keyGenerator: (req) => `${req.ip}:${req.path}`,
    skip: () => false
  };
  
  // 不同路由的限制配置
  const routeLimits = {
    // 代币相关操作限制较严格
    '/tokens': { max: 30, windowMs: 60 * 1000 },
    
    // 区块链交互操作限制较严格
    '/redemptions': { max: 20, windowMs: 60 * 1000 },
    
    // 读取操作限制较宽松
    '/properties': { max: 50, windowMs: 60 * 1000 },
    
    // 管理操作限制更严格
    '/admin': { max: 10, windowMs: 60 * 1000 },
    
    // 默认限制
    'default': { max: 60, windowMs: 60 * 1000 }
  };
  
  return (req, res, next) => {
    // 确定路由应使用哪个限制
    const routePattern = Object.keys(routeLimits).find(pattern => 
      req.path.startsWith(pattern)
    ) || 'default';
    
    const routeOptions = routeLimits[routePattern];
    
    // 合并选项
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      ...routeOptions
    };
    
    // 使用IP限制器处理请求
    ipRateLimiter(mergedOptions)(req, res, next);
  };
}

/**
 * 获取速率限制统计信息
 * @returns {object} 统计信息
 */
function getRateLimitStats() {
  return {
    activeIPs: rateCache.getKeys().length,
    ipList: rateCache.getKeys(),
    cacheStats: rateCache.getStats()
  };
}

module.exports = {
  ipRateLimiter,
  routeRateLimiter,
  getRateLimitStats
}; 