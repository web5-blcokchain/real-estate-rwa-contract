/**
 * HTTP API测试工具
 * 用于直接测试API接口，显示请求和响应信息
 * 不使用测试框架，直接使用fetch调用API
 */

const fetch = require('node-fetch');
require('dotenv').config();

// 配置参数
const getBaseUrl = () => {
  // 优先使用API_BASE_URL和API_BASE_PORT组合
  const baseUrl = process.env.API_BASE_URL || 'http://localhost';
  const basePort = process.env.API_BASE_PORT || process.env.PORT || '3000';
  
  try {
    // 尝试解析API_BASE_URL，如果它已经包含端口则使用其本身
    const url = new URL(baseUrl);
    // 如果URL中没有指定端口，则使用API_BASE_PORT
    if (!url.port && basePort) {
      url.port = basePort;
    }
    return url.toString().replace(/\/$/, ''); // 移除尾部斜杠
  } catch (e) {
    // 如果URL无效，则直接组合使用
    return `${baseUrl}:${basePort}`;
  }
};

const BASE_URL = getBaseUrl();
const API_KEY = process.env.API_KEY || 'test_api_key';
const API_VERSION = process.env.API_VERSION || 'v1';

/**
 * 格式化输出
 */
const logger = {
  info: (message) => console.log(`\x1b[36m[INFO]\x1b[0m ${message}`),
  success: (message) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`),
  error: (message) => console.log(`\x1b[31m[ERROR]\x1b[0m ${message}`),
  warn: (message) => console.log(`\x1b[33m[WARN]\x1b[0m ${message}`),
  request: (method, url) => console.log(`\x1b[35m[REQUEST]\x1b[0m ${method} ${url}`),
  response: (status, message) => {
    const color = status >= 200 && status < 300 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}[RESPONSE ${status}]\x1b[0m ${message}`);
  },
  json: (obj) => console.log(JSON.stringify(obj, null, 2)),
  divider: () => console.log('\x1b[90m' + '-'.repeat(80) + '\x1b[0m')
};

/**
 * API调用封装
 * @param {string} endpoint - API端点
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} - 响应数据
 */
async function callApi(endpoint, options = {}) {
  // 构建URL
  const apiPath = `/api/${API_VERSION}`;
  const fullEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // 选项处理
  const useApiPath = options.useApiPath !== false; // 默认使用API路径前缀
  const pathPrefix = useApiPath ? apiPath : '';
  
  // 完整URL
  const url = `${BASE_URL}${pathPrefix}${fullEndpoint}${fullEndpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
  
  // 请求选项
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  // 合并选项，并删除自定义选项
  const fetchOptions = { ...defaultOptions, ...options };
  delete fetchOptions.useApiPath;
  
  if (fetchOptions.body && typeof fetchOptions.body === 'object') {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  logger.request(fetchOptions.method, url);
  
  if (fetchOptions.body) {
    logger.info('Request Body:');
    logger.json(JSON.parse(fetchOptions.body));
  }
  
  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    logger.response(response.status, response.statusText);
    
    if (typeof responseData === 'object') {
      logger.info('Response Data:');
      logger.json(responseData);
    } else {
      logger.info('Response Text:');
      console.log(responseData);
    }
    
    return { status: response.status, data: responseData };
  } catch (error) {
    logger.error(`Request Failed: ${error.message}`);
    throw error;
  }
}

/**
 * 测试健康检查API（不需要API路径前缀）
 */
async function testHealth() {
  logger.info('测试健康检查API');
  await callApi('/health', { useApiPath: false });
  logger.divider();
}

/**
 * 测试系统状态API
 */
async function testSystemStatus() {
  logger.info('测试系统状态API');
  await callApi('/system/status');
  logger.divider();
}

/**
 * 测试系统版本API
 */
async function testSystemVersion() {
  logger.info('测试系统版本API');
  await callApi('/system/version');
  logger.divider();
}

/**
 * 测试区块链信息API
 */
async function testBlockchainInfo() {
  logger.info('测试区块链信息API');
  await callApi('/blockchain/info');
  logger.divider();
}

/**
 * 测试创建房产API
 */
async function testCreateProperty() {
  logger.info('测试创建房产API');
  
  const propertyData = {
    privateKey: process.env.TEST_PRIVATE_KEY || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    propertyId: 'TEST-PROP-' + Math.floor(Math.random() * 1000),
    name: '测试房产',
    symbol: 'TEST',
    initialSupply: '10000',
    initialPrice: '1',
    location: 'Tokyo, Japan',
    description: '这是一个API测试创建的房产'
  };
  
  await callApi('/property/register', {
    method: 'POST',
    body: propertyData
  });
  
  logger.divider();
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  logger.info('开始API测试');
  logger.info(`Base URL: ${BASE_URL}`);
  logger.info(`API路径: /api/${API_VERSION}`);
  logger.divider();
  
  try {
    // 首先测试健康检查接口（不带API路径前缀）
    await testHealth();
    
    // 基础API测试
    await testSystemStatus();
    await testSystemVersion();
    await testBlockchainInfo();
    
    // 如果有测试私钥，测试创建房产API
    if (process.env.TEST_PRIVATE_KEY) {
      await testCreateProperty();
    } else {
      logger.warn('跳过创建房产测试：未设置TEST_PRIVATE_KEY环境变量');
    }
    
    logger.success('API测试完成');
  } catch (error) {
    logger.error(`测试过程中出错: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本，执行所有测试
if (require.main === module) {
  runAllTests();
}

module.exports = {
  callApi,
  testHealth,
  testSystemStatus,
  testSystemVersion,
  testBlockchainInfo,
  testCreateProperty,
  runAllTests
}; 