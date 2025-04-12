const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// 简单的日志实现
const Logger = {
  info: (message) => console.log(`\x1b[32m[INFO]\x1b[0m ${message}`),
  warn: (message) => console.log(`\x1b[33m[WARN]\x1b[0m ${message}`),
  error: (message, error) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    if (error) console.error(error);
  }
};

// 设置基本URL
const BASE_URL = 'http://localhost:3001'; // 使用3001端口，避免与其他服务冲突
const API_KEY = '123456'; // 设置API密钥为默认值
const USER_ROLE = 'admin'; // 设置用户角色

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL
});

// 创建readline接口用于用户交互
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 用户交互函数
const promptToContinue = (message) => {
  return new Promise((resolve) => {
    rl.question(`${message}...`, () => {
      resolve();
    });
  });
};

// 格式化输出函数
const logRequest = (method, url, data) => {
  Logger.info(`\n============ 请求详情 ============`);
  Logger.info(`方法: ${method}`);
  Logger.info(`URL: ${url}`);
  if (data) {
    Logger.info(`参数: ${JSON.stringify(data, null, 2)}`);
  }
};

const logResponse = (response) => {
  Logger.info(`\n============ 响应详情 ============`);
  Logger.info(`状态码: ${response.status}`);
  Logger.info(`响应数据: ${JSON.stringify(response.data, null, 2)}`);
};

const logError = (error) => {
  Logger.error(`\n============ 错误详情 ============`);
  if (error.response) {
    Logger.error(`状态码: ${error.response.status}`);
    Logger.error(`响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
  } else {
    Logger.error(`错误信息: ${error.message}`);
  }
};

// API调用函数
const callApi = async (method, endpoint, data = null) => {
  let url = `${endpoint}`;
  
  // 添加API密钥和角色
  url += (url.includes('?') ? '&' : '?') + `apiKey=${API_KEY}&role=${USER_ROLE}`;
  
  logRequest(method, BASE_URL + url, data);
  
  try {
    let response;
    
    if (method.toLowerCase() === 'get') {
      response = await api.get(url, { params: data });
    } else if (method.toLowerCase() === 'post') {
      response = await api.post(url, data);
    } else if (method.toLowerCase() === 'put') {
      response = await api.put(url, data);
    }
    
    logResponse(response);
    return response.data;
  } catch (error) {
    logError(error);
    return null;
  }
};

// 测试函数
const tests = {
  // 1. 注册房产
  async registerProperty() {
    Logger.info('\n===== 测试注册房产接口 =====');
    const data = {
      propertyId: '123456',
      country: 'JP',
      metadataURI: 'ipfs://QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      initialSupply: '1000',
      tokenName: '测试房产Token',
      tokenSymbol: 'TEST'
    };
    
    return await callApi('post', '/api/v1/real-estate/register-property', data);
  },
  
  // 2. 获取房产信息
  async getPropertyInfo(propertyId = null) {
    Logger.info('\n===== 测试获取房产信息接口 =====');
    let endpoint = '/api/v1/real-estate/property';
    
    if (propertyId) {
      endpoint += `/${propertyId}`;
    } else {
      propertyId = '12345'; // 使用默认ID
      endpoint += `/${propertyId}`;
      Logger.warn(`未指定房产ID，使用默认ID: ${propertyId}`);
    }
    
    return await callApi('get', endpoint);
  },
  
  // 3. 更新房产状态
  async updatePropertyStatus(propertyId) {
    Logger.info('\n===== 测试更新房产状态接口 =====');
    const data = {
      propertyId,
      status: 2 // 可售状态
    };
    
    return await callApi('put', '/api/v1/real-estate/property-status', data);
  },
  
  // 4. 更新房产估值
  async updatePropertyValuation(propertyId) {
    Logger.info('\n===== 测试更新房产估值接口 =====');
    const data = {
      propertyId,
      newValue: '12000000' // 新估值
    };
    
    return await callApi('put', '/api/v1/real-estate/property-valuation', data);
  },
  
  // 5. 创建卖单
  async createSellOrder(propertyId) {
    Logger.info('\n===== 测试创建卖单接口 =====');
    const data = {
      propertyId,
      amount: '1000',  // 增加金额，满足最小交易要求
      price: '11000'
    };
    
    return await callApi('post', '/api/v1/real-estate/create-sell-order', data);
  },
  
  // 6. 创建买单
  async createBuyOrder(propertyId) {
    Logger.info('\n===== 测试创建买单接口 =====');
    const data = {
      propertyId,
      amount: '1000',  // 增加金额，满足最小交易要求
      price: '10500'
    };
    
    return await callApi('post', '/api/v1/real-estate/create-buy-order', data);
  },
  
  // 7. 创建奖励分配
  async createDistribution(propertyId) {
    Logger.info('\n===== 测试创建奖励分配接口 =====');
    const data = {
      propertyId,
      amount: '50000',
      description: '2023年第一季度租金分红'
    };
    
    return await callApi('post', '/api/v1/real-estate/create-distribution', data);
  },

  // 7.1 激活分配
  async activateDistribution(distributionId) {
    Logger.info('\n===== 测试激活分配接口 =====');
    const data = {
      distributionId
    };
    
    // 尝试调用激活分配的接口
    return await callApi('post', '/api/v1/real-estate/activate-distribution', data);
  },
  
  // 8. 提取分红
  async withdraw(distributionId) {
    Logger.info('\n===== 测试提取分红接口 =====');
    const data = {
      distributionId,
      user: '0x1234567890123456789012345678901234567890', // 示例用户地址
      amount: '1000'
    };
    
    return await callApi('post', '/api/v1/real-estate/withdraw', data);
  }
};

// 主测试流程
const runTests = async () => {
  try {
    Logger.info('开始测试 RealEstateFacadeController 接口...');
    
    // 首先检查区块链连接状态
    try {
      Logger.info('\n===== 检查区块链连接状态 =====');
      const response = await axios.post('http://localhost:8545', {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      });
      
      if (response.data && response.data.result) {
        const blockNumber = parseInt(response.data.result, 16);
        Logger.info(`区块链连接正常，当前区块高度: ${blockNumber}`);
      } else {
        Logger.error('区块链连接异常，请检查Hardhat节点是否运行');
        return;
      }
    } catch (error) {
      Logger.error('区块链连接检查失败', error);
      Logger.error('请确保Hardhat节点已启动，运行命令: npx hardhat node');
      return;
    }
    
    let propertyId = null;
    
    // 用户交互，逐个运行测试
    await promptToContinue('开始测试注册房产接口');
    
    // 首先尝试注册新房产
    for (let i = 0; i < 3; i++) {
      try {
        const newPropertyId = `test-property-${Date.now()}`;
        Logger.info(`尝试注册新房产ID: ${newPropertyId}`);
        
        const registerResult = await tests.registerProperty();
        if (registerResult && registerResult.data && registerResult.data.propertyId) {
          propertyId = registerResult.data.propertyId;
          Logger.info(`已成功注册房产ID: ${propertyId}`);
          break;
        } else {
          Logger.warn(`第${i+1}次注册尝试失败，将重试...`);
        }
      } catch (error) {
        Logger.error(`注册房产失败: ${error.message}`);
      }
    }
    
    if (!propertyId) {
      Logger.warn('无法成功注册房产，将使用默认ID: 12345');
      propertyId = '12345';
    }
    
    // 获取房产信息
    await promptToContinue('开始测试获取房产信息接口');
    await tests.getPropertyInfo(propertyId);
    
    // 更新房产状态
    await promptToContinue('开始测试更新房产状态接口');
    await tests.updatePropertyStatus(propertyId);
    
    // 更新房产估值
    await promptToContinue('开始测试更新房产估值接口');
    await tests.updatePropertyValuation(propertyId);
    
    // 创建卖单
    await promptToContinue('开始测试创建卖单接口');
    await tests.createSellOrder(propertyId);
    
    // 创建买单
    await promptToContinue('开始测试创建买单接口');
    await tests.createBuyOrder(propertyId);
    
    // 创建奖励分配
    await promptToContinue('开始测试创建奖励分配接口');
    const distributionResult = await tests.createDistribution(propertyId);
    
    // 提取distributionId
    let distributionId = null;
    if (distributionResult && distributionResult.data && distributionResult.data.distributionId) {
      distributionId = distributionResult.data.distributionId;
      Logger.info(`已获取分配ID: ${distributionId}`);
      
      // 激活分配
      await promptToContinue('开始测试激活分配接口');
      await tests.activateDistribution(distributionId);
    } else {
      distributionId = '0'; // 使用默认ID进行后续测试
      Logger.warn(`无法获取分配ID，使用默认ID: ${distributionId}`);
    }
    
    // 提取分红
    await promptToContinue('开始测试提取分红接口');
    await tests.withdraw(distributionId);
    
    Logger.info('\n所有测试完成!');
    
  } catch (error) {
    Logger.error('测试过程中出现错误:', error);
  } finally {
    rl.close();
  }
};

// 启动测试
runTests(); 