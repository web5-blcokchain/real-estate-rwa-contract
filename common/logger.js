const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 日志工具类
 */
class Logger {
  static LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    HTTP: 'http',
    VERBOSE: 'verbose',
    DEBUG: 'debug',
    SILLY: 'silly'
  };

  static _logger = null;

  /**
   * 获取日志记录器实例
   * @returns {winston.Logger} Winston日志记录器实例
   */
  static getLogger() {
    if (Logger._logger) {
      return Logger._logger;
    }

    // 定义日志格式
    const { format } = winston;
    const logFormat = format.printf(({ level, message, timestamp, ...meta }) => {
      let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      
      // 如果有额外的元数据，添加到日志中
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    });

    // 创建日志记录器
    Logger._logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: { service: 'jp-rwa-service' },
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: format.combine(
            format.colorize(),
            format.prettyPrint(),
            logFormat
          )
        }),
        // 文件输出 - 错误日志
        new winston.transports.File({ 
          filename: path.join(logDir, 'error.log'), 
          level: 'error' 
        }),
        // 文件输出 - 所有日志
        new winston.transports.File({ 
          filename: path.join(logDir, 'combined.log') 
        })
      ]
    });

    return Logger._logger;
  }

  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  static error(message, meta = {}) {
    Logger.getLogger().error(message, meta);
  }

  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  static warn(message, meta = {}) {
    Logger.getLogger().warn(message, meta);
  }

  /**
   * 记录信息日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  static info(message, meta = {}) {
    Logger.getLogger().info(message, meta);
  }

  /**
   * 记录HTTP请求日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  static http(message, meta = {}) {
    Logger.getLogger().http(message, meta);
  }

  /**
   * 记录详细日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  static verbose(message, meta = {}) {
    Logger.getLogger().verbose(message, meta);
  }

  /**
   * 记录调试日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  static debug(message, meta = {}) {
    Logger.getLogger().debug(message, meta);
  }

  /**
   * 记录详细调试日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 元数据
   */
  static silly(message, meta = {}) {
    Logger.getLogger().silly(message, meta);
  }
}

module.exports = Logger; 