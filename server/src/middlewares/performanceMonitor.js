/**
 * API性能监控中间件
 * 跟踪API请求的执行时间和资源消耗
 */

const os = require('os');
const logger = require('../utils/logger');

// 初始化性能指标存储
const performanceMetrics = {
  requests: {},
  endpoints: {}
};

// 创建性能监控中间件
const performanceMonitor = (req, res, next) => {
  // 记录请求开始时间
  const start = process.hrtime();
  
  // 记录请求开始时的内存使用
  const startMemory = process.memoryUsage();
  
  // 在响应结束时收集和记录性能指标
  res.on('finish', () => {
    // 计算请求处理时间
    const hrend = process.hrtime(start);
    const duration = hrend[0] * 1000 + hrend[1] / 1000000; // 转换为毫秒
    
    // 获取内存使用差异
    const endMemory = process.memoryUsage();
    const memoryDiff = {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external
    };
    
    // 获取路由路径
    const path = req.route ? req.route.path : req.path;
    const method = req.method;
    const endpoint = `${method} ${path}`;
    
    // 更新整体请求计数
    if (!performanceMetrics.requests.count) {
      performanceMetrics.requests = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    }
    
    performanceMetrics.requests.count++;
    performanceMetrics.requests.totalDuration += duration;
    performanceMetrics.requests.avgDuration = 
      performanceMetrics.requests.totalDuration / performanceMetrics.requests.count;
    
    // 更新特定端点的指标
    if (!performanceMetrics.endpoints[endpoint]) {
      performanceMetrics.endpoints[endpoint] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Number.MAX_VALUE,
        maxDuration: 0,
        statusCodes: {},
        memoryUsage: {
          totalRss: 0,
          totalHeapUsed: 0,
          avgRss: 0,
          avgHeapUsed: 0
        }
      };
    }
    
    const endpointMetrics = performanceMetrics.endpoints[endpoint];
    endpointMetrics.count++;
    endpointMetrics.totalDuration += duration;
    endpointMetrics.avgDuration = endpointMetrics.totalDuration / endpointMetrics.count;
    
    if (duration < endpointMetrics.minDuration) {
      endpointMetrics.minDuration = duration;
    }
    
    if (duration > endpointMetrics.maxDuration) {
      endpointMetrics.maxDuration = duration;
    }
    
    // 记录状态码分布
    const statusCode = res.statusCode.toString();
    if (!endpointMetrics.statusCodes[statusCode]) {
      endpointMetrics.statusCodes[statusCode] = 0;
    }
    endpointMetrics.statusCodes[statusCode]++;
    
    // 更新内存使用指标
    endpointMetrics.memoryUsage.totalRss += memoryDiff.rss;
    endpointMetrics.memoryUsage.totalHeapUsed += memoryDiff.heapUsed;
    endpointMetrics.memoryUsage.avgRss = 
      endpointMetrics.memoryUsage.totalRss / endpointMetrics.count;
    endpointMetrics.memoryUsage.avgHeapUsed = 
      endpointMetrics.memoryUsage.totalHeapUsed / endpointMetrics.count;
    
    // 记录慢请求
    if (duration > 1000) { // 超过1秒的请求视为慢请求
      logger.warn(`慢请求: ${endpoint} 耗时 ${duration.toFixed(2)}ms`);
    }
  });
  
  // 继续处理请求
  next();
};

// 获取性能指标
const getPerformanceMetrics = () => {
  // 添加系统信息
  return {
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: os.cpus(),
      loadavg: os.loadavg(),
      freemem: os.freemem(),
      totalmem: os.totalmem()
    },
    api: performanceMetrics
  };
};

// 重置性能指标
const resetPerformanceMetrics = () => {
  Object.keys(performanceMetrics).forEach(key => {
    if (key === 'requests') {
      performanceMetrics[key] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    } else if (key === 'endpoints') {
      performanceMetrics[key] = {};
    }
  });
  
  return { success: true, message: '性能指标已重置' };
};

module.exports = {
  performanceMonitor,
  getPerformanceMetrics,
  resetPerformanceMetrics
}; 