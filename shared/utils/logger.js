/**
 * 日志工具模块
 * 提供统一的日志记录功能
 */
const winston = require('winston');
require('winston-daily-rotate-file');
const { getLogPath, validatePath } = require('./paths');
const fs = require('fs');
const path = require('path');

// 默认日志配置
const loggingConfig = {
  directory: getLogPath(),
  commonLogName: 'app.log',
  errorLogName: 'error.log',
  level: process.env.LOG_LEVEL || 'info',
  maxSize: '10m',
  maxFiles: '14d',
  logObjects: true,
  datePattern: 'YYYY-MM-DD'
};

// 确保日志目录存在
const logDir = loggingConfig.directory;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`Created log directory: ${logDir}`);
}

// 创建日期格式化器
const { format } = winston;
const { combine, timestamp, printf, colorize, json, errors } = format;

// 自定义日志格式
const myFormat = printf(({ timestamp, level, message, module, ...rest }) => {
  const moduleStr = module ? `[${module}] ` : '';
  const restStr = Object.keys(rest).length > 0 && !rest.stack
    ? loggingConfig.logObjects 
      ? `\n${JSON.stringify(rest, null, 2)}`
      : ` ${JSON.stringify(rest)}`
    : '';
  
  // 如果有堆栈信息，单独显示
  const stackStr = rest.stack ? `\n${rest.stack}` : '';
  
  return `${timestamp} ${level}: ${moduleStr}${message}${restStr}${stackStr}`;
});

// 创建控制台日志传输器
const consoleTransport = new winston.transports.Console({
  level: loggingConfig.level,
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    myFormat
  )
});

// 创建通用文件日志传输器
const commonFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(loggingConfig.directory, 'app-%DATE%.log'),
  datePattern: loggingConfig.datePattern,
  maxSize: loggingConfig.maxSize,
  maxFiles: loggingConfig.maxFiles,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    myFormat
  )
});

// 创建错误文件日志传输器
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(loggingConfig.directory, 'error-%DATE%.log'),
  datePattern: loggingConfig.datePattern,
  maxSize: loggingConfig.maxSize,
  maxFiles: loggingConfig.maxFiles,
  level: 'error',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    myFormat
  )
});

// 创建日志记录器
const logger = winston.createLogger({
  level: loggingConfig.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    myFormat
  ),
  transports: [
    consoleTransport,
    commonFileTransport,
    errorFileTransport
  ],
  exitOnError: false
});

// 存储模块特定的日志记录器
const loggers = {};

/**
 * 获取指定模块的日志记录器
 * @param {string} moduleName 模块名称
 * @returns {Object} 日志记录器
 */
function getLogger(moduleName) {
  if (loggers[moduleName]) {
    return loggers[moduleName];
  }
  
  // 为模块创建特定的日志文件传输器
  const moduleFileTransport = new winston.transports.DailyRotateFile({
    filename: path.join(loggingConfig.directory, `${moduleName}-%DATE%.log`),
    datePattern: loggingConfig.datePattern,
    maxSize: loggingConfig.maxSize,
    maxFiles: loggingConfig.maxFiles,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      myFormat
    )
  });
  
  // 创建模块特定的日志记录器
  const moduleLogger = winston.createLogger({
    level: loggingConfig.level,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      myFormat
    ),
    transports: [
      consoleTransport,
      moduleFileTransport,
      errorFileTransport
    ],
    exitOnError: false
  });
  
  // 创建日志工具对象
  const loggerObj = {
    error: (message, ...args) => {
      const params = args.length > 0 ? args[0] : {};
      moduleLogger.error(message, { module: moduleName, ...params });
    },
    warn: (message, ...args) => {
      const params = args.length > 0 ? args[0] : {};
      moduleLogger.warn(message, { module: moduleName, ...params });
    },
    info: (message, ...args) => {
      const params = args.length > 0 ? args[0] : {};
      moduleLogger.info(message, { module: moduleName, ...params });
    },
    debug: (message, ...args) => {
      const params = args.length > 0 ? args[0] : {};
      moduleLogger.debug(message, { module: moduleName, ...params });
    },
    log: (message, ...args) => {
      const params = args.length > 0 ? args[0] : {};
      moduleLogger.info(message, { module: moduleName, ...params });
    }
  };
  
  // 缓存日志记录器
  loggers[moduleName] = loggerObj;
  return loggerObj;
}

/**
 * 设置日志级别
 * @param {string} level 日志级别
 */
function setLogLevel(level) {
  if (['error', 'warn', 'info', 'debug'].includes(level)) {
    logger.level = level;
    consoleTransport.level = level;
    
    // 更新所有模块日志记录器的级别
    Object.values(loggers).forEach(logger => {
      logger.level = level;
    });
  }
}

/**
 * 关闭所有日志记录器
 * 在应用退出前调用，确保所有日志都被写入
 */
function closeLoggers() {
  logger.close();
  Object.values(loggers).forEach(logger => {
    if (logger.close) {
      logger.close();
    }
  });
}

// 创建通用日志方法
const rootLogger = {
  error: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    logger.error(message, params);
  },
  warn: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    logger.warn(message, params);
  },
  info: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    logger.info(message, params);
  },
  debug: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    logger.debug(message, params);
  },
  log: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    logger.info(message, params);
  }
};

// 导出日志功能
module.exports = {
  getLogger,
  setLogLevel,
  closeLoggers,
  ...rootLogger
}; 