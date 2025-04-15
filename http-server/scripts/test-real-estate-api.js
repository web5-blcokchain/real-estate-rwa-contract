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

// 缓存文件路径 - 简化为只有一个文件
const CACHE_DIR = path.resolve(__dirname, '../../cache');
const PROPERTY_CACHE_FILE = path.join(CACHE_DIR, 'property-cache.json');

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  Logger.info(`创建缓存目录: ${CACHE_DIR}`);
}

// 更新房产缓存 - 简化为只保存房产ID
const updatePropertyCache = (propertyData) => {
  try {
    // 如果房产数据有效
    if (propertyData && propertyData.data && propertyData.data.propertyId) {
      const propertyId = propertyData.data.propertyId;
      
      // 简单的缓存结构: 只保存最新的一个房产ID和时间戳
      const cacheData = {
        propertyId: propertyId,
        cachedAt: new Date().toISOString()
      };
      
      // 写入缓存文件
      fs.writeFileSync(
        PROPERTY_CACHE_FILE, 
        JSON.stringify(cacheData, null, 2), 
        'utf8'
      );
      
      Logger.info(`房产数据已缓存: ${propertyId}`);
      return true;
    } else {
      Logger.warn('未能更新房产缓存，数据格式无效');
      return false;
    }
  } catch (error) {
    Logger.error(`更新房产缓存时出错: ${error.message}`, error);
    return false;
  }
};

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
  async registerProperty(propertyId) {
    Logger.info('\n===== 测试注册房产接口 =====');
    const data = {
      propertyId: propertyId,
      country: 'JP',
      metadataURI: 'ipfs://QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      initialSupply: '1000',
      tokenName: '测试房产Token',
      tokenSymbol: 'TEST'
    };
    
    const result = await callApi('post', '/api/v1/real-estate/register-property', data);
    
    // 只在注册成功时写入缓存
    if (result && result.success) {
      updatePropertyCache(result);
    }
    
    return result;
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
  
  // 查询所有分配ID
  async getAllDistributions() {
    Logger.info('\n===== 查询所有分配ID =====');
    return await callApi('get', '/api/v1/real-estate/distributions');
  },
  
  // 查询用户代币余额
  async getUserTokenBalance(propertyId, userAddress) {
    Logger.info('\n===== 查询用户代币余额 =====');
    const endpoint = `/api/v1/real-estate/token-balance/${propertyId}/${userAddress}`;
    return await callApi('get', endpoint);
  },
  
  // 查询分配详情
  async getDistributionDetails(distributionId) {
    Logger.info('\n===== 查询分配详情 =====');
    const endpoint = `/api/v1/real-estate/distribution/${distributionId}`;
    return await callApi('get', endpoint);
  },
  
  // 获取分配比例
  async getDistributionRatio(distributionId, userAddress) {
    Logger.info('\n===== 查询用户分配比例 =====');
    const endpoint = `/api/v1/real-estate/distribution-ratio/${distributionId}/${userAddress}`;
    return await callApi('get', endpoint);
  },
  
  // 7.1 激活分配
  async activateDistribution(distributionId) {
    Logger.info('\n===== 测试激活分配接口 =====');
    const data = {
      distributionId
    };
    
    return await callApi('post', '/api/v1/real-estate/activate-distribution', data);
  },
  
  // 8. 提取分红
  async withdraw(distributionId) {
    Logger.info('\n===== 测试提取分红接口 =====');
    const userAddress = '0x1234567890123456789012345678901234567890'; // 示例用户地址
    const data = {
      distributionId,
      user: userAddress,
      amount: '1000'
    };
    
    // 提取前查询用户余额
    Logger.info('\n提取分红前用户信息:');
    try {
      const propertyResult = await tests.getPropertyInfo();
      if (propertyResult && propertyResult.data) {
        const propertyId = propertyResult.data.propertyId;
        await tests.getUserTokenBalance(propertyId, userAddress);
      }
    } catch (error) {
      Logger.error('查询用户提取前余额失败', error);
    }
    
    // 查询分配详情
    try {
      await tests.getDistributionDetails(distributionId);
      // 查询用户分配比例
      await tests.getDistributionRatio(distributionId, userAddress);
    } catch (error) {
      Logger.error('查询分配详情失败', error);
    }
    
    // 执行提取
    const result = await callApi('post', '/api/v1/real-estate/withdraw', data);
    
    // 提取后查询用户余额
    Logger.info('\n提取分红后用户信息:');
    try {
      const propertyResult = await tests.getPropertyInfo();
      if (propertyResult && propertyResult.data) {
        const propertyId = propertyResult.data.propertyId;
        await tests.getUserTokenBalance(propertyId, userAddress);
      }
    } catch (error) {
      Logger.error('查询用户提取后余额失败', error);
    }
    
    return result;
  },
  
  // 显示当前缓存
  showCurrentCache() {
    Logger.info('\n===== 当前房产缓存 =====');
    try {
      if (fs.existsSync(PROPERTY_CACHE_FILE)) {
        const cacheData = JSON.parse(fs.readFileSync(PROPERTY_CACHE_FILE, 'utf8'));
        Logger.info(`缓存文件: ${PROPERTY_CACHE_FILE}`);
        Logger.info(`当前缓存的房产ID: ${cacheData.propertyId}`);
        Logger.info(`缓存时间: ${cacheData.cachedAt}`);
      } else {
        Logger.info(`缓存文件不存在: ${PROPERTY_CACHE_FILE}`);
      }
    } catch (error) {
      Logger.error(`读取缓存失败: ${error.message}`);
    }
  }
};

// 主测试流程
const runTests = async () => {
  try {
    Logger.info('开始测试 RealEstateFacadeController 接口...');
    
    // 首先检查区块链连接状态
    try {
      Logger.info('\n===== 检查区块链连接状态 =====');
      const response = await axios.post('https://test-hardhat-node.usdable.com', {
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
    
    // 显示测试开始前的缓存状态
    tests.showCurrentCache();
    
    let propertyId = null;
    
    // 用户交互，逐个运行测试
    await promptToContinue('开始测试注册房产接口');
    
    // 尝试注册新房产
    try {
      const newPropertyId = `test-property-${Date.now()}`;
      Logger.info(`尝试注册新房产ID: ${newPropertyId}`);
      
      const registerResult = await tests.registerProperty(newPropertyId);
      if (registerResult && registerResult.data && registerResult.data.propertyId) {
        propertyId = registerResult.data.propertyId;
        Logger.info(`已成功注册房产ID: ${propertyId}`);
        
        // 显示注册后的缓存状态
        tests.showCurrentCache();
      } else {
        Logger.warn(`注册尝试失败，将使用默认ID`);
        propertyId = '12345';
      }
    } catch (error) {
      Logger.error(`注册房产失败: ${error.message}`);
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
      
      // 查询所有分配ID
      await tests.getAllDistributions();
      
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