/**
 * 速率限制中间件
 * 限制API请求频率以防止滥用
 */

const { createAPIError } = require('./errorHandler');
const logger = require('../utils/logger');

// 使用内存对象作为简单缓存
const rateCache = {
  cache: new Map(),
  expiryTimes: new Map(),
  
  // 设置缓存值
  set: function(key, value, ttl) {
    this.cache.set(key, value);
    const expiryTime = Date.now() + (ttl * 1000);
    this.expiryTimes.set(key, expiryTime);
    return true;
  },
  
  // 获取缓存值
  get: function(key) {
    // 检查是否过期
    const expiryTime = this.expiryTimes.get(key);
    if (expiryTime && expiryTime < Date.now()) {
      this.delete(key);
      return undefined;
    }
    return this.cache.get(key);
  },
  
  // 删除缓存项
  delete: function(key) {
    this.cache.delete(key);
    this.expiryTimes.delete(key);
    return true;
  },
  
  // 获取所有键
  getKeys: function() {
    return [...this.cache.keys()];
  },
  
  // 清除所有缓存
  clear: function() {
    this.cache.clear();
    this.expiryTimes.clear();
    return true;
  }
};

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
      return next(createAPIError.tooManyRequests(message));
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
    ipList: rateCache.getKeys()
  };
}

module.exports = {
  ipRateLimiter,
  routeRateLimiter,
  getRateLimitStats
}; 