const winston = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// 确保日志目录存在
try {
  if (!fs.existsSync(config.logging.directory)) {
    fs.mkdirSync(config.logging.directory, { recursive: true });
  }
} catch (error) {
  console.error(`Error creating log directory: ${error.message}`);
}

// 创建日志格式
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  // 是否记录详细对象信息
  if (!config.logging.logObjects && Object.keys(meta).length > 0) {
    // 只记录简化的元数据
    const simplifiedMeta = {};
    
    // 保留一些重要字段
    if (meta.contract) simplifiedMeta.contract = meta.contract;
    if (meta.tx) simplifiedMeta.tx = meta.tx;
    
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${
      Object.keys(simplifiedMeta).length ? JSON.stringify(simplifiedMeta) : ''
    }`;
  }
  
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// 自定义格式，移除敏感或过大的对象
const sanitizeFormat = winston.format((info) => {
  // 如果不记录详细对象，过滤掉大型对象字段
  if (!config.logging.logObjects && info.args) {
    // 简化args字段，避免日志过大
    const keysCount = Object.keys(info.args).length;
    if (keysCount > 5) {
      info.args = { 
        note: `[${keysCount} keys omitted, enable LOG_OBJECTS=true to see all]`,
        sample: Object.keys(info.args).slice(0, 3)
      };
    }
  }
  
  return info;
});

// 创建一个每日轮转的日志文件传输方式
const fileTransport = new winston.transports.DailyRotateFile({
  dirname: config.logging.directory,
  filename: config.logging.filename,
  datePattern: config.logging.datePattern,
  maxSize: config.logging.maxSize,
  maxFiles: config.logging.maxFiles,
  format: winston.format.combine(
    winston.format.timestamp(),
    sanitizeFormat(),
    logFormat
  )
});

// 创建控制台输出传输方式
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    sanitizeFormat(),
    logFormat
  )
});

// 创建日志记录器
const logger = winston.createLogger({
  level: config.logging.level,
  transports: [fileTransport, consoleTransport]
});

// 记录模块启动信息
logger.info('Logger initialized', { 
  level: config.logging.level, 
  logDir: config.logging.directory,
  logObjects: config.logging.logObjects
});

module.exports = logger; 