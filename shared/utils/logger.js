/**
 * 日志工具模块
 * 提供统一的日志记录功能
 */
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// 创建日志目录
const logDir = path.join(__dirname, '../../server/logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志记录器
const loggers = new Map();

// 创建默认日志记录器
const defaultLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'default.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

function getLogger(name) {
  if (loggers.has(name)) {
    return loggers.get(name);
  }

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ 
        filename: path.join(logDir, `${name}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  loggers.set(name, logger);
  return logger;
}

function closeLoggers() {
  loggers.forEach(logger => {
    logger.close();
  });
  loggers.clear();
}

// 创建通用日志方法
const rootLogger = {
  error: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    defaultLogger.error(message, params);
  },
  warn: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    defaultLogger.warn(message, params);
  },
  info: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    defaultLogger.info(message, params);
  },
  debug: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    defaultLogger.debug(message, params);
  },
  log: (message, ...args) => {
    const params = args.length > 0 ? args[0] : {};
    defaultLogger.info(message, params);
  }
};

// 导出日志功能
module.exports = {
  getLogger,
  closeLoggers,
  ...rootLogger
}; 