/**
 * 请求日志中间件
 */
const { v4: uuidv4 } = require('uuid');
const { Logger, PerformanceMonitor } = require('../../../shared/src');

/**
 * 屏蔽敏感数据
 * @param {Object} data - 原始数据对象
 * @returns {Object} 屏蔽后的数据对象
 */
function maskSensitiveData(data) {
  if (!data) return data;

  const masked = { ...data };
  const sensitiveFields = [
    'password', 'token', 'api_key', 'apiKey', 'secret', 'privateKey', 
    'private_key', 'key', 'authorization'
  ];

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '******';
    }
  }

  return masked;
}

/**
 * 请求日志中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function requestLogger(req, res, next) {
  // 生成请求ID
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);

  // 记录请求开始时间
  const startTime = Date.now();
  
  // 开始性能监控
  const performanceMonitor = PerformanceMonitor.start(`http-${req.method}-${req.path}`);

  // 记录请求信息
  Logger.info(`HTTP ${req.method} ${req.path}`, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: maskSensitiveData(req.query),
    body: maskSensitiveData(req.body),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // 响应发送完成后记录响应信息
  res.on('finish', () => {
    // 计算请求处理时间
    const duration = Date.now() - startTime;
    
    // 结束性能监控
    const perfData = PerformanceMonitor.end(performanceMonitor);
    
    // 基于状态码选择日志级别
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    // 记录响应信息
    Logger[logLevel](`HTTP ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      performance: perfData,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // 记录慢请求
    if (duration > 1000) {
      Logger.warn(`慢请求: ${req.method} ${req.path}`, {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        query: maskSensitiveData(req.query),
        ip: req.ip
      });
    }
  });

  // 错误处理
  res.on('error', (error) => {
    Logger.error(`HTTP响应错误: ${req.method} ${req.path}`, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack
    });
  });

  next();
}

module.exports = requestLogger; 