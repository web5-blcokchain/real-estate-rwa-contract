/**
 * 分配缓存工具
 * 提供读取分配缓存的方法
 */
const fs = require('fs');
const path = require('path');

// 缓存文件路径
const CACHE_DIR = path.resolve(__dirname, '../../cache');
const DISTRIBUTION_CACHE_FILE = path.join(CACHE_DIR, 'distribution-cache.json');

/**
 * 获取所有缓存的分配信息
 * @returns {Object} 包含所有分配ID作为键的对象
 */
function getAllDistributions() {
  try {
    if (fs.existsSync(DISTRIBUTION_CACHE_FILE)) {
      const fileContent = fs.readFileSync(DISTRIBUTION_CACHE_FILE, 'utf8');
      return JSON.parse(fileContent);
    }
    return {};
  } catch (error) {
    console.error(`读取分配缓存时出错: ${error.message}`);
    return {};
  }
}

/**
 * 获取指定分配ID的详细信息
 * @param {string} distributionId - 分配ID
 * @returns {Object|null} 分配详情对象，如果未找到则返回null
 */
function getDistribution(distributionId) {
  try {
    const distributions = getAllDistributions();
    return distributions[distributionId] || null;
  } catch (error) {
    console.error(`获取分配 ${distributionId} 信息时出错: ${error.message}`);
    return null;
  }
}

/**
 * 获取所有分配ID的列表
 * @returns {Array} 分配ID数组
 */
function getDistributionIds() {
  try {
    const distributions = getAllDistributions();
    return Object.keys(distributions);
  } catch (error) {
    console.error(`获取分配ID列表时出错: ${error.message}`);
    return [];
  }
}

/**
 * 获取特定类型的分配ID列表
 * @param {number} distributionType - 分配类型(0=分红, 1=租金, 2=奖金)
 * @returns {Array} 符合条件的分配ID数组
 */
function getDistributionsByType(distributionType) {
  try {
    const distributions = getAllDistributions();
    const result = [];
    
    for (const [id, distInfo] of Object.entries(distributions)) {
      if (distInfo.distributionType === distributionType) {
        result.push(id);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`获取类型为 ${distributionType} 的分配时出错: ${error.message}`);
    return [];
  }
}

/**
 * 获取特定房产的所有分配
 * @param {string} propertyId - 房产ID
 * @returns {Array} 包含此房产相关分配的数组
 */
function getDistributionsByProperty(propertyId) {
  try {
    const distributions = getAllDistributions();
    const result = [];
    
    for (const [id, distInfo] of Object.entries(distributions)) {
      if (distInfo.propertyId === propertyId) {
        result.push({
          distributionId: id,
          ...distInfo
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error(`获取房产 ${propertyId} 的分配时出错: ${error.message}`);
    return [];
  }
}

/**
 * 获取活跃状态的分配
 * @returns {Array} 活跃状态(status=1)的分配数组
 */
function getActiveDistributions() {
  try {
    const distributions = getAllDistributions();
    const result = [];
    
    for (const [id, distInfo] of Object.entries(distributions)) {
      if (distInfo.status === 1 || distInfo.status === '1') {
        result.push({
          distributionId: id,
          ...distInfo
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error(`获取活跃分配时出错: ${error.message}`);
    return [];
  }
}

/**
 * 判断分配缓存是否存在
 * @returns {boolean} 如果缓存文件存在且有效则返回true
 */
function hasCachedDistributions() {
  try {
    return fs.existsSync(DISTRIBUTION_CACHE_FILE);
  } catch (error) {
    console.error(`检查分配缓存是否存在时出错: ${error.message}`);
    return false;
  }
}

/**
 * 获取缓存的最后更新时间
 * @returns {Date|null} 缓存文件的最后修改时间，如果文件不存在则返回null
 */
function getCacheLastUpdated() {
  try {
    if (fs.existsSync(DISTRIBUTION_CACHE_FILE)) {
      const stats = fs.statSync(DISTRIBUTION_CACHE_FILE);
      return stats.mtime;
    }
    return null;
  } catch (error) {
    console.error(`获取缓存更新时间时出错: ${error.message}`);
    return null;
  }
}

/**
 * 将新的分配信息添加到缓存
 * @param {string} distributionId - 分配ID
 * @param {Object} distributionData - 分配数据
 * @returns {boolean} 是否成功添加
 */
function addDistributionToCache(distributionId, distributionData) {
  try {
    // 确保缓存目录存在
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    // 读取现有缓存
    let cacheData = {};
    if (fs.existsSync(DISTRIBUTION_CACHE_FILE)) {
      const fileContent = fs.readFileSync(DISTRIBUTION_CACHE_FILE, 'utf8');
      try {
        cacheData = JSON.parse(fileContent);
      } catch (e) {
        console.warn(`解析分配缓存文件失败，创建新缓存: ${e.message}`);
      }
    }
    
    // 添加新数据
    cacheData[distributionId] = {
      ...distributionData,
      cachedAt: new Date().toISOString()
    };
    
    // 写入缓存文件
    fs.writeFileSync(
      DISTRIBUTION_CACHE_FILE,
      JSON.stringify(cacheData, null, 2),
      'utf8'
    );
    
    return true;
  } catch (error) {
    console.error(`添加分配到缓存时出错: ${error.message}`);
    return false;
  }
}

module.exports = {
  getAllDistributions,
  getDistribution,
  getDistributionIds,
  getDistributionsByType,
  getDistributionsByProperty,
  getActiveDistributions,
  hasCachedDistributions,
  getCacheLastUpdated,
  addDistributionToCache,
  DISTRIBUTION_CACHE_FILE
}; 