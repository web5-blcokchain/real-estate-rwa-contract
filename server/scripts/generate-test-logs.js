#!/usr/bin/env node

/**
 * 测试日志生成工具
 * 生成测试日志数据，以便测试日志分析脚本
 * 
 * 使用方法：
 * node server/scripts/generate-test-logs.js [生成的日志数量] [输出文件路径]
 */

const fs = require('fs');
const path = require('path');

// 默认设置
const DEFAULT_LOG_COUNT = 1000;
const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), 'logs', 'test-server.log');

// 解析命令行参数
const logCount = parseInt(process.argv[2], 10) || DEFAULT_LOG_COUNT;
const outputPath = process.argv[3] || DEFAULT_OUTPUT_PATH;

// 创建目录（如果不存在）
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// API端点列表
const endpoints = [
  '/api/blockchain/token/property',
  '/api/blockchain/token/transfer',
  '/api/blockchain/users/register',
  '/api/contract/execute',
  '/api/properties/list',
  '/api/properties/detail',
  '/api/transactions/history',
  '/api/users/profile',
  '/api/health',
  '/api/version'
];

// HTTP方法
const methods = ['GET', 'POST', 'PUT', 'DELETE'];

// 状态码及其权重（较常见的状态码出现概率更高）
const statusCodes = {
  200: 70,  // 正常响应, 70%的概率
  201: 10,  // 创建成功, 10%的概率
  400: 8,   // 客户端错误, 8%的概率
  401: 3,   // 未授权, 3%的概率
  403: 3,   // 禁止访问, 3%的概率
  404: 3,   // 未找到, 3%的概率
  500: 3    // 服务器错误, 3%的概率
};

/**
 * 根据权重随机选择状态码
 * @returns {number} 状态码
 */
function getRandomStatusCode() {
  const totalWeight = Object.values(statusCodes).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [code, weight] of Object.entries(statusCodes)) {
    random -= weight;
    if (random <= 0) {
      return parseInt(code, 10);
    }
  }
  
  return 200; // 默认
}

/**
 * 生成随机整数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机整数
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机IP地址
 * @returns {string} IP地址
 */
function getRandomIP() {
  return `${getRandomInt(1, 255)}.${getRandomInt(1, 255)}.${getRandomInt(1, 255)}.${getRandomInt(1, 255)}`;
}

/**
 * 生成随机日期（在过去7天内）
 * @returns {Date} 随机日期
 */
function getRandomDate() {
  const now = new Date();
  const pastDays = getRandomInt(0, 7);
  const pastHours = getRandomInt(0, 23);
  const pastMinutes = getRandomInt(0, 59);
  const pastSeconds = getRandomInt(0, 59);
  
  return new Date(
    now.getTime() - 
    (pastDays * 24 * 60 * 60 * 1000) - 
    (pastHours * 60 * 60 * 1000) - 
    (pastMinutes * 60 * 1000) - 
    (pastSeconds * 1000)
  );
}

/**
 * 生成随机请求日志
 * @returns {object} 请求日志对象
 */
function generateRequestLog() {
  const method = methods[getRandomInt(0, methods.length - 1)];
  const path = endpoints[getRandomInt(0, endpoints.length - 1)];
  const timestamp = getRandomDate().toISOString();
  const clientIP = getRandomIP();
  
  return {
    level: 'info',
    timestamp,
    message: `HTTP ${method} ${path}`,
    method,
    path,
    clientIP,
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; TestClient/1.0)',
      'content-type': method === 'GET' ? undefined : 'application/json',
      'authorization': getRandomInt(1, 10) <= 8 ? 'Bearer test-token-123' : undefined
    },
    requestId: `req-${Date.now()}-${getRandomInt(1000, 9999)}`
  };
}

/**
 * 生成随机响应日志
 * @param {object} requestLog - 请求日志对象
 * @returns {object} 响应日志对象
 */
function generateResponseLog(requestLog) {
  const { method, path, requestId, timestamp } = requestLog;
  const status = getRandomStatusCode();
  
  // 根据不同的端点和方法生成不同范围的响应时间
  let durationBase = 50; // 基础响应时间
  
  // 特定端点可能需要更长的处理时间
  if (path.includes('/token/') || path.includes('/contract/execute')) {
    durationBase = 200;
  } else if (path.includes('/properties/list')) {
    durationBase = 150;
  }
  
  // POST和PUT请求通常比GET请求慢
  if (method === 'POST' || method === 'PUT') {
    durationBase += 50;
  }
  
  // 随机波动因子
  const durationVariance = durationBase * 0.5;
  
  // 最终响应时间
  const duration = durationBase + getRandomInt(-durationVariance, durationVariance * 2);
  
  // 随机生成响应大小
  let responseSizeBytes;
  if (path.includes('/list')) {
    responseSizeBytes = getRandomInt(10000, 100000);
  } else if (path.includes('/detail') || path.includes('/profile')) {
    responseSizeBytes = getRandomInt(5000, 15000);
  } else {
    responseSizeBytes = getRandomInt(500, 5000);
  }
  
  // 随机生成内存使用情况
  const memoryDiff = {
    rss: getRandomInt(100000, 1000000),
    heapTotal: getRandomInt(50000, 500000),
    heapUsed: getRandomInt(10000, 100000),
    external: getRandomInt(5000, 50000)
  };
  
  return {
    level: status >= 400 ? 'error' : 'info',
    timestamp: new Date(new Date(timestamp).getTime() + duration).toISOString(),
    message: `HTTP ${status} ${method} ${path}`,
    method,
    path,
    status,
    duration,
    memoryDiff,
    responseSizeBytes,
    requestId
  };
}

/**
 * 生成慢请求日志
 * @param {object} requestLog - 请求日志对象
 * @returns {object} 慢请求日志对象
 */
function generateSlowRequestLog(requestLog, responseLog) {
  const { method, path, requestId } = requestLog;
  const { duration } = responseLog;
  
  return {
    level: 'warn',
    timestamp: responseLog.timestamp,
    message: `慢请求: ${method} ${path} 耗时 ${duration}ms`,
    method,
    path,
    duration,
    requestId,
    threshold: 500
  };
}

/**
 * 生成系统日志
 * @returns {object} 系统日志对象
 */
function generateSystemLog() {
  const actions = [
    '服务启动',
    '配置加载完成',
    '数据库连接成功',
    '缓存服务连接成功',
    '后台任务执行',
    '内存使用率警告',
    'CPU使用率警告',
    '磁盘空间警告',
    '配置更新',
    '服务关闭'
  ];
  
  const action = actions[getRandomInt(0, actions.length - 1)];
  const level = action.includes('警告') ? 'warn' : 'info';
  
  return {
    level,
    timestamp: getRandomDate().toISOString(),
    message: `系统: ${action}`,
    details: {
      memoryUsage: action.includes('内存') ? getRandomInt(70, 95) : undefined,
      cpuUsage: action.includes('CPU') ? getRandomInt(70, 95) : undefined,
      diskSpace: action.includes('磁盘') ? getRandomInt(80, 95) : undefined
    }
  };
}

/**
 * 主函数
 */
async function main() {
  console.log(`测试日志生成工具`);
  console.log(`生成 ${logCount} 条日志记录到: ${outputPath}`);
  
  try {
    const logStream = fs.createWriteStream(outputPath);
    
    // 生成系统启动日志
    const startupLog = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message: '系统: 服务启动',
      details: {
        version: '1.0.0',
        environment: 'testing',
        nodeVersion: process.version
      }
    };
    
    logStream.write(JSON.stringify(startupLog) + '\n');
    
    // 生成请求和响应日志
    let slowRequestCount = 0;
    const maxSlowRequests = Math.floor(logCount * 0.05); // 约5%的请求是慢请求
    
    for (let i = 0; i < logCount; i++) {
      // 有10%的概率生成系统日志，而不是请求-响应日志
      if (Math.random() < 0.1) {
        const systemLog = generateSystemLog();
        logStream.write(JSON.stringify(systemLog) + '\n');
        continue;
      }
      
      // 生成请求-响应对
      const requestLog = generateRequestLog();
      logStream.write(JSON.stringify(requestLog) + '\n');
      
      const responseLog = generateResponseLog(requestLog);
      logStream.write(JSON.stringify(responseLog) + '\n');
      
      // 对于少量的慢请求，生成慢请求日志
      if (responseLog.duration > 500 && slowRequestCount < maxSlowRequests) {
        const slowLog = generateSlowRequestLog(requestLog, responseLog);
        logStream.write(JSON.stringify(slowLog) + '\n');
        slowRequestCount++;
      }
    }
    
    // 生成系统关闭日志
    const shutdownLog = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message: '系统: 服务关闭',
      details: {
        uptime: getRandomInt(3600, 86400), // 1小时到1天的运行时间
        reason: 'test-completion'
      }
    };
    
    logStream.write(JSON.stringify(shutdownLog) + '\n');
    
    logStream.end();
    
    console.log(`成功生成 ${logCount} 条日志记录!`);
    console.log(`慢请求日志数: ${slowRequestCount}`);
  } catch (error) {
    console.error(`生成日志时出错: ${error.message}`);
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  console.error(`执行生成脚本时出错: ${error.message}`);
  process.exit(1);
}); 