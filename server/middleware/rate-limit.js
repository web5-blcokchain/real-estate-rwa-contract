const { Logger } = require('../../common');

/**
 * 简单的内存型速率限制实现
 * 注意：生产环境应使用Redis等分布式存储
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 默认1分钟窗口
    this.maxRequests = options.maxRequests || 100; // 默认每窗口最多100次请求
    this.message = options.message || '请求过于频繁，请稍后再试';
    this.statusCode = options.statusCode || 429; // Too Many Requests
    this.requestCounts = new Map(); // IP -> {count, resetTime}
  }

  /**
   * 清理过期计数器
   * @private
   */
  _cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(ip);
      }
    }
  }

  /**
   * 中间件实现
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  middleware(req, res, next) {
    // 定期清理过期计数器
    this._cleanup();

    // 获取客户端IP
    const ip = req.ip || req.connection.remoteAddress || '未知IP';
    
    // 当前时间
    const now = Date.now();
    
    // 获取或创建计数器
    if (!this.requestCounts.has(ip)) {
      this.requestCounts.set(ip, {
        count: 0,
        resetTime: now + this.windowMs
      });
    }
    
    // 更新计数器
    const data = this.requestCounts.get(ip);
    
    // 如果重置时间已过，重置计数器
    if (now > data.resetTime) {
      data.count = 0;
      data.resetTime = now + this.windowMs;
    }
    
    // 增加计数
    data.count++;
    
    // 检查是否超过限制
    if (data.count > this.maxRequests) {
      Logger.warn('API速率限制触发', {
        ip,
        path: req.path,
        method: req.method,
        count: data.count,
        limit: this.maxRequests
      });
      
      return res.status(this.statusCode).json({
        success: false,
        error: this.message,
        retryAfter: Math.ceil((data.resetTime - now) / 1000) // 秒数
      });
    }
    
    // 继续处理请求
    next();
  }
}

/**
 * 速率限制中间件
 */
class RateLimitMiddleware {
  // 定义不同的限制器
  static API_LIMITER = new RateLimiter({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 100     // 每分钟100次请求
  });
  
  static STRICT_LIMITER = new RateLimiter({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 20      // 每分钟20次请求
  });
  
  /**
   * 标准API请求限制
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  static apiLimit(req, res, next) {
    RateLimitMiddleware.API_LIMITER.middleware(req, res, next);
  }
  
  /**
   * 严格API请求限制（用于敏感操作）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  static strictLimit(req, res, next) {
    RateLimitMiddleware.STRICT_LIMITER.middleware(req, res, next);
  }
}

module.exports = RateLimitMiddleware; 