const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
require('dotenv').config();

const logDir = process.env.LOG_DIR || 'logs';
const logLevel = process.env.LOG_LEVEL || 'info';

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// 创建日志传输器
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
  // 文件输出
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
  }),
];

// 创建日志记录器
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
});

// 导出日志记录器
module.exports = { logger }; 