/**
 * 日志工具
 */

const winston = require('winston');
const { format, transports } = winston;
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 确保日志目录存在
const logDir = path.resolve(process.cwd(), config.logging.directory);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 创建一个命名的日志记录器
 * @param {string} name 日志记录器名称
 * @returns {winston.Logger} 日志记录器实例
 */
function createLogger(name) {
  return winston.createLogger({
    level: config.logging.level,
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
      format.label({ label: name }),
      format.printf(info => {
        return `${info.timestamp} [${info.level.toUpperCase()}] [${info.label}]: ${info.message} ${
          Object.keys(info.metadata).length ? JSON.stringify(info.metadata) : ''
        }`;
      })
    ),
    transports: [
      // 控制台输出
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.printf(info => {
            return `${info.timestamp} [${info.level}] [${info.label}]: ${info.message} ${
              Object.keys(info.metadata).length ? JSON.stringify(info.metadata) : ''
            }`;
          })
        )
      }),
      // 文件输出 - 应用日志
      new transports.File({
        filename: path.join(logDir, `${name}.log`),
        maxsize: config.logging.maxSize,
        maxFiles: config.logging.maxFiles,
        tailable: true
      }),
      // 文件输出 - 错误日志
      new transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: config.logging.maxSize,
        maxFiles: config.logging.maxFiles,
        tailable: true
      })
    ]
  });
}

module.exports = {
  createLogger
}; 