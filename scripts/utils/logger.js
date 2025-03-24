const fs = require("fs");
const path = require("path");
const config = require("../config/deploy-config");

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
function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
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

// 日志接口
const logger = {
  debug: (message) => writeLog("DEBUG", message),
  info: (message) => writeLog("INFO", message),
  warn: (message) => writeLog("WARN", message),
  error: (message) => writeLog("ERROR", message),
  
  // 记录部署开始
  deployStart: (network) => {
    writeLog("INFO", `========================================`);
    writeLog("INFO", `开始部署到网络: ${network}`);
    writeLog("INFO", `时间: ${new Date().toISOString()}`);
    writeLog("INFO", `========================================`);
  },
  
  // 记录部署完成
  deployComplete: (network, contracts) => {
    writeLog("INFO", `========================================`);
    writeLog("INFO", `部署完成 - 网络: ${network}`);
    writeLog("INFO", `时间: ${new Date().toISOString()}`);
    writeLog("INFO", `已部署合约:`);
    Object.entries(contracts).forEach(([name, address]) => {
      writeLog("INFO", `  ${name}: ${address}`);
    });
    writeLog("INFO", `========================================`);
  }
};

module.exports = logger;