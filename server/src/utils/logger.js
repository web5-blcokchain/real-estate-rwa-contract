const path = require('path');
const winston = require('winston');

// 从环境变量获取配置
const logLevel = process.env.LOG_LEVEL || 'info';
const environment = process.env.NODE_ENV || 'development';

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message} ${stack ? '\n' + stack : ''}`;
  })
);

// 创建日志目录
const logDir = path.join(process.cwd(), 'logs');

// 创建Winston日志记录器
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'japan-rwa-backend' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // 记录所有级别的日志到日志文件
    new winston.transports.File({ 
      filename: path.join(logDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 记录错误级别的日志到单独的文件
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// 在非生产环境中，增加详细信息
if (environment !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  }));
}

// 添加HTTP日志方法，专门用于记录HTTP请求
logger.http = (message) => {
  return logger.info(`[HTTP] ${message}`);
};

// 添加用于追踪成功交易的方法
logger.txSuccess = (txHash, message) => {
  return logger.info(`[TX:${txHash}] ${message}`);
};

// 添加用于追踪失败交易的方法
logger.txError = (txHash, message, error) => {
  return logger.error(`[TX:${txHash}] ${message}`, error);
};

// 添加用于角色操作的方法
logger.roleAction = (role, address, action) => {
  return logger.info(`[ROLE:${role}] ${address} ${action}`);
};

// 导出日志记录器
module.exports = logger; 