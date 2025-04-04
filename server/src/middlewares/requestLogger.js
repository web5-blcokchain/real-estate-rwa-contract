/**
 * 请求日志中间件
 */
const { v4: uuidv4 } = require('uuid');
const { Logger, PerformanceMonitor } = require('../../../shared/src');
const serverConfig = require('../config');

/**
 * 屏蔽敏感数据
 * @param {Object} data - 要屏蔽的数据
 * @returns {Object} 屏蔽后的数据
 */
function maskSensitiveData(data) {
  if (!data) return data;
  
  const masked = { ...data };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'privateKey'];
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '******';
    }
  }
  
  return masked;
}

/**
 * 请求日志记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function requestLogger(req, res, next) {
  // 获取日志配置
  const loggerConfig = serverConfig.getLoggerConfig();
  
  // 为每个请求生成唯一ID
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  
  // 如果禁用了HTTP日志，直接跳过
  if (loggerConfig.httpLog === false) {
    return next();
  }
  
  // 记录请求开始时间和初始内存使用
  const startTime = Date.now();
  const startMemoryUsage = process.memoryUsage();
  
  // 记录请求信息
  Logger.info(`HTTP ${req.method} ${req.path}`, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    referer: req.headers['referer'],
    // 屏蔽敏感信息
    body: maskSensitiveData(req.body),
    timestamp: new Date().toISOString()
  });
  
  // 增加性能监控
  const performanceStart = PerformanceMonitor.start(`http-request-${req.method}-${req.path}`);
  
  // 增加响应拦截器来记录响应体大小
  const originalSend = res.send;
  res.send = function(body) {
    res.responseBody = body;
    return originalSend.apply(res, arguments);
  };
  
  // 响应完成时记录
  res.on('finish', () => {
    // 计算处理时间
    const duration = Date.now() - startTime;
    
    // 获取当前内存使用
    const endMemoryUsage = process.memoryUsage();
    
    // 计算内存差异 (RSS 是进程占用的物理内存)
    const memoryDiff = {
      rss: (endMemoryUsage.rss - startMemoryUsage.rss) / 1024 / 1024, // MB
      heapTotal: (endMemoryUsage.heapTotal - startMemoryUsage.heapTotal) / 1024 / 1024, // MB
      heapUsed: (endMemoryUsage.heapUsed - startMemoryUsage.heapUsed) / 1024 / 1024, // MB
    };
    
    // 停止性能监控
    const performanceData = PerformanceMonitor.end(performanceStart);
    
    // 根据状态码选择日志级别
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    // 计算响应大小
    let responseSize = 0;
    if (res.responseBody) {
      if (typeof res.responseBody === 'string') {
        responseSize = Buffer.byteLength(res.responseBody, 'utf8');
      } else if (typeof res.responseBody === 'object') {
        responseSize = Buffer.byteLength(JSON.stringify(res.responseBody), 'utf8');
      }
    }
    
    // 记录响应信息
    Logger[logLevel](`HTTP ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      params: req.params,
      status: res.statusCode,
      duration: duration,
      durationFormatted: `${duration}ms`,
      memoryDiff: memoryDiff,
      responseSize: formatBytes(responseSize),
      responseSizeBytes: responseSize,
      contentType: res.get('Content-Type'),
      ip: req.ip,
      performance: performanceData,
      timestamp: new Date().toISOString()
    });
    
    // 如果配置了记录慢请求
    if (loggerConfig.slowRequestThreshold && duration > loggerConfig.slowRequestThreshold) {
      Logger.warn(`慢请求: ${req.method} ${req.path} (${duration}ms)`, {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        duration: duration,
        durationFormatted: `${duration}ms`,
        memoryDiff: memoryDiff,
        body: maskSensitiveData(req.body),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 错误处理
  res.on('error', (error) => {
    Logger.error(`HTTP请求错误: ${req.method} ${req.path}`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
}

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = requestLogger; 