const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// 创建日志传输器
const createTransports = (module) => {
  const moduleLogDir = path.join(logsDir, module);
  if (!fs.existsSync(moduleLogDir)) {
    fs.mkdirSync(moduleLogDir, { recursive: true });
  }

  return [
    new winston.transports.File({
      filename: path.join(moduleLogDir, 'error.log'),
      level: 'error',
      format: logFormat
    }),
    new winston.transports.File({
      filename: path.join(moduleLogDir, 'combined.log'),
      format: logFormat
    })
  ];
};

// 创建日志记录器
const createLogger = (module) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
      ...createTransports(module),
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