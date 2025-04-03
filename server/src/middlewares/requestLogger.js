/**
 * 请求日志中间件
 */
const { Logger } = require('../../../shared/src/utils');
const serverConfig = require('../config');

/**
 * 请求日志记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function requestLogger(req, res, next) {
  // 获取日志配置
  const loggerConfig = serverConfig.getLoggerConfig();
  
  // 如果禁用了HTTP日志，直接跳过
  if (!loggerConfig.httpLog) {
    return next();
  }
  
  // 记录请求开始时间
  const startTime = Date.now();
  
  // 记录请求信息
  Logger.info(`HTTP ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    // 屏蔽敏感信息
    body: maskSensitiveData(req.body)
  });
  
  // 响应完成时记录
  res.on('finish', () => {
    // 计算处理时间
    const duration = Date.now() - startTime;
    
    // 根据状态码选择日志级别
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    // 记录响应信息
    Logger[logLevel](`HTTP ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
}

/**
 * 屏蔽敏感数据
 * @param {Object} data - 原始数据
 * @returns {Object} 屏蔽后的数据
 */
function maskSensitiveData(data) {
  // 如果没有数据，直接返回
  if (!data) return data;
  
  // 复制数据，避免修改原始对象
  const masked = { ...data };
  
  // 敏感字段列表
  const sensitiveFields = [
    'password', 'privateKey', 'secret', 'token', 'apiKey', 'api_key'
  ];
  
  // 遍历对象，屏蔽敏感字段
  Object.keys(masked).forEach(key => {
    if (sensitiveFields.includes(key.toLowerCase())) {
      masked[key] = '******';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      // 递归处理嵌套对象
      masked[key] = maskSensitiveData(masked[key]);
    }
  });
  
  return masked;
}

module.exports = requestLogger; 