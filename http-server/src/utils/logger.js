/**
 * 日志模块 - 使用shared中的日志功能
 */

const path = require('path');
const sharedPath = path.resolve(__dirname, '../../../shared/src');

// 导入shared的日志模块
const { logger: sharedLogger } = require(`${sharedPath}/logger`);

// 扩展shared的日志模块，添加HTTP服务器特定的功能
const logger = {
  error: (message, ...args) => {
    sharedLogger.error(`[HTTP] ${message}`, ...args);
  },
  
  warn: (message, ...args) => {
    sharedLogger.warn(`[HTTP] ${message}`, ...args);
  },
  
  info: (message, ...args) => {
    sharedLogger.info(`[HTTP] ${message}`, ...args);
  },
  
  debug: (message, ...args) => {
    sharedLogger.debug(`[HTTP] ${message}`, ...args);
  },
  
  // HTTP特定的日志方法
  request: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
      
      if (res.statusCode >= 500) {
        logger.error(message);
      } else if (res.statusCode >= 400) {
        logger.warn(message);
      } else {
        logger.info(message);
      }
    });
    
    next();
  }
};

module.exports = logger; 