/**
 * 读取房产缓存示例脚本
 * 展示如何使用propertyCache模块从缓存中获取房产信息
 */
const propertyCache = require('../utils/propertyCache');

// 简单的日志实现
function logWithColor(level, message) {
  const colors = {
    info: '\x1b[32m', // 绿色
    warn: '\x1b[33m', // 黄色
    error: '\x1b[31m' // 红色
  };
  
  console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m ${message}`);
}

// 格式化输出
function prettyPrint(obj) {
  return JSON.stringify(obj, null, 2);
}

// 读取并展示缓存信息
function readCache() {
  // 检查缓存是否存在
  if (!propertyCache.hasCachedProperties()) {
    logWithColor('error', '房产缓存文件不存在，请先运行test-real-estate-api.js获取房产数据');
    return;
  }
  
  // 获取缓存最后更新时间
  const lastUpdated = propertyCache.getCacheLastUpdated();
  logWithColor('info', `缓存文件: ${propertyCache.PROPERTY_CACHE_FILE}`);
  logWithColor('info', `最后更新时间: ${lastUpdated}`);
  
  // 获取所有房产ID
  const propertyIds = propertyCache.getPropertyIds();
  logWithColor('info', `缓存中的房产数量: ${propertyIds.length}`);
  logWithColor('info', `房产ID列表: ${propertyIds.join(', ')}`);
  
  // 读取每个房产的详细信息
  if (propertyIds.length > 0) {
    logWithColor('info', '\n===== 缓存的房产详情 =====');
    
    propertyIds.forEach(propertyId => {
      const property = propertyCache.getProperty(propertyId);
      logWithColor('info', `\n房产ID: ${propertyId}`);
      logWithColor('info', `状态: ${property.status} (${property.statusDescription})`);
      logWithColor('info', `代币地址: ${property.tokenAddress}`);
      logWithColor('info', `估值: ${property.valuation}`);
      logWithColor('info', `创建时间: ${new Date(property.createdAt).toLocaleString()}`);
      logWithColor('info', `缓存时间: ${new Date(property.cachedAt).toLocaleString()}`);
      
      // 展示完整的房产信息
      console.log('\n完整房产数据:');
      console.log(prettyPrint(property));
      console.log('-----------------------------------');
    });
  }
}

// 主函数
function main() {
  logWithColor('info', '===== 房产缓存读取工具 =====');
  readCache();
}

// 执行主函数
main(); 