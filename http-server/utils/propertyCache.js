/**
 * 房产缓存工具
 * 提供读取房产缓存的方法
 */
const fs = require('fs');
const path = require('path');

// 缓存文件路径
const CACHE_DIR = path.resolve(__dirname, '../../cache');
const PROPERTY_CACHE_FILE = path.join(CACHE_DIR, 'property-cache.json');

/**
 * 获取所有缓存的房产信息
 * @returns {Object} 包含所有房产ID作为键的对象
 */
function getAllProperties() {
  try {
    if (fs.existsSync(PROPERTY_CACHE_FILE)) {
      const fileContent = fs.readFileSync(PROPERTY_CACHE_FILE, 'utf8');
      return JSON.parse(fileContent);
    }
    return {};
  } catch (error) {
    console.error(`读取房产缓存时出错: ${error.message}`);
    return {};
  }
}

/**
 * 获取指定房产ID的详细信息
 * @param {string} propertyId - 房产ID
 * @returns {Object|null} 房产详情对象，如果未找到则返回null
 */
function getProperty(propertyId) {
  try {
    const properties = getAllProperties();
    return properties[propertyId] || null;
  } catch (error) {
    console.error(`获取房产 ${propertyId} 信息时出错: ${error.message}`);
    return null;
  }
}

/**
 * 获取所有房产ID的列表
 * @returns {Array} 房产ID数组
 */
function getPropertyIds() {
  try {
    const properties = getAllProperties();
    return Object.keys(properties);
  } catch (error) {
    console.error(`获取房产ID列表时出错: ${error.message}`);
    return [];
  }
}

/**
 * 判断房产缓存是否存在
 * @returns {boolean} 如果缓存文件存在且有效则返回true
 */
function hasCachedProperties() {
  try {
    return fs.existsSync(PROPERTY_CACHE_FILE);
  } catch (error) {
    console.error(`检查房产缓存是否存在时出错: ${error.message}`);
    return false;
  }
}

/**
 * 获取缓存的最后更新时间
 * @returns {Date|null} 缓存文件的最后修改时间，如果文件不存在则返回null
 */
function getCacheLastUpdated() {
  try {
    if (fs.existsSync(PROPERTY_CACHE_FILE)) {
      const stats = fs.statSync(PROPERTY_CACHE_FILE);
      return stats.mtime;
    }
    return null;
  } catch (error) {
    console.error(`获取缓存更新时间时出错: ${error.message}`);
    return null;
  }
}

module.exports = {
  getAllProperties,
  getProperty,
  getPropertyIds,
  hasCachedProperties,
  getCacheLastUpdated,
  PROPERTY_CACHE_FILE
}; 