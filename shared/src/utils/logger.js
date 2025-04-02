const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { Validation } = require('./validation');
const { LoggerError } = require('./errors');

// 日志配置
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_LOG_DIR = 'logs';
const MAX_LOG_FILES = 5;
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// 验证日志配置
const validateLoggerConfig = () => {
  const logLevel = process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL;
  Validation.validate(
    LOG_LEVELS.includes(logLevel),
    `无效的日志级别: ${logLevel}`
  );

  const logDir = process.env.LOG_DIR || DEFAULT_LOG_DIR;
  Validation.validate(
    typeof logDir === 'string' && logDir.length > 0,
    '无效的日志目录'
  );

  return { logLevel, logDir };
};

// 创建日志目录
const createLogDir = (logDir) => {
  try {
    const absolutePath = path.resolve(process.cwd(), logDir);
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }
    return absolutePath;
  } catch (error) {
    throw new LoggerError(`创建日志目录失败: ${error.message}`);
  }
};

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 创建日志传输器
const createTransports = (module, logDir) => {
  const moduleLogDir = path.join(logDir, module);
  if (!fs.existsSync(moduleLogDir)) {
    fs.mkdirSync(moduleLogDir, { recursive: true });
  }

  return [
    new winston.transports.File({
      filename: path.join(moduleLogDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true
    }),
    new winston.transports.File({
      filename: path.join(moduleLogDir, 'combined.log'),
      format: logFormat,
      maxsize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true
    })
  ];
};

// 创建日志记录器
const createLogger = (module) => {
  const { logLevel, logDir } = validateLoggerConfig();
  const absoluteLogDir = createLogDir(logDir);

  return winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports: [
      ...createTransports(module, absoluteLogDir),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
};

// 导出日志方法
module.exports = {
  info: (message, meta = {}) => {
    const module = meta.module || 'default';
    const logger = createLogger(module);
    logger.info(message, meta);
  },
  error: (message, meta = {}) => {
    const module = meta.module || 'default';
    const logger = createLogger(module);
    logger.error(message, meta);
  },
  warn: (message, meta = {}) => {
    const module = meta.module || 'default';
    const logger = createLogger(module);
    logger.warn(message, meta);
  },
  debug: (message, meta = {}) => {
    const module = meta.module || 'default';
    const logger = createLogger(module);
    logger.debug(message, meta);
  }
}; 