/**
 * RealEstateFacade核心业务流程测试脚本
 * 
 * 测试流程：
 * 1. 注册不动产并创建代币
 * 2. 查询并更新不动产状态
 * 3. 创建交易订单
 * 4. 执行交易购买代币
 * 5. 创建收益分配
 * 6. 领取收益奖励
 */
require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { ethers } = require('ethers');
const chalk = require('chalk');

// 从环境变量读取配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost';
const API_BASE_PORT = process.env.API_BASE_PORT || process.env.PORT || 3000;
const API_PATH = process.env.API_PATH || '/api';
const API_KEY = process.env.API_KEY || '123456';

// 构建完整的API URL
const API_URL = `${API_BASE_URL}:${API_BASE_PORT}${API_PATH}`;

console.log(`使用API URL: ${API_URL}`);
console.log(`使用API KEY: ${API_KEY}`);

// 测试钱包类型
const ADMIN_WALLET = {
  keyType: 'admin',
  address: '' // 将在运行时填充
};

const BUYER_WALLET = {
  keyType: 'user',
  address: '' // 将在运行时填充
};

// 全局变量，存储测试过程中的数据
const testData = {
  propertyIdHash: '',
  tokenAddress: '',
  orderId: 0,
  distributionId: 0,
  propertyTokenImplementation: ''
};

// 详细日志开关
const VERBOSE_LOGGING = true;

/**
 * 输出彩色日志
 * @param {string} message - 日志信息
 * @param {string} type - 日志类型
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✓ ${message}`));
      break;
    case 'error':
      console.error(chalk.red(`[${timestamp}] ✗ ${message}`));
      break;
    case 'warning':
      console.warn(chalk.yellow(`[${timestamp}] ⚠ ${message}`));
      break;
    case 'debug':
      if (VERBOSE_LOGGING) {
        console.log(chalk.gray(`[${timestamp}] 🔍 ${message}`));
      }
      break;
    case 'info':
    default:
      console.log(chalk.blue(`[${timestamp}] ℹ ${message}`));
      break;
  }
}

/**
 * 格式化JSON对象为美观的字符串
 * @param {Object} obj - 要格式化的对象
 * @returns {string} 格式化后的字符串
 */
function formatObject(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return `[无法序列化对象: ${error.message}]`;
  }
}

/**
 * 创建API请求客户端
 */
const api = axios.create({
  baseURL: API_URL,
  params: {
    api_key: API_KEY
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

// 确保每个请求都包含API_KEY
api.interceptors.request.use(function (config) {
  // 确保params对象存在
  if (!config.params) {
    config.params = {};
  }
  // 明确设置api_key参数
  config.params.api_key = API_KEY;
  
  // 构建完整URL（包含查询参数）
  let fullUrl = `${config.baseURL}${config.url}`;
  const queryParams = new URLSearchParams(config.params).toString();
  if (queryParams) {
    fullUrl += `?${queryParams}`;
  }
  
  log(`发送请求: ${config.method.toUpperCase()} ${fullUrl}`, 'info');
  
  // 详细打印请求数据
  if (config.data) {
    log(`请求参数: ${formatObject(config.data)}`, 'debug');
  }
  
  return config;
});

// 响应拦截器用于显示详细错误信息
api.interceptors.response.use(
  function (response) {
    // 构建完整URL（包含查询参数）
    let fullUrl = `${response.config.baseURL}${response.config.url}`;
    const queryParams = new URLSearchParams(response.config.params).toString();
    if (queryParams) {
      fullUrl += `?${queryParams}`;
    }
    
    log(`请求成功: ${response.config.method.toUpperCase()} ${fullUrl}`, 'success');
    
    // 详细打印响应数据
    log(`响应状态: ${response.status}`, 'debug');
    log(`响应头: ${formatObject(response.headers)}`, 'debug');
    log(`响应数据: ${formatObject(response.data)}`, 'debug');
    
    return response;
  },
  function (error) {
    if (error.response) {
      // 构建完整URL（包含查询参数）
      let fullUrl = `${error.config.baseURL}${error.config.url}`;
      const queryParams = new URLSearchParams(error.config.params).toString();
      if (queryParams) {
        fullUrl += `?${queryParams}`;
      }
      
      log(`请求失败(${error.response.status}): ${error.config.method.toUpperCase()} ${fullUrl}`, 'error');
      
      // 详细打印请求和响应信息
      if (error.config.data) {
        log(`请求参数: ${formatObject(JSON.parse(error.config.data))}`, 'debug');
      }
      log(`响应头: ${formatObject(error.response.headers)}`, 'debug');
      log(`错误详情: ${formatObject(error.response.data)}`, 'error');
      
      // 特殊处理401错误
      if (error.response.status === 401) {
        log(`API认证失败 - 请检查API密钥是否有效。当前API_KEY: ${API_KEY}`, 'error');
      }
    } else if (error.request) {
      log(`未收到响应: ${error.message}`, 'error');
      log(`请求配置: ${formatObject(error.config)}`, 'debug');
    } else {
      log(`请求配置错误: ${error.message}`, 'error');
    }
    
    return Promise.reject(error);
  }
);

/**
 * 初始化测试环境
 */
async function init() {
  try {
    // 获取管理员和买家的钱包地址
    log('初始化测试环境...', 'info');
    
    // 区块链网络信息
    const networkResponse = await api.get('/v1/blockchain/info');
    log(`连接到区块链网络: ${networkResponse.data.data.networkType}`, 'info');
    
    // 获取系统组件信息
    try {
      const componentsResponse = await api.get('/v1/system/components');
      log('获取系统组件信息成功', 'success');
      
      // 尝试从deployment.json文件获取PropertyToken实现地址
      try {
        const deploymentResponse = await api.get('/v1/system/contracts');
        log('获取部署信息成功', 'success');
        
        if (deploymentResponse.data.data.implementations && 
            deploymentResponse.data.data.implementations.PropertyToken) {
          testData.propertyTokenImplementation = deploymentResponse.data.data.implementations.PropertyToken;
          log(`找到PropertyToken实现地址: ${testData.propertyTokenImplementation}`, 'success');
        } else {
          // 使用默认测试地址
          testData.propertyTokenImplementation = '0x0000000000000000000000000000000000000001';
          log(`未找到PropertyToken实现地址，使用默认测试地址: ${testData.propertyTokenImplementation}`, 'warning');
        }
      } catch (deploymentError) {
        log(`获取部署信息失败，使用默认PropertyToken实现地址`, 'warning');
        testData.propertyTokenImplementation = '0x0000000000000000000000000000000000000001';
      }
    } catch (componentsError) {
      if (componentsError.response && componentsError.response.status === 401) {
        log('API密钥认证失败。请检查您的API_KEY环境变量是否设置正确。', 'error');
        process.exit(1);
      } else {
        log('获取系统组件信息失败，使用默认PropertyToken实现地址', 'warning');
        testData.propertyTokenImplementation = '0x0000000000000000000000000000000000000001';
      }
    }
    
    log('测试环境初始化完成', 'success');
    return true;
  } catch (error) {
    log(`初始化测试环境失败: ${error.message}`, 'error');
    if (error.response && error.response.status === 401) {
      log('API密钥认证失败。请检查您的API_KEY环境变量是否设置正确。', 'error');
    }
    return false;
  }
}

/**
 * 注册房产并创建代币
 */
async function registerPropertyAndCreateToken() {
  try {
    log('步骤1: 注册房产并创建代币...', 'info');
    
    // 确保PropertyToken实现地址有效
    if (!testData.propertyTokenImplementation || testData.propertyTokenImplementation === '') {
      // 使用默认的PropertyToken实现地址
      testData.propertyTokenImplementation = '0x9A676e781A523b5d0C0e43731313A708CB607508';
      log(`使用默认的PropertyToken实现地址: ${testData.propertyTokenImplementation}`, 'info');
    }
    
    const requestData = {
      propertyId: `JP-TEST-${Date.now()}`,
      country: 'Japan',
      metadataURI: 'ipfs://Qm...example',
      tokenName: 'Test Property Token',
      tokenSymbol: 'TPT',
      initialSupply: '1000000000000000000000',
      propertyTokenImplementation: testData.propertyTokenImplementation,
      keyType: ADMIN_WALLET.keyType
    };
    
    const response = await api.post('/v1/facade/property-token', requestData);
    
    if (response.data.success) {
      testData.propertyIdHash = response.data.data.propertyIdHash;
      testData.tokenAddress = response.data.data.tokenAddress;
      log(`房产注册成功，ID哈希: ${testData.propertyIdHash}`, 'success');
      log(`通证创建成功，地址: ${testData.tokenAddress}`, 'success');
      return true;
    } else {
      log('房产注册失败', 'error');
      return false;
    }
  } catch (error) {
    log(`注册房产失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 更新房产状态
 */
async function updatePropertyStatus() {
  try {
    log('步骤2: 更新房产状态...', 'info');
    
    // 先查询当前状态
    const getStatusResponse = await api.get(`/v1/properties/${testData.propertyIdHash}`);
    const currentStatus = getStatusResponse.data.data.status;
    log(`当前房产状态: ${currentStatus}`, 'info');
    
    // 更新状态（在0-3之间切换）
    const newStatus = (parseInt(currentStatus) + 1) % 4;
    
    const updateData = {
      propertyIdHash: testData.propertyIdHash,
      status: newStatus,
      keyType: ADMIN_WALLET.keyType
    };
    
    const response = await api.put('/v1/facade/property-status', updateData);
    
    if (response.data.success) {
      log(`房产状态更新成功，从 ${currentStatus} 到 ${newStatus}`, 'success');
      
      // 再次恢复为活跃状态（0）
      if (newStatus !== 0) {
        const restoreData = {
          propertyIdHash: testData.propertyIdHash,
          status: 0,
          keyType: ADMIN_WALLET.keyType
        };
        
        const restoreResponse = await api.put('/v1/facade/property-status', restoreData);
        
        if (restoreResponse.data.success) {
          log('房产状态已恢复为活跃状态', 'success');
        }
      }
      
      return true;
    } else {
      log('房产状态更新失败', 'error');
      return false;
    }
  } catch (error) {
    log(`更新房产状态失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 创建交易订单
 */
async function createOrder() {
  try {
    log('步骤3: 创建交易订单...', 'info');
    
    // 确保token地址有效
    if (!testData.tokenAddress || testData.tokenAddress === '') {
      // 使用PropertyToken的默认地址
      testData.tokenAddress = '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E';
      log(`未找到通证地址，使用默认地址: ${testData.tokenAddress}`, 'warning');
    }
    
    const orderData = {
      token: testData.tokenAddress,
      amount: '100000000000000000000', // 100 tokens
      price: '10000000000000000000', // 10 ETH
      keyType: ADMIN_WALLET.keyType
    };
    
    const response = await api.post('/v1/trading/orders', orderData);
    
    if (response.data.success) {
      testData.orderId = response.data.data.orderId;
      log(`交易订单创建成功，订单ID: ${testData.orderId}`, 'success');
      return true;
    } else {
      log('交易订单创建失败', 'error');
      return false;
    }
  } catch (error) {
    log(`创建交易订单失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 执行交易
 */
async function executeTrade() {
  try {
    log('步骤4: 执行交易...', 'info');
    
    // 确保orderId有效
    if (!testData.orderId || testData.orderId === 0) {
      // 使用默认的orderId
      testData.orderId = 1;
      log(`未找到订单ID，使用默认值: ${testData.orderId}`, 'warning');
    }
    
    const executeData = {
      orderId: testData.orderId,
      keyType: BUYER_WALLET.keyType,
      value: '10000000000000000000' // 10 ETH，确保有足够的ETH支付
    };
    
    const response = await api.post('/v1/facade/execute-trade', executeData);
    
    if (response.data.success) {
      log(`交易执行成功，交易哈希: ${response.data.data.txHash}`, 'success');
      return true;
    } else {
      log('交易执行失败', 'error');
      return false;
    }
  } catch (error) {
    log(`执行交易失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 创建分配
 */
async function createDistribution() {
  try {
    log('步骤5: 创建收益分配...', 'info');
    
    // 确保propertyIdHash有效
    if (!testData.propertyIdHash || testData.propertyIdHash === '') {
      // 使用默认的propertyIdHash
      testData.propertyIdHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      log(`未找到房产ID哈希，使用默认值: ${testData.propertyIdHash}`, 'warning');
    }
    
    const distributionData = {
      propertyIdHash: testData.propertyIdHash,
      amount: '5000000000000000000', // 5 ETH
      description: '测试收益分配',
      keyType: ADMIN_WALLET.keyType
    };
    
    const response = await api.post('/v1/facade/distribute-rewards', distributionData);
    
    if (response.data.success) {
      testData.distributionId = response.data.data.distributionId;
      log(`收益分配创建成功，分配ID: ${testData.distributionId}`, 'success');
      return true;
    } else {
      log('收益分配创建失败', 'error');
      return false;
    }
  } catch (error) {
    log(`创建收益分配失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 领取奖励
 */
async function claimRewards() {
  try {
    log('步骤6: 领取收益奖励...', 'info');
    
    const claimData = {
      distributionId: testData.distributionId,
      keyType: BUYER_WALLET.keyType
    };
    
    const response = await api.post('/v1/facade/claim-rewards', claimData);
    
    if (response.data.success) {
      log(`奖励领取成功，交易哈希: ${response.data.data.txHash}`, 'success');
      log(`领取金额: ${response.data.data.claimedAmount}`, 'success');
      return true;
    } else {
      log('奖励领取失败', 'error');
      return false;
    }
  } catch (error) {
    log(`领取奖励失败: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 执行完整测试流程
 */
async function runCompleteTest() {
  try {
    log('开始RealEstateFacade核心业务流程测试', 'info');
    
    // 初始化
    await init();
    
    // 等待一下确保初始化完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 执行测试步骤
    await registerPropertyAndCreateToken();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待区块确认
    
    await updatePropertyStatus();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待区块确认
    
    await createOrder();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待区块确认
    
    await executeTrade();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待区块确认
    
    await createDistribution();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待区块确认
    
    await claimRewards();
    
    log('测试流程完成', 'success');
    log(`测试数据: ${formatObject(testData)}`, 'info');
    
  } catch (error) {
    log(`测试过程中出现错误: ${error.message}`, 'error');
  }
}

// 执行测试
runCompleteTest(); 