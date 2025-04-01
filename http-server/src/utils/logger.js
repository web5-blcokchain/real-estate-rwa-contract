/**
 * 简单日志模块
 */

// 日志级别
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// 获取当前时间戳
const getTimestamp = () => {
  return new Date().toISOString();
};

// 格式化日志消息
const formatMessage = (level, message, ...args) => {
  const timestamp = getTimestamp();
  const formattedArgs = args.length > 0 ? args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg);
    }
    return arg;
  }).join(' ') : '';
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${formattedArgs}`;
};

// 创建日志对象
const logger = {
  error: (message, ...args) => {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, ...args));
  },
  
  warn: (message, ...args) => {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, ...args));
  },
  
  info: (message, ...args) => {
    console.info(formatMessage(LOG_LEVELS.INFO, message, ...args));
  },
  
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage(LOG_LEVELS.DEBUG, message, ...args));
    }
  }
};

export default logger; 