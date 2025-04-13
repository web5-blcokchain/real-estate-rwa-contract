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
 * 获取指定房产ID的详细信息
 * 为了兼容现有API保留此方法，但简化实现
 * @param {string} propertyId - 房产ID
 * @returns {Object|null} 房产详情对象，如果未找到则返回null
 */
function getProperty(propertyId) {
  try {
    if (fs.existsSync(PROPERTY_CACHE_FILE)) {
      const fileContent = fs.readFileSync(PROPERTY_CACHE_FILE, 'utf8');
      const cacheData = JSON.parse(fileContent);
      
      // 简化版本：如果请求的ID与缓存中的ID匹配，返回整个缓存对象
      if (cacheData.propertyId && cacheData.propertyId === propertyId) {
        return cacheData;
      }
    }
    return null;
  } catch (error) {
    console.error(`获取房产 ${propertyId} 信息时出错: ${error.message}`);
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
  getProperty,           // 恢复导出此方法以兼容现有调用
  getCacheTimestamp,
  hasCachedProperty,
  getCacheInfo,
  PROPERTY_CACHE_FILE
}; 