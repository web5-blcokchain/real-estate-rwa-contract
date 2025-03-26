/**
 * 缓存管理工具
 * 提供内存缓存功能，减轻API服务器负载和提高响应速度
 */

const NodeCache = require('node-cache');
const logger = require('./logger');

// 创建默认缓存实例
const cache = new NodeCache({
  stdTTL: 300, // 默认缓存时间为300秒（5分钟）
  checkperiod: 60, // 定期检查过期项的时间（秒）
  useClones: false // 不使用深拷贝，提高性能
});

// 初始化缓存统计信息
const cacheStats = {
  hits: 0,
  misses: 0,
  keys: 0,
  lastReset: Date.now()
};

/**
 * 从缓存中获取数据
 * @param {string} key 缓存键
 * @returns {any} 缓存的数据，如果不存在则返回undefined
 */
function get(key) {
  const value = cache.get(key);
  
  if (value === undefined) {
    cacheStats.misses++;
    return undefined;
  }
  
  cacheStats.hits++;
  return value;
}

/**
 * 将数据存入缓存
 * @param {string} key 缓存键
 * @param {any} value 要缓存的数据
 * @param {number} [ttl] 缓存过期时间（秒），不指定则使用默认时间
 * @returns {boolean} 是否成功设置缓存
 */
function set(key, value, ttl) {
  const success = cache.set(key, value, ttl);
  
  if (success) {
    cacheStats.keys = cache.keys().length;
  }
  
  return success;
}

/**
 * 从缓存中删除数据
 * @param {string} key 缓存键
 * @returns {boolean} 是否成功删除缓存
 */
function del(key) {
  const deleted = cache.del(key);
  
  if (deleted > 0) {
    cacheStats.keys = cache.keys().length;
    return true;
  }
  
  return false;
}

/**
 * 检查缓存键是否存在
 * @param {string} key 缓存键
 * @returns {boolean} 缓存键是否存在
 */
function has(key) {
  return cache.has(key);
}

/**
 * 生成用于API缓存的键
 * @param {string} prefix 键前缀
 * @param {object} params 请求参数
 * @returns {string} 缓存键
 */
function generateCacheKey(prefix, params = {}) {
  const paramStr = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}|${paramStr}`;
}

/**
 * 清除所有缓存或特定键的缓存
 * @param {string} [key] 要清除的缓存键，不指定则清除所有缓存
 * @returns {boolean} 是否成功清除缓存
 */
function clearCache(key) {
  if (key) {
    return del(key);
  }
  
  cache.flushAll();
  cacheStats.keys = 0;
  logger.info('所有缓存已清除');
  return true;
}

/**
 * 获取缓存统计信息
 * @returns {object} 缓存统计信息
 */
function getCacheStats() {
  const cacheInfo = cache.getStats();
  
  return {
    ...cacheStats,
    ...cacheInfo,
    memoryUsage: process.memoryUsage(),
    uptime: (Date.now() - cacheStats.lastReset) / 1000, // 转换为秒
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? cacheStats.hits / (cacheStats.hits + cacheStats.misses) 
      : 0
  };
}

/**
 * 获取所有缓存键
 * @returns {string[]} 缓存键列表
 */
function getCacheKeys() {
  return cache.keys();
}

/**
 * 使用缓存包装API处理程序
 * @param {Function} handler API处理程序函数
 * @param {string} keyPrefix 缓存键前缀
 * @param {number} [ttl] 缓存过期时间（秒）
 * @returns {Function} 包装后的处理程序
 */
function withCache(handler, keyPrefix, ttl) {
  return async (req, res, next) => {
    try {
      // 为GET请求使用缓存
      if (req.method === 'GET') {
        // 生成缓存键
        const cacheKey = generateCacheKey(keyPrefix, {
          ...req.query,
          ...req.params,
          path: req.path
        });
        
        // 检查缓存中是否有数据
        const cachedData = get(cacheKey);
        
        if (cachedData) {
          // 使用缓存的数据响应请求
          return res.json(cachedData);
        }
        
        // 修改res.json方法，在返回数据前缓存结果
        const originalJson = res.json;
        res.json = function(data) {
          // 缓存成功的响应
          if (data && data.success === true) {
            set(cacheKey, data, ttl);
          }
          
          // 恢复原始json方法并调用
          res.json = originalJson;
          return res.json(data);
        };
      }
      
      // 调用原始处理程序
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  get,
  set,
  del,
  has,
  clearCache,
  getCacheStats,
  getCacheKeys,
  generateCacheKey,
  withCache
}; 