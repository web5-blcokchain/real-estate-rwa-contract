/**
 * API性能测试脚本
 * 
 * 用于测试API在不同负载下的性能表现
 * 支持并发测试、压力测试和持久性测试
 * 
 * 使用方法:
 * node performance-test.js --mode=stress --endpoint=/api/v1/tokens --concurrency=50 --duration=60
 */

const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const path = require('path');
const { table } = require('table');
const { performance } = require('perf_hooks');

// 命令行参数
const argv = yargs(hideBin(process.argv))
  .option('mode', {
    alias: 'm',
    type: 'string',
    description: '测试模式: concurrent, stress, endurance',
    choices: ['concurrent', 'stress', 'endurance'],
    default: 'concurrent'
  })
  .option('endpoint', {
    alias: 'e',
    type: 'string',
    description: '测试的API端点',
    default: '/api/v1/health'
  })
  .option('method', {
    alias: 'X',
    type: 'string',
    description: 'HTTP方法',
    choices: ['GET', 'POST', 'PUT', 'DELETE'],
    default: 'GET'
  })
  .option('data', {
    alias: 'd',
    type: 'string',
    description: 'POST/PUT请求的数据文件路径',
    default: ''
  })
  .option('concurrency', {
    alias: 'c',
    type: 'number',
    description: '并发请求数',
    default: 10
  })
  .option('requests', {
    alias: 'n',
    type: 'number',
    description: '总请求数',
    default: 100
  })
  .option('duration', {
    alias: 't',
    type: 'number',
    description: '测试持续时间（秒）',
    default: 30
  })
  .option('interval', {
    alias: 'i',
    type: 'number',
    description: '请求间隔（毫秒）',
    default: 0
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: '输出文件路径',
    default: ''
  })
  .option('baseUrl', {
    alias: 'u',
    type: 'string',
    description: '基础URL',
    default: 'http://localhost:3000'
  })
  .option('headers', {
    alias: 'H',
    type: 'string',
    description: '请求头JSON文件路径',
    default: ''
  })
  .help()
  .alias('help', 'h')
  .argv;

// 测试结果
const results = {
  successful: 0,
  failed: 0,
  totalRequests: 0,
  totalDuration: 0,
  minResponseTime: Number.MAX_SAFE_INTEGER,
  maxResponseTime: 0,
  responseTimes: [],
  errors: {}
};

// 加载请求头
let headers = {};
if (argv.headers) {
  try {
    const headersData = fs.readFileSync(argv.headers, 'utf8');
    headers = JSON.parse(headersData);
    console.log(`已加载请求头: ${Object.keys(headers).join(', ')}`);
  } catch (error) {
    console.error(`加载请求头失败: ${error.message}`);
    process.exit(1);
  }
}

// 加载请求数据
let requestData = null;
if (argv.data && (argv.method === 'POST' || argv.method === 'PUT')) {
  try {
    const dataContent = fs.readFileSync(argv.data, 'utf8');
    requestData = JSON.parse(dataContent);
    console.log(`已加载请求数据: ${JSON.stringify(requestData).substring(0, 100)}...`);
  } catch (error) {
    console.error(`加载请求数据失败: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 发送单个请求并记录结果
 */
async function sendRequest() {
  const startTime = performance.now();
  try {
    const response = await axios({
      method: argv.method,
      url: `${argv.baseUrl}${argv.endpoint}`,
      data: requestData,
      headers,
      timeout: 30000 // 30秒超时
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    results.successful++;
    results.totalDuration += duration;
    results.minResponseTime = Math.min(results.minResponseTime, duration);
    results.maxResponseTime = Math.max(results.maxResponseTime, duration);
    results.responseTimes.push(duration);

    return {
      success: true,
      duration,
      status: response.status
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    results.failed++;
    results.totalDuration += duration;
    results.responseTimes.push(duration);

    const errorCode = error.response ? error.response.status : 'network';
    results.errors[errorCode] = (results.errors[errorCode] || 0) + 1;

    return {
      success: false,
      duration,
      error: error.message,
      status: error.response ? error.response.status : 'network_error'
    };
  } finally {
    results.totalRequests++;
  }
}

/**
 * 并发模式测试
 * 同时发送指定数量的请求，完成后结束测试
 */
async function runConcurrentTest() {
  console.log(`开始并发测试: ${argv.concurrency} 并发 x ${argv.requests} 请求`);
  console.log(`目标: ${argv.method} ${argv.baseUrl}${argv.endpoint}`);

  const startTime = performance.now();
  const totalBatches = Math.ceil(argv.requests / argv.concurrency);

  for (let batch = 0; batch < totalBatches; batch++) {
    const remainingRequests = argv.requests - batch * argv.concurrency;
    const batchSize = Math.min(argv.concurrency, remainingRequests);
    
    console.log(`批次 ${batch + 1}/${totalBatches}: 发送 ${batchSize} 请求`);
    
    const promises = Array(batchSize).fill().map(() => sendRequest());
    await Promise.all(promises);
    
    if (argv.interval > 0 && batch < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, argv.interval));
    }
  }

  const endTime = performance.now();
  const totalTestDuration = (endTime - startTime) / 1000; // 秒
  
  printResults(totalTestDuration);
}

/**
 * 压力测试模式
 * 在指定的持续时间内尽可能多地发送并发请求
 */
async function runStressTest() {
  console.log(`开始压力测试: ${argv.concurrency} 并发请求，持续 ${argv.duration} 秒`);
  console.log(`目标: ${argv.method} ${argv.baseUrl}${argv.endpoint}`);

  const startTime = performance.now();
  const endTime = startTime + (argv.duration * 1000);
  
  // 创建工作线程池
  const workers = Array(argv.concurrency).fill().map(async (_, index) => {
    while (performance.now() < endTime) {
      await sendRequest();
      
      if (argv.interval > 0) {
        await new Promise(resolve => setTimeout(resolve, argv.interval));
      }
    }
  });
  
  await Promise.all(workers);
  
  const totalTestDuration = argv.duration; // 秒
  printResults(totalTestDuration);
}

/**
 * 持久性测试模式
 * 发送固定数量的请求，但控制速率，模拟长时间运行
 */
async function runEnduranceTest() {
  console.log(`开始持久性测试: 总共 ${argv.requests} 请求，${argv.concurrency} 并发`);
  console.log(`目标: ${argv.method} ${argv.baseUrl}${argv.endpoint}`);

  const startTime = performance.now();
  const requestsPerBatch = argv.concurrency;
  const totalBatches = Math.ceil(argv.requests / requestsPerBatch);
  const intervalBetweenBatches = 
    Math.max(1000, Math.floor((argv.duration * 1000) / totalBatches));
  
  console.log(`将在 ${argv.duration} 秒内分 ${totalBatches} 批次发送请求`);
  console.log(`批次间隔: ${intervalBetweenBatches}ms`);
  
  for (let batch = 0; batch < totalBatches; batch++) {
    const remainingRequests = argv.requests - batch * requestsPerBatch;
    const batchSize = Math.min(requestsPerBatch, remainingRequests);
    
    const batchStart = performance.now();
    console.log(`批次 ${batch + 1}/${totalBatches}: 发送 ${batchSize} 请求`);
    
    const promises = Array(batchSize).fill().map(() => sendRequest());
    await Promise.all(promises);
    
    const batchEnd = performance.now();
    const batchDuration = batchEnd - batchStart;
    
    // 等待直到满足间隔时间
    if (batch < totalBatches - 1) {
      const waitTime = Math.max(0, intervalBetweenBatches - batchDuration);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  const testEndTime = performance.now();
  const totalTestDuration = (testEndTime - startTime) / 1000; // 秒
  
  printResults(totalTestDuration);
}

/**
 * 打印测试结果
 */
function printResults(totalTestDuration) {
  // 计算统计数据
  const avgResponseTime = results.totalRequests > 0
    ? results.totalDuration / results.totalRequests
    : 0;
  
  // 计算标准差
  let stdDeviation = 0;
  if (results.responseTimes.length > 0) {
    const squaredDifferences = results.responseTimes.map(time => {
      const diff = time - avgResponseTime;
      return diff * diff;
    });
    const variance = squaredDifferences.reduce((sum, squared) => sum + squared, 0) / results.responseTimes.length;
    stdDeviation = Math.sqrt(variance);
  }
  
  // 计算百分位
  const sortedTimes = [...results.responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  
  // 计算每秒请求数
  const requestsPerSecond = results.totalRequests / totalTestDuration;
  
  // 准备表格数据
  const summaryData = [
    ['指标', '值'],
    ['总请求数', results.totalRequests],
    ['成功请求', results.successful],
    ['失败请求', results.failed],
    ['测试持续时间', `${totalTestDuration.toFixed(2)} 秒`],
    ['每秒请求数 (RPS)', requestsPerSecond.toFixed(2)],
    ['平均响应时间', `${avgResponseTime.toFixed(2)} ms`],
    ['最小响应时间', `${(results.minResponseTime === Number.MAX_SAFE_INTEGER ? 0 : results.minResponseTime).toFixed(2)} ms`],
    ['最大响应时间', `${results.maxResponseTime.toFixed(2)} ms`],
    ['标准差', `${stdDeviation.toFixed(2)} ms`],
    ['中位数 (P50)', `${p50.toFixed(2)} ms`],
    ['P90 响应时间', `${p90.toFixed(2)} ms`],
    ['P95 响应时间', `${p95.toFixed(2)} ms`],
    ['P99 响应时间', `${p99.toFixed(2)} ms`]
  ];
  
  // 错误细分
  const errorData = Object.entries(results.errors).map(([code, count]) => {
    return [`错误代码 ${code}`, count];
  });
  
  if (errorData.length > 0) {
    summaryData.push(['', '']);
    summaryData.push(['错误细分', '']);
    summaryData.push(...errorData);
  }
  
  // 生成表格输出
  console.log('\n测试结果摘要:');
  console.log(table(summaryData));
  
  // 如果需要，保存到文件
  if (argv.output) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const outputFilename = path.resolve(argv.output, `perf-test-${timestamp}.json`);
    
    const outputData = {
      config: {
        mode: argv.mode,
        endpoint: argv.endpoint,
        method: argv.method,
        concurrency: argv.concurrency,
        requests: argv.requests,
        duration: argv.duration,
        interval: argv.interval,
        baseUrl: argv.baseUrl
      },
      results: {
        totalRequests: results.totalRequests,
        successful: results.successful,
        failed: results.failed,
        totalDuration: totalTestDuration,
        avgResponseTime,
        minResponseTime: results.minResponseTime === Number.MAX_SAFE_INTEGER ? 0 : results.minResponseTime,
        maxResponseTime: results.maxResponseTime,
        stdDeviation,
        percentiles: {
          p50, p90, p95, p99
        },
        requestsPerSecond,
        errors: results.errors
      },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(outputFilename, JSON.stringify(outputData, null, 2));
    console.log(`测试结果已保存到: ${outputFilename}`);
  }
}

// 根据模式运行不同的测试
async function runTest() {
  try {
    switch (argv.mode) {
      case 'concurrent':
        await runConcurrentTest();
        break;
      case 'stress':
        await runStressTest();
        break;
      case 'endurance':
        await runEnduranceTest();
        break;
      default:
        console.error(`未知的测试模式: ${argv.mode}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`测试执行失败: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// 启动测试
runTest(); 