/**
 * 日志工具模块
 * 提供统一的日志记录功能
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 默认日志配置
const loggingConfig = {
  directory: path.join(process.cwd(), 'logs'),
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
  filename: path.join(logDir, loggingConfig.filename),
  level: loggingConfig.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  maxsize: loggingConfig.maxSize,
  maxFiles: loggingConfig.maxFiles,
  tailable: true,
  zippedArchive: true
});

// 创建基础日志记录器
const baseLogger = winston.createLogger({
  level: loggingConfig.level,
  transports: [
    consoleTransport,
    fileTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: loggingConfig.maxSize,
      maxFiles: loggingConfig.maxFiles
    })
  ],
  exitOnError: false
});

/**
 * 创建带有模块名的日志记录器
 * @param {string} moduleName 模块名称
 * @returns {Object} 日志记录器对象
 */
function getLogger(moduleName) {
  return {
    info: (message, meta = {}) => {
      baseLogger.info(message, { module: moduleName, ...meta });
    },
    warn: (message, meta = {}) => {
      baseLogger.warn(message, { module: moduleName, ...meta });
    },
    error: (message, meta = {}) => {
      baseLogger.error(message, { module: moduleName, ...meta });
    },
    debug: (message, meta = {}) => {
      baseLogger.debug(message, { module: moduleName, ...meta });
    },
    log: (level, message, meta = {}) => {
      baseLogger.log(level, message, { module: moduleName, ...meta });
    }
  };
}

// 默认日志记录器
const logger = getLogger('system');

/**
 * 设置日志级别
 * @param {string} level 日志级别
 */
function setLogLevel(level) {
  baseLogger.level = level;
  consoleTransport.level = level;
  fileTransport.level = level;
}

// 导出日志模块
module.exports = {
  logger,
  getLogger,
  setLogLevel
}; 