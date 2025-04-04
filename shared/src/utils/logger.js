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
 * 模块配置映射表
 * 用于存储各个模块的日志配置
 * @private
 */
const moduleConfigs = {};

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
      }),
      // 添加API调用日志
      new winston.transports.File({
        filename: path.join(moduleDir, 'api-calls.log'),
        level: 'info',
        format: logFormat,
        maxsize: config.maxSize,
        maxFiles: config.maxFiles,
        tailable: true
      }),
      // 添加合约调用日志
      new winston.transports.File({
        filename: path.join(moduleDir, 'contract-calls.log'),
        level: 'info',
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
    // 获取模块配置或默认配置
    const config = moduleConfigs[moduleName] || Logger.config;
    
    // 创建日志目录
    const absoluteLogDir = createLogDir(config.dir);
    const moduleLogDir = path.join(absoluteLogDir, moduleName);
    
    // 创建传输器
    const transports = [
      ...createFileTransports(moduleLogDir, config)
    ];
    
    // 添加控制台传输器（如果启用）
    if (config.console) {
      transports.push(createConsoleTransport());
    }
    
    // 创建日志记录器
    const logger = winston.createLogger({
      level: config.level,
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
   * 为特定模块配置日志
   * @param {string} moduleName - 模块名称
   * @param {Object} config - 配置对象
   */
  configureModule(moduleName, config = {}) {
    if (!moduleName || typeof moduleName !== 'string') {
      throw new LoggerError('无效的模块名称');
    }
    
    // 验证配置
    if (!isValidLoggerConfig(config)) {
      throw new LoggerError('无效的日志配置');
    }
    
    // 合并配置（模块配置优先于默认配置）
    moduleConfigs[moduleName] = { ...this.config, ...config };
    
    // 如果已经存在此模块的日志实例，则删除以便下次重新创建
    if (loggerInstances[moduleName]) {
      delete loggerInstances[moduleName];
    }
  },
  
  /**
   * 设置默认模块路径
   * @param {string} path - 模块路径
   * @deprecated 使用configure方法并传入模块信息
   */
  setPath(path) {
    if (!path || typeof path !== 'string') {
      throw new LoggerError('无效的模块路径');
    }
    // 为了向后兼容，设置默认模块
    this._defaultModule = path;
  },
  
  /**
   * 记录信息级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  info(message, meta = {}) {
    // 如果设置了默认模块且meta中没有指定模块，使用默认模块
    const module = meta.module || this._defaultModule || 'default';
    const logger = getLogger(module);
    logger.info(message, meta);
  },
  
  /**
   * 记录错误级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  error(message, meta = {}) {
    const module = meta.module || this._defaultModule || 'default';
    const logger = getLogger(module);
    logger.error(message, meta);
  },
  
  /**
   * 记录警告级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  warn(message, meta = {}) {
    const module = meta.module || this._defaultModule || 'default';
    const logger = getLogger(module);
    logger.warn(message, meta);
  },
  
  /**
   * 记录调试级别日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  debug(message, meta = {}) {
    const module = meta.module || this._defaultModule || 'default';
    const logger = getLogger(module);
    logger.debug(message, meta);
  },
  
  /**
   * 记录API调用
   * @param {Object} options - API调用选项
   * @param {string} options.module - 模块名称
   * @param {string} options.interface - 接口名称
   * @param {string} options.method - HTTP方法
   * @param {Object} options.params - 请求参数
   * @param {Object} options.result - 返回结果
   */
  logApiCall(options = {}) {
    const { module = 'api', interface: api, method, params, result, error } = options;
    
    const logger = getLogger(module);
    const logData = {
      type: 'api_call',
      api,
      method,
      params: this._sanitizeParams(params),
      ...(!error ? { result: this._truncateResult(result) } : { error: this._formatError(error) }),
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      logger.error(`API调用失败: ${api}`, logData);
    } else {
      logger.info(`API调用: ${api}`, logData);
    }
  },
  
  /**
   * 记录合约方法调用
   * @param {Object} options - 合约调用选项
   * @param {string} options.module - 模块名称
   * @param {string} options.contractName - 合约名称
   * @param {string} options.contractAddress - 合约地址
   * @param {string} options.method - 方法名称
   * @param {Array} options.args - 方法参数
   * @param {string} options.abiPath - ABI文件路径
   * @param {Object} options.result - 调用结果
   * @param {boolean} options.isWrite - 是否是写操作
   */
  logContractCall(options = {}) {
    const { 
      module = 'contract', 
      contractName, 
      contractAddress, 
      method, 
      args = [], 
      abiPath,
      result, 
      error,
      isWrite = false,
      gasUsed,
      txHash
    } = options;
    
    const logger = getLogger(module);
    const logData = {
      type: 'contract_call',
      contractName,
      contractAddress,
      method,
      args: this._sanitizeParams(args),
      abiPath,
      isWrite,
      ...(!error ? { result: this._truncateResult(result) } : { error: this._formatError(error) }),
      ...(gasUsed ? { gasUsed } : {}),
      ...(txHash ? { txHash } : {}),
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      logger.error(`合约调用失败: ${contractName}.${method}`, logData);
    } else {
      logger.info(`合约调用: ${contractName}.${method}`, logData);
    }
  },
  
  /**
   * 处理敏感参数，避免日志中包含敏感信息
   * @private
   * @param {any} params - 参数对象
   * @returns {any} 处理后的参数
   */
  _sanitizeParams(params) {
    if (!params) return null;
    
    // 对参数进行深拷贝，避免修改原对象
    const sanitized = JSON.parse(JSON.stringify(params));
    
    // 递归处理对象，隐藏敏感字段
    const processSensitiveFields = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      
      const sensitiveFields = ['password', 'privateKey', 'secret', 'token', 'accessToken', 'refreshToken'];
      
      for (const key in obj) {
        // 处理对象字段
        if (obj[key] && typeof obj[key] === 'object') {
          processSensitiveFields(obj[key]);
        } 
        // 处理敏感字段
        else if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '******';
        }
      }
    };
    
    if (Array.isArray(sanitized)) {
      sanitized.forEach(item => {
        if (item && typeof item === 'object') {
          processSensitiveFields(item);
        }
      });
    } else if (typeof sanitized === 'object') {
      processSensitiveFields(sanitized);
    }
    
    return sanitized;
  },
  
  /**
   * 截断过长的结果
   * @private
   * @param {any} result - 结果对象
   * @returns {any} 截断后的结果
   */
  _truncateResult(result) {
    if (result === undefined || result === null) return null;
    
    // 对结果转为JSON字符串
    let resultStr;
    try {
      resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    } catch (e) {
      return `[无法序列化的对象: ${typeof result}]`;
    }
    
    // 截断过长的结果
    const maxLength = 2000;
    if (resultStr.length > maxLength) {
      return resultStr.substring(0, maxLength) + `... [截断，完整长度: ${resultStr.length}]`;
    }
    
    return result;
  },
  
  /**
   * 格式化错误信息
   * @private
   * @param {Error|string} error - 错误对象
   * @returns {Object} 格式化后的错误
   */
  _formatError(error) {
    if (!error) return null;
    
    if (typeof error === 'string') {
      return { message: error };
    }
    
    const formatted = {
      message: error.message || '未知错误',
      ...(error.code ? { code: error.code } : {}),
      ...(error.stack ? { stack: error.stack.split('\n').slice(0, 5).join('\n') } : {}),
    };
    
    // 提取其他自定义字段
    for (const key in error) {
      if (!['message', 'stack', 'name'].includes(key) && typeof error[key] !== 'function') {
        formatted[key] = error[key];
      }
    }
    
    return formatted;
  }
};

module.exports = Logger; 