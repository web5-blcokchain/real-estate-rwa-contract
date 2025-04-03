#!/usr/bin/env node

/**
 * API 日志分析工具
 * 分析请求日志，提取性能指标并生成统计报告
 * 
 * 使用方法：
 * node server/scripts/analyze-logs.js [日志文件路径]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 默认日志路径
const DEFAULT_LOG_PATH = path.join(process.cwd(), 'logs', 'server.log');

// 解析命令行参数
const logFilePath = process.argv[2] || DEFAULT_LOG_PATH;

// 统计数据
const stats = {
  requestCount: 0,
  responseCount: 0,
  errorCount: 0,
  slowRequestCount: 0,
  
  // 按路径分组的统计
  pathStats: {},
  
  // 按状态码分组的统计
  statusCodeStats: {},
  
  // 性能指标
  totalDuration: 0,
  minDuration: Number.MAX_SAFE_INTEGER,
  maxDuration: 0,
  
  // 内存使用
  totalMemoryUsed: 0,
  
  // 响应大小
  totalResponseSize: 0,
  
  // 按时间段分组的请求数量
  timeDistribution: {},
  
  // 请求详情记录
  apiRequests: {},
};

/**
 * API接口信息映射
 * 包含接口地址、请求方式、参数和返回值
 */
const API_INFO = {
  '/api/blockchain/token/property': {
    description: '获取或创建房产代币',
    methods: {
      GET: {
        params: ['tokenId', 'propertyId'],
        returns: '房产代币详情',
        example: {
          tokenId: '123456',
          propertyId: 'prop-789',
          owner: '0x1234...5678',
          value: '100000000',
          createdAt: '2023-01-15T08:30:15Z'
        }
      },
      POST: {
        params: ['propertyId', 'initialValue', 'ownerAddress'],
        returns: '新创建的代币信息',
        example: {
          success: true,
          tokenId: '123456',
          txHash: '0xabcd...1234'
        }
      }
    }
  },
  '/api/blockchain/token/transfer': {
    description: '转移房产代币',
    methods: {
      POST: {
        params: ['tokenId', 'fromAddress', 'toAddress', 'amount'],
        returns: '转移交易结果',
        example: {
          success: true,
          txHash: '0xabcd...1234',
          blockNumber: 12345678
        }
      }
    }
  },
  '/api/blockchain/users/register': {
    description: '注册区块链用户',
    methods: {
      POST: {
        params: ['username', 'email', 'walletAddress'],
        returns: '用户注册结果',
        example: {
          success: true,
          userId: 'user-123',
          walletAddress: '0x1234...5678'
        }
      }
    }
  },
  '/api/contract/execute': {
    description: '执行智能合约方法',
    methods: {
      POST: {
        params: ['contractAddress', 'methodName', 'params', 'senderAddress'],
        returns: '合约执行结果',
        example: {
          success: true,
          txHash: '0xabcd...1234',
          result: {}
        }
      }
    }
  },
  '/api/properties/list': {
    description: '获取房产列表',
    methods: {
      GET: {
        params: ['page', 'limit', 'sortBy', 'sortDir', 'filters'],
        returns: '房产列表和分页信息',
        example: {
          total: 157,
          page: 1,
          limit: 10,
          data: [
            {
              id: 'prop-123',
              address: '东京都港区麻布十番1-2-3',
              price: 150000000,
              size: 85.5,
              tokenized: true
            }
            // ...more properties
          ]
        }
      }
    }
  },
  '/api/properties/detail': {
    description: '获取房产详情',
    methods: {
      GET: {
        params: ['propertyId'],
        returns: '房产详细信息',
        example: {
          id: 'prop-123',
          address: '东京都港区麻布十番1-2-3',
          location: {
            latitude: 35.6543,
            longitude: 139.7362
          },
          price: 150000000,
          size: 85.5,
          rooms: 3,
          built: 2018,
          features: ['电梯', '阳台', '中央空调'],
          tokenId: 'token-456',
          images: ['url1', 'url2', 'url3']
        }
      }
    }
  },
  '/api/transactions/history': {
    description: '获取交易历史',
    methods: {
      GET: {
        params: ['address', 'startDate', 'endDate', 'page', 'limit'],
        returns: '交易历史记录',
        example: {
          total: 35,
          page: 1,
          limit: 10,
          data: [
            {
              txHash: '0xabcd...1234',
              from: '0x1234...5678',
              to: '0x8765...4321',
              value: '5000000',
              timestamp: '2023-02-15T10:30:15Z',
              status: 'confirmed',
              blockNumber: 12345678
            }
            // ...more transactions
          ]
        }
      }
    }
  },
  '/api/users/profile': {
    description: '获取或更新用户资料',
    methods: {
      GET: {
        params: ['userId'],
        returns: '用户资料信息',
        example: {
          userId: 'user-123',
          username: 'satoshi',
          email: 'satoshi@example.com',
          walletAddress: '0x1234...5678',
          joinDate: '2023-01-01T00:00:00Z',
          holdings: [
            {
              tokenId: 'token-456',
              propertyId: 'prop-123',
              amount: '5000000'
            }
          ]
        }
      },
      PUT: {
        params: ['userId', 'username', 'email', 'profileData'],
        returns: '更新后的用户资料',
        example: {
          success: true,
          userId: 'user-123',
          updated: ['email', 'username']
        }
      }
    }
  },
  '/api/health': {
    description: '系统健康状态检查',
    methods: {
      GET: {
        params: [],
        returns: '系统状态信息',
        example: {
          status: 'healthy',
          version: '1.2.3',
          uptime: 1234567,
          connections: {
            database: 'connected',
            blockchain: 'connected',
            cache: 'connected'
          }
        }
      }
    }
  },
  '/api/version': {
    description: '获取系统版本信息',
    methods: {
      GET: {
        params: [],
        returns: '系统版本详情',
        example: {
          version: '1.2.3',
          buildDate: '2023-03-15T00:00:00Z',
          environment: 'production',
          apiVersion: 'v1'
        }
      }
    }
  }
};

/**
 * 解析日志行
 * @param {string} line - 日志行
 */
async function parseLine(line) {
  try {
    // 尝试解析 JSON
    const logEntry = JSON.parse(line);
    
    // 如果不是 HTTP 请求日志，跳过
    if (!logEntry.message || !logEntry.message.startsWith('HTTP')) {
      return;
    }
    
    // 检查是请求还是响应
    if (logEntry.message.match(/^HTTP (GET|POST|PUT|DELETE|PATCH)/i)) {
      // 这是请求日志
      stats.requestCount++;
      
      const { method, path, requestId } = logEntry;
      
      // 记录API请求信息
      if (!stats.apiRequests[path]) {
        stats.apiRequests[path] = {
          methods: new Set(),
          requests: []
        };
      }
      
      stats.apiRequests[path].methods.add(method);
      stats.apiRequests[path].requests.push({
        requestId,
        method,
        timestamp: logEntry.timestamp,
        params: { ...logEntry.params, ...logEntry.query }
      });
      
      // 如果有时间戳，记录时间分布
      if (logEntry.timestamp) {
        const hour = new Date(logEntry.timestamp).getHours();
        stats.timeDistribution[hour] = (stats.timeDistribution[hour] || 0) + 1;
      }
      
    } else if (logEntry.message.match(/^HTTP \d+/)) {
      // 这是响应日志
      stats.responseCount++;
      
      const { method, path, status, duration, memoryDiff, responseSizeBytes, requestId } = logEntry;
      
      // 按路径分组统计
      if (!stats.pathStats[path]) {
        stats.pathStats[path] = {
          count: 0,
          totalDuration: 0,
          minDuration: Number.MAX_SAFE_INTEGER,
          maxDuration: 0,
          statusCodes: {}
        };
      }
      
      const pathStat = stats.pathStats[path];
      pathStat.count++;
      pathStat.totalDuration += duration;
      pathStat.minDuration = Math.min(pathStat.minDuration, duration);
      pathStat.maxDuration = Math.max(pathStat.maxDuration, duration);
      
      // 记录状态码
      pathStat.statusCodes[status] = (pathStat.statusCodes[status] || 0) + 1;
      
      // 按状态码分组统计
      stats.statusCodeStats[status] = (stats.statusCodeStats[status] || 0) + 1;
      
      // 记录全局性能指标
      stats.totalDuration += duration;
      stats.minDuration = Math.min(stats.minDuration, duration);
      stats.maxDuration = Math.max(stats.maxDuration, duration);
      
      // 记录内存使用
      if (memoryDiff && memoryDiff.heapUsed) {
        stats.totalMemoryUsed += memoryDiff.heapUsed;
      }
      
      // 记录响应大小
      if (responseSizeBytes) {
        stats.totalResponseSize += responseSizeBytes;
      }
      
      // 错误响应
      if (status >= 400) {
        stats.errorCount++;
      }
      
      // 找到对应的请求记录并添加响应信息
      if (stats.apiRequests[path]) {
        const requestIndex = stats.apiRequests[path].requests.findIndex(req => req.requestId === requestId);
        if (requestIndex !== -1) {
          stats.apiRequests[path].requests[requestIndex].response = {
            status,
            duration,
            size: responseSizeBytes
          };
        }
      }
    } else if (logEntry.message.startsWith('慢请求:')) {
      // 慢请求日志
      stats.slowRequestCount++;
    }
  } catch (error) {
    // 忽略非 JSON 日志行
  }
}

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 主函数
 */
async function main() {
  console.log(`API 日志分析工具`);
  console.log(`分析日志文件: ${logFilePath}`);
  
  try {
    // 检查日志文件是否存在
    if (!fs.existsSync(logFilePath)) {
      console.error(`错误: 日志文件 "${logFilePath}" 不存在`);
      process.exit(1);
    }
    
    // 创建逐行读取接口
    const fileStream = fs.createReadStream(logFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    // 逐行处理日志
    for await (const line of rl) {
      await parseLine(line);
    }
    
    // 生成报告
    generateReport();
    
    // 可选：输出API接口详情文档
    if (process.argv.includes('--api-docs')) {
      generateApiDocs();
    }
  } catch (error) {
    console.error(`分析日志时出错: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 生成统计报告
 */
function generateReport() {
  console.log('\n===== API 请求统计报告 =====\n');
  
  // 基本指标
  console.log('基本指标:');
  console.log(`总请求数: ${stats.requestCount}`);
  console.log(`总响应数: ${stats.responseCount}`);
  console.log(`错误响应数: ${stats.errorCount} (${((stats.errorCount / stats.responseCount) * 100).toFixed(2)}%)`);
  console.log(`慢请求数: ${stats.slowRequestCount}`);
  
  // 性能指标
  if (stats.responseCount > 0) {
    console.log('\n性能指标:');
    console.log(`平均响应时间: ${(stats.totalDuration / stats.responseCount).toFixed(2)}ms`);
    console.log(`最小响应时间: ${stats.minDuration}ms`);
    console.log(`最大响应时间: ${stats.maxDuration}ms`);
    console.log(`平均内存消耗: ${(stats.totalMemoryUsed / stats.responseCount).toFixed(2)}MB`);
    console.log(`总响应大小: ${formatBytes(stats.totalResponseSize)}`);
    console.log(`平均响应大小: ${formatBytes(stats.totalResponseSize / stats.responseCount)}`);
  }
  
  // 按状态码统计
  console.log('\n状态码分布:');
  const statusCodes = Object.keys(stats.statusCodeStats).sort();
  for (const code of statusCodes) {
    const count = stats.statusCodeStats[code];
    const percentage = ((count / stats.responseCount) * 100).toFixed(2);
    console.log(`  ${code}: ${count} (${percentage}%)`);
  }
  
  // 按路径统计 - 仅展示前10个最常访问的路径
  console.log('\n路径分布 (前10个):');
  const sortedPaths = Object.keys(stats.pathStats)
    .sort((a, b) => stats.pathStats[b].count - stats.pathStats[a].count)
    .slice(0, 10);
  
  for (const path of sortedPaths) {
    const { count, totalDuration, minDuration, maxDuration, statusCodes } = stats.pathStats[path];
    const avgDuration = (totalDuration / count).toFixed(2);
    const percentage = ((count / stats.responseCount) * 100).toFixed(2);
    
    console.log(`\n  ${path}:`);
    
    // 如果有API信息，显示描述
    if (API_INFO[path]) {
      console.log(`    描述: ${API_INFO[path].description}`);
    }
    
    console.log(`    请求数: ${count} (${percentage}%)`);
    console.log(`    平均响应时间: ${avgDuration}ms`);
    console.log(`    响应时间范围: ${minDuration}ms - ${maxDuration}ms`);
    
    // 显示使用的HTTP方法
    if (stats.apiRequests[path]) {
      const methods = Array.from(stats.apiRequests[path].methods).join(', ');
      console.log(`    HTTP方法: ${methods}`);
    }
    
    // 显示状态码分布
    const codes = Object.keys(statusCodes).sort();
    if (codes.length > 0) {
      console.log('    状态码:');
      for (const code of codes) {
        const codeCount = statusCodes[code];
        const codePercent = ((codeCount / count) * 100).toFixed(2);
        console.log(`      ${code}: ${codeCount} (${codePercent}%)`);
      }
    }
  }
  
  // 时间分布
  console.log('\n请求时间分布:');
  const hours = Array.from({ length: 24 }, (_, i) => i);
  for (const hour of hours) {
    const count = stats.timeDistribution[hour] || 0;
    const percentage = stats.requestCount > 0 ? ((count / stats.requestCount) * 100).toFixed(2) : '0.00';
    const bar = '#'.repeat(Math.ceil(percentage / 2));
    console.log(`  ${hour.toString().padStart(2, '0')}:00-${hour.toString().padStart(2, '0')}:59: ${count.toString().padStart(5)} (${percentage.padStart(5)}%) ${bar}`);
  }
  
  console.log('\n===== 报告结束 =====');
}

/**
 * 生成API接口文档
 */
function generateApiDocs() {
  console.log('\n===== API 接口文档 =====\n');
  
  for (const [path, info] of Object.entries(API_INFO)) {
    console.log(`## ${path}`);
    console.log(`描述: ${info.description}`);
    
    for (const [method, methodInfo] of Object.entries(info.methods)) {
      console.log(`\n### ${method}`);
      
      console.log('参数:');
      if (methodInfo.params.length === 0) {
        console.log('- 无参数');
      } else {
        for (const param of methodInfo.params) {
          console.log(`- ${param}`);
        }
      }
      
      console.log(`\n返回值: ${methodInfo.returns}`);
      
      if (methodInfo.example) {
        console.log('\n示例响应:');
        console.log('```json');
        console.log(JSON.stringify(methodInfo.example, null, 2));
        console.log('```');
      }
      
      console.log('---');
    }
    
    console.log('\n');
  }
  
  console.log('===== API 文档结束 =====');
}

// 执行主函数
main().catch(error => {
  console.error(`执行分析脚本时出错: ${error.message}`);
  process.exit(1);
}); 