/**
 * 简单的房产缓存工具
 * 提供读取房产缓存的方法
 */
const fs = require('fs');
const path = require('path');

// 缓存文件路径
const CACHE_DIR = path.resolve(__dirname, '../../cache');
const PROPERTY_CACHE_FILE = path.join(CACHE_DIR, 'property-cache.json');

/**
 * 获取缓存的房产ID
 * @returns {string|null} 房产ID，如果缓存不存在则返回null
 */
function getPropertyId() {
  try {
    if (fs.existsSync(PROPERTY_CACHE_FILE)) {
      const fileContent = fs.readFileSync(PROPERTY_CACHE_FILE, 'utf8');
      const cacheData = JSON.parse(fileContent);
      return cacheData.propertyId || null;
    }
    return null;
  } catch (error) {
    console.error(`读取房产缓存时出错: ${error.message}`);
    return null;
  }
}

/**
 * 获取缓存的最后更新时间
 * @returns {string|null} 缓存的时间戳字符串，如果缓存不存在则返回null
 */
function getCacheTimestamp() {
  try {
    if (fs.existsSync(PROPERTY_CACHE_FILE)) {
      const fileContent = fs.readFileSync(PROPERTY_CACHE_FILE, 'utf8');
      const cacheData = JSON.parse(fileContent);
      return cacheData.cachedAt || null;
    }
    return null;
  } catch (error) {
    console.error(`读取房产缓存时间戳时出错: ${error.message}`);
    return null;
  }
}

/**
 * 判断房产缓存是否存在
 * @returns {boolean} 如果缓存文件存在且有效则返回true
 */
function hasCachedProperty() {
  try {
    if (fs.existsSync(PROPERTY_CACHE_FILE)) {
      const fileContent = fs.readFileSync(PROPERTY_CACHE_FILE, 'utf8');
      const cacheData = JSON.parse(fileContent);
      return !!cacheData.propertyId;
    }
    return false;
  } catch (error) {
    console.error(`检查房产缓存是否存在时出错: ${error.message}`);
    return false;
  }
}

/**
 * 获取缓存文件信息
 * @returns {Object} 包含缓存文件信息的对象
 */
function getCacheInfo() {
  try {
    if (fs.existsSync(PROPERTY_CACHE_FILE)) {
      const stats = fs.statSync(PROPERTY_CACHE_FILE);
      return {
        exists: true,
        path: PROPERTY_CACHE_FILE,
        size: stats.size,
        lastModified: stats.mtime
      };
    }
    return {
      exists: false,
      path: PROPERTY_CACHE_FILE
    };
  } catch (error) {
    console.error(`获取缓存文件信息时出错: ${error.message}`);
    return {
      exists: false,
      path: PROPERTY_CACHE_FILE,
      error: error.message
    };
  }
}

module.exports = {
  getPropertyId,
  getCacheTimestamp,
  hasCachedProperty,
  getCacheInfo,
  PROPERTY_CACHE_FILE
}; 