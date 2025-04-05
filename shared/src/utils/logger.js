/**
 * 简化版日志模块
 * 提供基本的日志记录功能
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { LoggerError } = require('./errors');

/**
 * 安全地创建目录
 * @param {string} dirPath - 目录路径
 * @private
 */
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    throw new LoggerError(`无法创建目录 ${dirPath}: ${error.message}`);
  }
}

/**
 * 日志记录器类
 */
class Logger {
  constructor() {
    this.loggers = new Map();
    
    // 默认配置
    this.config = {
      level: 'info',
      directory: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      console: true
    };
  }

  /**
   * 配置日志记录器
   * @param {Object} config - 配置对象
   * @param {string} [config.level] - 日志级别
   * @param {string} [config.directory] - 日志目录
   * @param {string|number} [config.maxSize] - 最大文件大小
   * @param {string|number} [config.maxFiles] - 最大文件数
   * @param {boolean} [config.console] - 是否同时输出到控制台
   */
  configure(config = {}) {
    // 处理directory或dir属性
    if (config.directory) {
      config.dir = config.directory;
    } else if (config.dir) {
      config.directory = config.dir;
    }
    
    // 处理maxSize字符串 (如 '10m')
    if (typeof config.maxSize === 'string') {
      const sizeMatch = config.maxSize.match(/^(\d+)([kmgt]?)$/i);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1], 10);
        const unit = sizeMatch[2].toLowerCase();
        
        // 转换为字节
        switch(unit) {
          case 'k': config.maxSize = size * 1024; break;
          case 'm': config.maxSize = size * 1024 * 1024; break;
          case 'g': config.maxSize = size * 1024 * 1024 * 1024; break;
          case 't': config.maxSize = size * 1024 * 1024 * 1024 * 1024; break;
          default: config.maxSize = size;
        }
      }
    }
    
    // 处理maxFiles字符串
    if (typeof config.maxFiles === 'string') {
      config.maxFiles = parseInt(config.maxFiles, 10) || this.config.maxFiles;
    }
    
    // 合并配置
    this.config = { ...this.config, ...config };
    
    // 确保根日志目录存在
    ensureDirectoryExists(this.config.directory);
    
    // 清除现有日志实例，下次使用时会重新创建
    this.loggers.clear();
  }

  /**
   * 获取日志实例
   * @param {string} module - 模块名称
   * @returns {winston.Logger} 日志实例
   * @private
   */
  _getLogger(module = 'default') {
    // 检查缓存中是否已有该模块的日志实例
    if (this.loggers.has(module)) {
      return this.loggers.get(module);
    }

    try {
      // 创建模块特定的日志目录
      const moduleDir = path.join(this.config.directory, module);
      ensureDirectoryExists(moduleDir);

      // 标准格式
      const logFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      );

      // 控制台格式
      const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const modulePart = meta.module ? `[${meta.module}] ` : '';
          return `${timestamp} ${level}: ${modulePart}${message} ${
            Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''
          }`;
        })
      );

      // 创建传输器
      const transports = [
        // 错误日志
        new winston.transports.File({
          filename: path.join(moduleDir, 'error.log'),
          level: 'error',
          format: logFormat,
          maxsize: this.config.maxSize,
          maxFiles: this.config.maxFiles
        }),
        // 所有日志
        new winston.transports.File({
          filename: path.join(moduleDir, 'combined.log'),
          format: logFormat,
          maxsize: this.config.maxSize,
          maxFiles: this.config.maxFiles
        })
      ];

      // 添加控制台输出
      if (this.config.console) {
        transports.push(
          new winston.transports.Console({
            format: consoleFormat
          })
        );
      }

      // 创建日志记录器
      const logger = winston.createLogger({
        level: this.config.level,
        defaultMeta: { module },
        transports
      });

      // 缓存日志实例
      this.loggers.set(module, logger);
      return logger;
    } catch (error) {
      // 出现错误时创建基本控制台日志器
      console.error(`创建日志器失败: ${error.message}`);
      
      const fallbackLogger = winston.createLogger({
        level: 'info',
        transports: [new winston.transports.Console()]
      });
      
      this.loggers.set(module, fallbackLogger);
      return fallbackLogger;
    }
  }

  /**
   * 记录debug级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  debug(message, meta = {}) {
    const module = meta.module || this._defaultModule || 'default';
    this._getLogger(module).debug(message, meta);
  }

  /**
   * 记录info级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  info(message, meta = {}) {
    const module = meta.module || this._defaultModule || 'default';
    this._getLogger(module).info(message, meta);
  }

  /**
   * 记录warn级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  warn(message, meta = {}) {
    const module = meta.module || this._defaultModule || 'default';
    this._getLogger(module).warn(message, meta);
  }

  /**
   * 记录error级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  error(message, meta = {}) {
    const module = meta.module || this._defaultModule || 'default';
    this._getLogger(module).error(message, meta);
  }

  /**
   * 设置默认模块路径
   * @param {string} module - 模块名称
   * @deprecated 建议在meta参数中指定module
   */
  setPath(module) {
    this._defaultModule = module;
  }
}

// 导出单例实例
module.exports = new Logger(); 