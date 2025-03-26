/**
 * API性能监控中间件
 * 用于监控API请求的响应时间和资源消耗
 */

const { performance } = require('perf_hooks');
const logger = require('@server/utils/logger');

/**
 * 性能指标存储
 * 暂时使用内存存储，后续可以替换为Prometheus或其他时序数据库
 */
const metrics = {
  // 端点性能数据 - 格式: { [endpoint]: { count, totalTime, minTime, maxTime, lastUpdated } }
  endpoints: {},
  
  // 区块链交互性能数据 - 格式: { [method]: { count, totalTime, minTime, maxTime, lastUpdated } }
  blockchain: {},
  
  // 总体API性能
  overall: {
    totalRequests: 0,
    totalTime: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    requestsPerMinute: 0,
    startTime: Date.now()
  }
};

/**
 * 添加或更新端点性能数据
 * @param {string} endpoint 端点路径
 * @param {number} responseTime 响应时间(ms)
 */
function recordEndpointMetric(endpoint, responseTime) {
  if (!metrics.endpoints[endpoint]) {
    metrics.endpoints[endpoint] = {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      lastUpdated: Date.now()
    };
  }
  
  const data = metrics.endpoints[endpoint];
  data.count += 1;
  data.totalTime += responseTime;
  data.minTime = Math.min(data.minTime, responseTime);
  data.maxTime = Math.max(data.maxTime, responseTime);
  data.lastUpdated = Date.now();
}

/**
 * 记录区块链操作性能数据
 * @param {string} method 方法名称
 * @param {number} responseTime 响应时间(ms)
 */
function recordBlockchainMetric(method, responseTime) {
  if (!metrics.blockchain[method]) {
    metrics.blockchain[method] = {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      lastUpdated: Date.now()
    };
  }
  
  const data = metrics.blockchain[method];
  data.count += 1;
  data.totalTime += responseTime;
  data.minTime = Math.min(data.minTime, responseTime);
  data.maxTime = Math.max(data.maxTime, responseTime);
  data.lastUpdated = Date.now();
}

/**
 * 更新整体性能指标
 * @param {number} responseTime 响应时间(ms)
 */
function updateOverallMetrics(responseTime) {
  const overall = metrics.overall;
  overall.totalRequests += 1;
  overall.totalTime += responseTime;
  overall.avgResponseTime = overall.totalTime / overall.totalRequests;
  overall.minResponseTime = Math.min(overall.minResponseTime, responseTime);
  overall.maxResponseTime = Math.max(overall.maxResponseTime, responseTime);
  
  // 计算每分钟请求数
  const runtimeMinutes = (Date.now() - overall.startTime) / (1000 * 60);
  overall.requestsPerMinute = overall.totalRequests / runtimeMinutes;
}

/**
 * 记录区块链操作性能的包装函数
 * 用于包装合约服务方法，记录其执行时间
 * @param {Function} fn 原始函数
 * @param {string} methodName 方法名称
 * @returns {Function} 包装后的函数
 */
function wrapBlockchainMethod(fn, methodName) {
  return async function(...args) {
    const startTime = performance.now();
    
    try {
      return await fn.apply(this, args);
    } finally {
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      recordBlockchainMetric(methodName, executionTime);
      
      if (executionTime > 1000) {
        logger.warn(`区块链操作耗时较长: ${methodName} - ${executionTime.toFixed(2)}ms`);
      }
    }
  };
}

/**
 * 性能监控中间件
 * 记录每个API请求的响应时间
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一个中间件
 */
function performanceMonitor(req, res, next) {
  const startTime = performance.now();
  
  // 在响应结束时记录性能数据
  res.on('finish', () => {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // 获取路由路径，去除查询参数
    const routePath = req.route ? req.baseUrl + req.route.path : req.originalUrl.split('?')[0];
    
    // 记录端点性能数据
    recordEndpointMetric(routePath, responseTime);
    
    // 更新整体性能指标
    updateOverallMetrics(responseTime);
    
    // 如果响应时间超过一定阈值，记录警告日志
    if (responseTime > 1000) {
      logger.warn(`API响应时间过长: ${req.method} ${routePath} - ${responseTime.toFixed(2)}ms`);
    }
    
    // 在开发环境下记录每个请求的性能
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`性能: ${req.method} ${routePath} - ${responseTime.toFixed(2)}ms`);
    }
  });
  
  next();
}

/**
 * 获取性能指标
 * @returns {object} 性能指标数据
 */
function getMetrics() {
  return {
    ...metrics,
    timestamp: Date.now(),
    uptime: (Date.now() - metrics.overall.startTime) / 1000
  };
}

/**
 * 重置性能指标
 */
function resetMetrics() {
  Object.keys(metrics.endpoints).forEach(key => delete metrics.endpoints[key]);
  Object.keys(metrics.blockchain).forEach(key => delete metrics.blockchain[key]);
  
  metrics.overall = {
    totalRequests: 0,
    totalTime: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    requestsPerMinute: 0,
    startTime: Date.now()
  };
  
  logger.info('性能指标已重置');
}

module.exports = {
  performanceMonitor,
  wrapBlockchainMethod,
  getMetrics,
  resetMetrics,
  recordBlockchainMetric
}; 