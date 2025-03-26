const { getCachePath, validatePath } = require('./paths');
const logger = require('./logger');

/**
 * 缓存管理器类
 */
class CacheManager {
  constructor() {
    this.cachePath = getCachePath();
    this.cache = new Map();
    this.initialized = false;
    logger.info('Cache manager initialized');
  }

  /**
   * 初始化缓存
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadFromFile();
      this.initialized = true;
      logger.info('Cache initialized from file');
    } catch (error) {
      logger.error('Failed to initialize cache:', error);
    }
  }

  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {*} value 缓存值
   * @param {number} [ttl] 过期时间(毫秒)
   */
  async set(key, value, ttl) {
    try {
      const entry = {
        value,
        timestamp: Date.now(),
        ttl
      };

      this.cache.set(key, entry);
      await this.saveToFile();
      logger.info(`Cache set for key: ${key}`);
    } catch (error) {
      logger.error(`Failed to set cache for key ${key}:`, error);
    }
  }

  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {*} 缓存值
   */
  async get(key) {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return null;
      }

      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        await this.saveToFile();
        return null;
      }

      return entry.value;
    } catch (error) {
      logger.error(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  async delete(key) {
    try {
      this.cache.delete(key);
      await this.saveToFile();
      logger.info(`Cache deleted for key: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete cache for key ${key}:`, error);
    }
  }

  /**
   * 清除所有缓存
   */
  async clear() {
    try {
      this.cache.clear();
      await this.saveToFile();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * 保存缓存到文件
   */
  async saveToFile() {
    try {
      if (!validatePath(this.cachePath)) {
        throw new Error('Invalid cache path');
      }

      const data = JSON.stringify(Array.from(this.cache.entries()));
      await require('fs').promises.writeFile(this.cachePath, data);
    } catch (error) {
      logger.error('Failed to save cache to file:', error);
    }
  }

  /**
   * 从文件加载缓存
   */
  async loadFromFile() {
    try {
      if (!validatePath(this.cachePath)) {
        return;
      }

      const data = await require('fs').promises.readFile(this.cachePath, 'utf8');
      const entries = JSON.parse(data);
      this.cache = new Map(entries);
    } catch (error) {
      logger.error('Failed to load cache from file:', error);
    }
  }

  /**
   * 获取所有缓存键
   * @returns {string[]} 缓存键列表
   */
  getKeys() {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   * @returns {number} 缓存条目数量
   */
  size() {
    return this.cache.size;
  }
}

const cacheManager = new CacheManager();

module.exports = cacheManager; 