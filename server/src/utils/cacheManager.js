/**
 * 缓存管理系统
 * 提供多层次缓存功能，支持内存缓存
 */

const NodeCache = require('node-cache');
const logger = require('./logger');

// 默认TTL 10分钟 (秒)
const DEFAULT_TTL = 10 * 60;

// 内存缓存实例
const memoryCache = new NodeCache({
  stdTTL: DEFAULT_TTL,
  checkperiod: 60,
  useClones: false // 禁用对象克隆以提高性能，但需要开发者注意不要修改从缓存中获取的对象
});

/**
 * 缓存构造函数
 * @param {string} namespace 缓存命名空间
 * @param {object} options 缓存选项
 */
class CacheManager {
  constructor(namespace, options = {}) {
    this.namespace = namespace;
    this.options = {
      ttl: options.ttl || DEFAULT_TTL,
      debug: options.debug || false
    };
    
    // 统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    if (this.options.debug) {
      logger.debug(`[缓存] 初始化缓存命名空间: ${namespace}`);
    }
  }
  
  /**
   * 生成缓存键
   * @param {string} key 原始键
   * @returns {string} 带命名空间的缓存键
   */
  _getCacheKey(key) {
    return `${this.namespace}:${key}`;
  }
  
  /**
   * 从缓存获取值
   * @param {string} key 缓存键
   * @returns {*} 缓存的值，如果不存在则返回undefined
   */
  get(key) {
    const cacheKey = this._getCacheKey(key);
    const value = memoryCache.get(cacheKey);
    
    if (value !== undefined) {
      this.stats.hits++;
      if (this.options.debug) {
        logger.debug(`[缓存] 命中: ${cacheKey}`);
      }
    } else {
      this.stats.misses++;
      if (this.options.debug) {
        logger.debug(`[缓存] 未命中: ${cacheKey}`);
      }
    }
    
    return value;
  }
  
  /**
   * 设置缓存值
   * @param {string} key 缓存键
   * @param {*} value 要缓存的值
   * @param {number} ttl 过期时间(秒)，如果未指定则使用默认TTL
   * @returns {boolean} 是否成功设置
   */
  set(key, value, ttl = this.options.ttl) {
    const cacheKey = this._getCacheKey(key);
    
    if (value === undefined || value === null) {
      if (this.options.debug) {
        logger.debug(`[缓存] 尝试缓存undefined/null值: ${cacheKey}`);
      }
      return false;
    }
    
    const success = memoryCache.set(cacheKey, value, ttl);
    
    if (success) {
      this.stats.sets++;
      if (this.options.debug) {
        logger.debug(`[缓存] 已设置: ${cacheKey}, TTL: ${ttl}秒`);
      }
    } else {
      logger.warn(`[缓存] 设置失败: ${cacheKey}`);
    }
    
    return success;
  }
  
  /**
   * 删除缓存项
   * @param {string} key 缓存键
   * @returns {boolean} 是否成功删除
   */
  delete(key) {
    const cacheKey = this._getCacheKey(key);
    const success = memoryCache.del(cacheKey);
    
    if (success) {
      this.stats.deletes++;
      if (this.options.debug) {
        logger.debug(`[缓存] 已删除: ${cacheKey}`);
      }
    }
    
    return success;
  }
  
  /**
   * 检查键是否存在
   * @param {string} key 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    const cacheKey = this._getCacheKey(key);
    return memoryCache.has(cacheKey);
  }
  
  /**
   * 获取统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses || 1),
      namespace: this.namespace,
      keysCount: this.getKeys().length
    };
  }
  
  /**
   * 获取当前命名空间下所有的键
   * @returns {string[]} 键列表
   */
  getKeys() {
    const allKeys = memoryCache.keys();
    const namespacePrefix = `${this.namespace}:`;
    
    return allKeys
      .filter(key => key.startsWith(namespacePrefix))
      .map(key => key.slice(namespacePrefix.length));
  }
  
  /**
   * 清空当前命名空间下的所有缓存
   */
  clear() {
    const keys = this.getKeys();
    keys.forEach(key => this.delete(key));
    
    if (this.options.debug) {
      logger.debug(`[缓存] 已清空命名空间: ${this.namespace}, 删除了 ${keys.length} 个键`);
    }
    
    return keys.length;
  }
  
  /**
   * 带有缓存的函数调用包装器
   * @param {Function} fn 要包装的函数
   * @param {string|Function} keyGenerator 缓存键生成函数或前缀
   * @param {object} options 选项
   * @returns {Function} 包装后的函数
   */
  cacheWrapper(fn, keyGenerator, options = {}) {
    const ttl = options.ttl || this.options.ttl;
    const self = this;
    
    return async function(...args) {
      // 生成缓存键
      let cacheKey;
      if (typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(...args);
      } else {
        cacheKey = `${keyGenerator}:${JSON.stringify(args)}`;
      }
      
      // 尝试从缓存获取结果
      const cachedResult = self.get(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }
      
      // 调用原始函数
      const result = await fn.apply(this, args);
      
      // 缓存结果
      if (result !== undefined && result !== null) {
        self.set(cacheKey, result, ttl);
      }
      
      return result;
    };
  }
}

// 预创建的常用缓存实例
const caches = {
  // 区块链数据缓存，3分钟过期
  blockchain: new CacheManager('blockchain', { ttl: 180 }),
  
  // API响应缓存，2分钟过期
  api: new CacheManager('api', { ttl: 120 }),
  
  // 用户数据缓存，5分钟过期
  user: new CacheManager('user', { ttl: 300 }),
  
  // 系统配置缓存，10分钟过期
  config: new CacheManager('config', { ttl: 600 }),
  
  // 创建自定义缓存实例
  create: (namespace, options) => new CacheManager(namespace, options)
};

/**
 * 刷新所有缓存
 */
function flushAll() {
  memoryCache.flushAll();
  logger.info('所有缓存已清空');
}

/**
 * 获取所有缓存统计信息
 */
function getAllStats() {
  const stats = {};
  
  Object.keys(caches).forEach(key => {
    if (typeof caches[key] === 'object' && caches[key] instanceof CacheManager) {
      stats[key] = caches[key].getStats();
    }
  });
  
  return stats;
}

module.exports = {
  caches,
  CacheManager,
  flushAll,
  getAllStats
}; 