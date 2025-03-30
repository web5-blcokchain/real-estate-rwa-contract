/**
 * 日志工具
 * 使用winston提供日志功能
 */

const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, splat } = format;
const fs = require('fs');
const path = require('path');
const config = require('../config');

// 确保日志目录存在
if (!fs.existsSync(config.logs.dir)) {
  fs.mkdirSync(config.logs.dir, { recursive: true });
}

// 日志格式
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// 创建Winston日志记录器
const logger = createLogger({
  level: config.logs.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    splat(),
    logFormat
  ),
  transports: [
    // 控制台输出
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        splat(),
        logFormat
      )
    }),
    // 所有日志文件
    new transports.File({
      filename: path.join(config.logs.dir, 'combined.log'),
      maxsize: config.logs.maxSize,
      maxFiles: config.logs.maxFiles
    }),
    // 错误日志文件
    new transports.File({
      filename: path.join(config.logs.dir, 'error.log'),
      level: 'error',
      maxsize: config.logs.maxSize,
      maxFiles: config.logs.maxFiles
    }),
    // API请求日志
    new transports.File({
      filename: path.join(config.logs.dir, 'api-requests.log'),
      maxsize: config.logs.maxSize,
      maxFiles: config.logs.maxFiles
    })
  ],
  // 处理异常
  exceptionHandlers: [
    new transports.File({
      filename: path.join(config.logs.dir, 'exceptions.log'),
      maxsize: config.logs.maxSize,
      maxFiles: config.logs.maxFiles
    })
  ],
  // 退出时不终止程序
  exitOnError: false
});

/**
 * 请求日志中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  // 响应完成后记录日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${ip} - ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    // 根据状态码选择日志级别
    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });
  
  next();
};

module.exports = {
  logger,
  requestLogger
}; 