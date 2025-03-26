/**
 * 日志工具模块
 * 提供统一的日志记录功能
 */
const winston = require('winston');
const { getLogPath, validatePath } = require('./paths');
const fs = require('fs');
const path = require('path');

// 默认日志配置
const loggingConfig = {
  directory: getLogPath(),
  filename: 'app.log',
  level: 'info',
  maxSize: 5242880, // 5MB
  maxFiles: 5,
  logObjects: true
};

// 确保日志目录存在
const logDir = loggingConfig.directory;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`Created log directory: ${logDir}`);
}

// 创建日期格式化器
const { format } = winston;
const { combine, timestamp, printf, colorize, json } = format;

// 自定义日志格式
const myFormat = printf(({ timestamp, level, message, module, ...rest }) => {
  const moduleStr = module ? `[${module}] ` : '';
  const restStr = Object.keys(rest).length > 0 
    ? loggingConfig.logObjects 
      ? `\n${JSON.stringify(rest, null, 2)}`
      : ` ${JSON.stringify(rest)}`
    : '';
  
  return `${timestamp} ${level}: ${moduleStr}${message}${restStr}`;
});

// 创建控制台日志传输器
const consoleTransport = new winston.transports.Console({
  level: loggingConfig.level,
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat
  )
});

// 创建文件日志传输器
const fileTransport = new winston.transports.File({
  filename: path.join(loggingConfig.directory, loggingConfig.filename),
  maxsize: loggingConfig.maxSize,
  maxFiles: loggingConfig.maxFiles,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  )
});

// 创建日志记录器
const logger = winston.createLogger({
  level: loggingConfig.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat
  ),
  transports: [consoleTransport, fileTransport]
});

/**
 * 获取指定模块的日志记录器
 * @param {string} moduleName 模块名称
 * @returns {Object} 日志记录器
 */
function getLogger(moduleName) {
  return {
    error: (message, ...args) => logger.error(message, { module: moduleName, ...args }),
    warn: (message, ...args) => logger.warn(message, { module: moduleName, ...args }),
    info: (message, ...args) => logger.info(message, { module: moduleName, ...args }),
    debug: (message, ...args) => logger.debug(message, { module: moduleName, ...args }),
    log: (message, ...args) => logger.info(message, { module: moduleName, ...args })
  };
}

/**
 * 设置日志级别
 * @param {string} level 日志级别
 */
function setLogLevel(level) {
  if (['error', 'warn', 'info', 'debug'].includes(level)) {
    logger.level = level;
    consoleTransport.level = level;
  }
}

module.exports = {
  getLogger,
  setLogLevel,
  error: (message, ...args) => logger.error(message, ...args),
  warn: (message, ...args) => logger.warn(message, ...args),
  info: (message, ...args) => logger.info(message, ...args),
  debug: (message, ...args) => logger.debug(message, ...args),
  log: (message, ...args) => logger.info(message, ...args)
}; 