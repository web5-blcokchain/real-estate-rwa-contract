/**
 * 日志工具模块
 * 提供统一的日志记录功能
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${stack ? '\n' + stack : ''}`;
  })
);

// 创建Winston日志记录器
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  format: logFormat,
  defaultMeta: { service: 'http-server' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // 信息日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'info.log'),
      level: 'info',
      maxsize: config.logging.maxSize || 5242880, // 5MB
      maxFiles: config.logging.maxFiles || 5
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: config.logging.maxSize || 5242880,
      maxFiles: config.logging.maxFiles || 5
    })
  ]
});

// 开发环境下的额外配置
if (config.server.nodeEnv === 'development') {
  logger.level = 'debug';
}

module.exports = { logger }; 