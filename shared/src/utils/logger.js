const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { LoggerError } = require('./errors');

/**
 * 默认日志配置
 */
const DEFAULT_CONFIG = {
  level: 'info',     // 日志级别
  dir: 'logs',       // 日志目录
  maxSize: 10 * 1024 * 1024, // 文件最大大小 (10MB)
  maxFiles: 5,       // 最大文件数
  console: true      // 是否同时输出到控制台
};

/**
 * 内部验证日志配置有效性
 * @private
 * @param {Object} config - 日志配置
 * @returns {boolean} 是否有效
 */
const isValidLoggerConfig = (config) => {
  if (!config || typeof config !== 'object') return false;
  
  // 验证日志级别
  const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  if (config.level && !validLevels.includes(config.level)) return false;
  
  // 验证其他字段类型
  if (config.dir && typeof config.dir !== 'string') return false;
  if (config.maxSize && typeof config.maxSize !== 'number') return false;
  if (config.maxFiles && typeof config.maxFiles !== 'number') return false;
  if (config.console !== undefined && typeof config.console !== 'boolean') return false;
  
  return true;
};

/**
 * 日志格式
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * 创建日志目录
 * @param {string} logDir - 日志目录路径
 * @returns {string} 绝对路径
 */
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

/**
 * 创建控制台传输器
 * @returns {winston.transports.ConsoleTransport} 控制台传输器
 */
const createConsoleTransport = () => {
  return new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  });
};

/**
 * 创建文件传输器
 * @param {string} moduleDir - 模块日志目录
 * @param {Object} config - 配置对象
 * @returns {Array<winston.transports.FileTransport>} 文件传输器数组
 */
const createFileTransports = (moduleDir, config) => {
  try {
    // 确保模块日志目录存在
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }

    return [
      new winston.transports.File({
        filename: path.join(moduleDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: config.maxSize,
        maxFiles: config.maxFiles,
        tailable: true
      }),
      new winston.transports.File({
        filename: path.join(moduleDir, 'combined.log'),
        format: logFormat,
        maxsize: config.maxSize,
        maxFiles: config.maxFiles,
        tailable: true
      })
    ];
  } catch (error) {
    throw new LoggerError(`创建日志传输器失败: ${error.message}`);
  }
};

// 单例日志记录器缓存
const loggerInstances = {};

/**
 * 获取或创建日志记录器
 * @param {string} module - 模块名称
 * @returns {winston.Logger} 日志记录器实例
 */
const getLogger = (module) => {
  const moduleName = module || 'default';
  
  // 检查缓存
  if (loggerInstances[moduleName]) {
    return loggerInstances[moduleName];
  }
  
  try {
    // 创建日志目录
    const absoluteLogDir = createLogDir(Logger.config.dir);
    const moduleLogDir = path.join(absoluteLogDir, moduleName);
    
    // 创建传输器
    const transports = [
      ...createFileTransports(moduleLogDir, Logger.config)
    ];
    
    // 添加控制台传输器（如果启用）
    if (Logger.config.console) {
      transports.push(createConsoleTransport());
    }
    
    // 创建日志记录器
    const logger = winston.createLogger({
      level: Logger.config.level,
      format: logFormat,
      defaultMeta: { module: moduleName },
      transports
    });
    
    // 缓存实例
    loggerInstances[moduleName] = logger;
    
    return logger;
  } catch (error) {
    throw new LoggerError(`创建日志记录器失败: ${error.message}`);
  }
};

/**
 * 日志记录器
 */
const Logger = {
  /**
   * 当前配置
   */
  config: { ...DEFAULT_CONFIG },
  
  /**
   * 配置日志记录器
   * @param {Object} config - 配置对象
   */
  configure(config = {}) {
    // 验证配置
    if (!isValidLoggerConfig(config)) {
      throw new LoggerError('无效的日志配置');
    }
    
    // 合并配置
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 清除日志实例缓存（强制重新创建）
    Object.keys(loggerInstances).forEach(key => delete loggerInstances[key]);
  },
  
  /**
   * 记录信息级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  info(message, meta = {}) {
    const module = meta.module || 'default';
    const logger = getLogger(module);
    logger.info(message, meta);
  },
  
  /**
   * 记录错误级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  error(message, meta = {}) {
    const module = meta.module || 'default';
    const logger = getLogger(module);
    logger.error(message, meta);
  },
  
  /**
   * 记录警告级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  warn(message, meta = {}) {
    const module = meta.module || 'default';
    const logger = getLogger(module);
    logger.warn(message, meta);
  },
  
  /**
   * 记录调试级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  debug(message, meta = {}) {
    const module = meta.module || 'default';
    const logger = getLogger(module);
    logger.debug(message, meta);
  }
};

module.exports = Logger; 