/**
 * 请求日志中间件
 * 记录所有API请求的信息
 */
const { Logger } = require('../../../shared/src');

/**
 * 请求日志中间件
 * 记录请求的路径、方法、IP、参数等信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
module.exports = (req, res, next) => {
  // 记录请求开始时间
  const startTime = Date.now();
  
  // 记录请求信息
  Logger.info('收到API请求', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    query: req.query,
    // 避免记录敏感信息，例如密码
    body: maskSensitiveData(req.body)
  });
  
  // 记录响应结束后的信息
  res.on('finish', () => {
    // 计算请求处理时间
    const duration = Date.now() - startTime;
    
    // 根据状态码判断请求级别
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    // 记录响应信息
    Logger[logLevel]('API请求完成', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
};

/**
 * 掩盖敏感数据
 * @param {Object} data - 请求数据
 * @returns {Object} 掩盖敏感字段后的数据
 */
function maskSensitiveData(data) {
  if (!data) return data;
  
  // 创建数据副本
  const maskedData = { ...data };
  
  // 需要掩盖的敏感字段
  const sensitiveFields = ['password', 'privateKey', 'secret', 'token', 'api_key', 'apiKey'];
  
  // 遍历对象掩盖敏感字段
  for (const key in maskedData) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      maskedData[key] = '******';
    } else if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
      // 递归处理嵌套对象
      maskedData[key] = maskSensitiveData(maskedData[key]);
    }
  }
  
  return maskedData;
} 