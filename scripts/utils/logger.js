const fs = require("fs");
const path = require("path");

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// 当前日志级别 - 从环境变量读取
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || "INFO"];

// 日志目录
const LOG_DIR = path.join(__dirname, "../../logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 当前日志文件 - 使用当前日期
const timestamp = new Date().toISOString().split('T')[0];
const LOG_FILE = path.join(LOG_DIR, `deploy-${timestamp}.log`);

// 写入日志
function writeLog(level, category, message) {
  const timestamp = new Date().toISOString();
  const categoryPrefix = category ? `[${category}] ` : '';
  const logMessage = `[${timestamp}] [${level}] ${categoryPrefix}${message}\n`;
  
  // 控制台输出
  if (LOG_LEVELS[level] >= currentLevel) {
    if (level === "ERROR") {
      console.error(logMessage);
    } else if (level === "WARN") {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }
  
  // 写入文件
  fs.appendFileSync(LOG_FILE, logMessage);
}

// 创建基本日志记录器
function createBaseLogger(category = "") {
  return {
    debug: (message) => writeLog("DEBUG", category, message),
    info: (message) => writeLog("INFO", category, message),
    warn: (message) => writeLog("WARN", category, message),
    error: (message) => writeLog("ERROR", category, message)
  };
}

// 创建部署日志记录器 (与原logging.js兼容)
function getLogger(name) {
  const base = createBaseLogger(name);
  
  return {
    ...base,
    deployStart: (networkName) => {
      base.info(`========================================`);
      base.info(`开始部署到网络: ${networkName}`);
      base.info(`时间: ${new Date().toISOString()}`);
      base.info(`========================================`);
    },
    deployComplete: (networkName, contracts) => {
      base.info(`========================================`);
      base.info(`部署到网络 ${networkName} 已完成!`);
      base.info(`时间: ${new Date().toISOString()}`);
      Object.entries(contracts).forEach(([name, address]) => {
        base.info(`${name}: ${address}`);
      });
      base.info(`========================================`);
    }
  };
}

// 默认日志对象 (与原logger.js兼容)
const logger = {
  ...createBaseLogger(),
  
  // 记录部署开始
  deployStart: (network) => {
    writeLog("INFO", null, `========================================`);
    writeLog("INFO", null, `开始部署到网络: ${network}`);
    writeLog("INFO", null, `时间: ${new Date().toISOString()}`);
    writeLog("INFO", null, `========================================`);
  },
  
  // 记录部署完成
  deployComplete: (network, contracts) => {
    writeLog("INFO", null, `========================================`);
    writeLog("INFO", null, `部署完成 - 网络: ${network}`);
    writeLog("INFO", null, `时间: ${new Date().toISOString()}`);
    writeLog("INFO", null, `已部署合约:`);
    Object.entries(contracts).forEach(([name, address]) => {
      writeLog("INFO", null, `  ${name}: ${address}`);
    });
    writeLog("INFO", null, `========================================`);
  }
};

module.exports = { 
  logger, 
  getLogger,
  createBaseLogger
};