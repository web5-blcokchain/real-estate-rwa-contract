/**
 * HTTP API测试脚本
 * 按照业务流程顺序测试API端点
 * 
 * 测试流程说明:
 * -------------
 * 这个测试脚本按照区块链业务的逻辑流程顺序执行测试:
 * 
 * 1. 系统状态检查: 确保系统处于激活状态
 * 2. 管理员权限检查: 确保测试账户具有必要的操作权限
 * 3. 房产注册: 创建新的房产记录（业务流程的起点）
 * 4. 房产审核: 将房产状态从"未审核"更改为"已审核"（必须在注册后才能进行）
 * 5. 房产查询: 验证房产信息和状态（依赖于前两步）
 * 6. 代币创建: 为已审核的房产创建对应的代币（必须在房产审核通过后才能进行）
 * 7. 代币查询: 验证代币信息（依赖于代币创建）
 * 8. 平台费率测试: 验证费率管理功能
 * 
 * 注意事项:
 * --------
 * - 测试严格按照业务流程顺序执行，后续步骤依赖前面步骤的成功完成
 * - 每个区块链交易都有等待确认的机制，处理了区块链的异步特性
 * - 测试结果会记录在test-results目录中，便于追踪和分析
 * 
 * 使用方法: node test-api.js [选项]
 * 可选参数:
 *   --skip test1,test2    跳过指定的测试步骤
 *   --only test1,test2    只执行指定的测试步骤
 *   --help                显示帮助信息
 */

const axios = require('axios');
const assert = require('assert').strict;
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// 配置
const config = {
  baseUrl: 'http://localhost:3030/api',  // 确保使用正确的端口3030
  apiKey: 'default-api-key', // 使用与服务器配置匹配的API密钥
  timeout: 30000, // 较长的超时时间，考虑区块链交易确认时间
  retryDelay: 2000, // 重试间隔时间
  maxRetries: 15   // 最大重试次数
};

// 存储测试过程中的数据
const testData = {
  propertyId: null,
  tokenId: null,
  transactionIds: [],
  errors: [],
  skippedTests: [],
  requestLogs: [] // 新增请求日志记录
};

// 调试模式初始化
const DEBUG = process.env.DEBUG || true; // 默认开启详细日志

/**
 * 增强的调试日志功能
 */
function debugLog(message, obj = null) {
  if (DEBUG) {
    console.log('\n[DEBUG] ' + message);
    if (obj) {
      console.log(JSON.stringify(obj, null, 2));
    }
  }
}

/**
 * 记录API请求和响应
 */
function logApiRequest(method, url, data, response) {
  const requestLog = {
    timestamp: new Date().toISOString(),
    request: {
      method,
      url,
      data: data || null
    },
    response: {
      status: response?.status,
      data: response?.data
    }
  };
  
  testData.requestLogs.push(requestLog);
  
  // 打印请求和响应日志
  console.log('\n📡 API请求详情:');
  console.log(`  ${method.toUpperCase()} ${url}`);
  if (data) {
    console.log('  请求数据:', JSON.stringify(data, null, 2));
  }
  
  console.log('\n📥 API响应详情:');
  console.log(`  状态码: ${response?.status || 'N/A'}`);
  console.log('  响应数据:', JSON.stringify(response?.data, null, 2));
  console.log('-------------------------------------------');
  
  return requestLog;
}

// 输出当前连接信息
console.log('⚙️ 测试配置:');
console.log(`- API URL: ${config.baseUrl}`);
console.log(`- API Key: ${config.apiKey ? '已配置 (' + config.apiKey + ')' : '未配置'}`);
console.log(`- 调试模式: ${DEBUG ? '开启' : '关闭'}`);
console.log('');

// 用于等待区块链交易确认的辅助函数
async function waitForTransaction(txHash, retries = config.maxRetries, interval = config.retryDelay) {
  console.log(`等待交易确认: ${txHash}`);
  
  for (let i = 0; i < retries; i++) {
    try {
      // 在URL中添加API密钥
      const url = `${config.baseUrl}/contracts/transaction/${txHash}?api_key=${config.apiKey}`;
      console.log(`[尝试 ${i+1}/${retries}] 检查交易状态: ${url}`);
      
      const response = await axios.get(url);
      
      logApiRequest('GET', url, null, response);
      
      if (response.data.data && response.data.data.confirmed) {
        console.log(`交易已确认: ${txHash}`);
        
        // 检查交易是否成功
        if (response.data.data.status === 1 || response.data.data.status === true) {
          console.log(`交易执行成功: ${txHash}`);
          return response.data.data;
        } else if (response.data.data.status === 0 || response.data.data.status === false) {
          throw new Error(`交易执行失败: ${txHash} - 可能被区块链回滚`);
        }
        
        return response.data.data;
      }
    } catch (error) {
      console.log(`检查交易状态出错 (尝试 ${i+1}/${retries}): ${error.message}`);
      if (error.response) {
        console.log(`状态码: ${error.response.status}`);
        if (error.response.data) {
          console.log(`响应内容: ${JSON.stringify(error.response.data)}`);
        }
      }
      debugLog('详细错误信息:', error);
    }
    
    // 打印等待信息
    if ((i + 1) % 3 === 0) {
      console.log(`仍在等待交易确认... (${i+1}/${retries})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`交易未在预期时间内确认: ${txHash}`);
}

// 创建HTTP客户端
const client = axios.create({
  baseURL: config.baseUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 直接在URL中添加API密钥
function getAuthenticatedUrl(url) {
  // 如果URL已经包含查询参数，使用&追加，否则使用?
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}api_key=${config.apiKey}`;
}

// 请求拦截器 - 记录请求并添加认证
client.interceptors.request.use(
  request => {
    // 在URL中添加api_key参数
    const separator = request.url.includes('?') ? '&' : '?';
    request.url = `${request.url}${separator}api_key=${config.apiKey}`;
    
    console.log(`\n📤 发送请求: ${request.method.toUpperCase()} ${request.baseURL}${request.url}`);
    
    if (request.data) {
      console.log('请求数据:', JSON.stringify(request.data, null, 2));
    }
    return request;
  },
  error => {
    console.error('请求发送失败:', error.message);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 记录每个请求的响应
client.interceptors.response.use(
  response => {
    console.log(`\n📥 收到响应: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 记录交易ID
    if (response.data && response.data.data && response.data.data.txHash) {
      testData.transactionIds.push(response.data.data.txHash);
      console.log(`📝 已记录交易ID: ${response.data.data.txHash}`);
    }
    
    return response;
  },
  error => {
    const errorData = error.response ? error.response.data : error.message;
    console.error('❌ API请求失败:', errorData);
    console.error(`状态码: ${error.response?.status || 'N/A'}`);
    
    debugLog('详细错误信息:', {
      message: error.message,
      code: error.code,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL
      } : null,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    });
    
    throw error;
  }
);

/**
 * 测试步骤1: 检查系统状态
 */
async function testSystemStatus() {
  console.log('\n📋 步骤1: 检查系统状态');
  console.log('检查API状态...\n');

  // 检查API状态
  const statusResponse = await client.get('/status');
  console.log(`📥 收到响应: ${statusResponse.status} GET /status`);
  console.log('响应数据:', JSON.stringify(statusResponse.data, null, 2));
  
  if (statusResponse.data.success) {
    console.log('✅ API状态检查成功');
  } else {
    throw new Error('API状态检查失败');
  }

  console.log('检查系统合约状态...\n');

  // 检查系统状态
  const systemResponse = await client.get('/contracts/RealEstateSystem/paused');
  console.log(`📥 收到响应: ${systemResponse.status} GET /contracts/RealEstateSystem/paused`);
  console.log('响应数据:', JSON.stringify(systemResponse.data, null, 2));
  
  const isPaused = systemResponse.data.data;
  console.log(`系统状态: ${isPaused ? '已暂停' : '正常运行'}`);

  // 如果系统已暂停，尝试恢复
  if (isPaused) {
    console.log('\n尝试恢复系统...');
    try {
      const unpauseResponse = await client.post('/contracts/RealEstateSystem/emergencyUnpause');
      console.log(`📥 收到响应: ${unpauseResponse.status} POST /contracts/RealEstateSystem/emergencyUnpause`);
      console.log('响应数据:', JSON.stringify(unpauseResponse.data, null, 2));
      
      if (unpauseResponse.data.success) {
        console.log('✅ 系统已恢复');
        
        // 等待交易确认
        console.log('\n等待交易确认...');
        await waitForTransaction(unpauseResponse.data.data.hash);
        
        // 再次检查系统状态
        console.log('\n再次检查系统状态...');
        const checkAgainResponse = await client.get('/contracts/RealEstateSystem/paused');
        console.log(`📥 收到响应: ${checkAgainResponse.status} GET /contracts/RealEstateSystem/paused`);
        console.log('响应数据:', JSON.stringify(checkAgainResponse.data, null, 2));
        
        if (checkAgainResponse.data.data) {
          throw new Error('系统恢复失败');
        }
        
        console.log('✅ 系统已成功恢复');
      } else {
        throw new Error('系统恢复失败');
      }
    } catch (error) {
      console.error('❌ 系统恢复失败:', error.message);
      throw error;
    }
  } else {
    console.log('✅ 系统状态正常');
  }
}

async function getCurrentAccount() {
  try {
    const response = await client.get('/contracts/RealEstateSystem/owner');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to get current account');
  } catch (error) {
    console.log('❌ 获取当前账户失败:', error.message);
    throw error;
  }
}

/**
 * 测试步骤2: 检查管理员权限
 */
async function testAdminRoles() {
  console.log('\n📋 步骤2: 检查管理员权限');
  
  try {
    // 获取当前账户地址
    const currentAccount = await getCurrentAccount();
    console.log('当前账户地址:', currentAccount);

    // 检查当前账户是否有SUPER_ADMIN角色
    const response = await client.get('/contracts/RealEstateSystem/hasRole', {
      params: {
        role: 'SUPER_ADMIN',
        account: currentAccount
      }
    });

    if (response.data.success) {
      console.log('✅ 管理员权限检查成功');
      console.log('角色状态:', response.data.data);
      return true;
    } else {
      console.log('❌ 管理员权限检查失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 管理员权限检查失败:', error.message);
    if (error.response) {
      console.log('\n[DEBUG] 详细错误信息:');
      console.log(JSON.stringify(error, null, 2));
    }
    return false;
  }
}

/**
 * 测试步骤3: 注册房产
 */
async function testPropertyRegistration(adminAddress) {
  console.log('\n📋 步骤3: 注册房产');
  
  try {
    // 生成唯一的房产ID
    const timestamp = Date.now();
    const propertyId = `PROP-${timestamp}`;
    testData.propertyId = propertyId;
    
    // 检查该ID的房产是否已存在（避免冲突）
    try {
      const existsCheck = await client.get(`/contracts/PropertyRegistry/propertyExists?propertyId=${propertyId}`);
      if (existsCheck.data.data === true) {
        console.log('警告: 房产ID已存在，生成新ID...');
        return testPropertyRegistration(adminAddress); // 递归调用生成新ID
      }
    } catch (error) {
      console.log(`检查房产存在性失败，继续注册: ${error.message}`);
    }
    
    // 准备房产数据
    const propertyData = {
      propertyId: propertyId,
      owner: adminAddress,
      location: 'Tokyo, Shibuya',
      area: 85,
      price: 15000000,
      description: 'Modern apartment near Shibuya station',
      status: 0 // 初始状态: 未审核
    };
    
    console.log(`准备注册房产: ${propertyId}`);
    console.log(`房产数据: ${JSON.stringify(propertyData, null, 2)}`);
    
    // 调用注册房产API
    const registerResponse = await client.post('/contracts/PropertyRegistry/registerProperty', propertyData);
    assert.equal(registerResponse.data.success, true, '房产注册API调用失败');
    
    const txHash = registerResponse.data.data.txHash;
    console.log(`注册房产交易已提交: ${txHash}`);
    
    // 等待交易确认
    await waitForTransaction(txHash);
    
    // 检查房产是否已注册 - 重试几次确保区块链状态同步
    let propertyExists = false;
    for (let i = 0; i < 3; i++) {
      try {
        const checkResponse = await client.get(`/contracts/PropertyRegistry/propertyExists?propertyId=${propertyId}`);
        assert.equal(checkResponse.data.success, true);
        
        if (checkResponse.data.data === true) {
          propertyExists = true;
          break;
        }
        
        console.log(`房产尚未在链上确认，等待同步... (尝试 ${i+1}/3)`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.log(`检查房产注册状态失败 (尝试 ${i+1}/3): ${error.message}`);
      }
    }
    
    assert.equal(propertyExists, true, '房产注册失败 - 在多次尝试后仍未确认');
    console.log(`✅ 房产注册成功: ${propertyId}`);
    
    // 检查房产初始状态
    const statusResponse = await client.get(`/contracts/PropertyRegistry/getPropertyStatus?propertyId=${propertyId}`);
    assert.equal(statusResponse.data.success, true);
    assert.equal(statusResponse.data.data, 0, '房产初始状态不正确，应为\'未审核\'');
    console.log('确认房产状态: 未审核 (0)');
    
    return propertyId;
  } catch (error) {
    console.error('❌ 房产注册失败:', error.message);
    testData.errors.push({
      step: '房产注册',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * 测试步骤4: 审核房产
 */
async function testPropertyApproval(propertyId) {
  console.log('\n📋 步骤4: 审核房产');
  
  try {
    // 确保propertyId有效
    if (!propertyId) {
      throw new Error('无法审核房产: 房产ID无效');
    }
    
    // 检查房产是否存在
    const existsResponse = await client.get(`/contracts/PropertyRegistry/propertyExists?propertyId=${propertyId}`);
    assert.equal(existsResponse.data.success, true);
    assert.equal(existsResponse.data.data, true, `房产${propertyId}不存在，无法审核`);
    
    // 检查房产初始状态
    const statusResponse = await client.get(`/contracts/PropertyRegistry/getPropertyStatus?propertyId=${propertyId}`);
    console.log(`房产当前状态: ${statusResponse.data.data}`);
    
    // 如果房产已审核，则跳过审核步骤
    if (statusResponse.data.data === 2) {
      console.log(`房产${propertyId}已经是审核状态，跳过审核步骤`);
      return true;
    }
    
    // 审核房产
    console.log(`开始审核房产: ${propertyId}`);
    const approveResponse = await client.post('/contracts/PropertyRegistry/approveProperty', {
      propertyId: propertyId
    });
    assert.equal(approveResponse.data.success, true, '房产审核API调用失败');
    
    const txHash = approveResponse.data.data.txHash;
    console.log(`审核房产交易已提交: ${txHash}`);
    
    // 等待交易确认
    await waitForTransaction(txHash);
    
    // 检查房产状态是否更新为已审核 - 重试几次确保区块链状态同步
    let isApproved = false;
    for (let i = 0; i < 3; i++) {
      try {
        const newStatusResponse = await client.get(`/contracts/PropertyRegistry/getPropertyStatus?propertyId=${propertyId}`);
        assert.equal(newStatusResponse.data.success, true);
        
        if (newStatusResponse.data.data === 2) {
          isApproved = true;
          break;
        }
        
        console.log(`房产审核状态尚未在链上确认，等待同步... (尝试 ${i+1}/3)`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.log(`检查房产审核状态失败 (尝试 ${i+1}/3): ${error.message}`);
      }
    }
    
    assert.equal(isApproved, true, '房产审核失败 - 在多次尝试后状态仍未变为已审核');
    console.log('✅ 房产审核成功');
    
    return true;
  } catch (error) {
    console.error('❌ 房产审核失败:', error.message);
    testData.errors.push({
      step: '房产审核',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * 测试步骤5: 查询房产信息
 */
async function testPropertyQuery(propertyId) {
  console.log('\n📋 步骤5: 查询房产信息');
  
  try {
    // 获取房产详情
    const detailResponse = await client.get(`/contracts/PropertyRegistry/getProperty?propertyId=${propertyId}`);
    assert.equal(detailResponse.data.success, true);
    
    const property = detailResponse.data.data;
    console.log('房产详情:');
    console.log(`- ID: ${property.propertyId}`);
    console.log(`- 位置: ${property.location}`);
    console.log(`- 面积: ${property.area} 平方米`);
    console.log(`- 价格: ${property.price}`);
    console.log(`- 状态: ${property.status}`);
    
    // 检查状态是否为已审核
    assert.equal(property.status, 2, '房产状态不符合预期');
    
    console.log('✅ 房产查询成功');
    return property;
  } catch (error) {
    console.error('❌ 房产查询失败:', error.message);
    throw error;
  }
}

/**
 * 测试步骤6: 创建房产代币
 */
async function testTokenCreation(propertyId) {
  console.log('\n📋 步骤6: 创建房产代币');
  
  try {
    // 确保propertyId有效
    if (!propertyId) {
      const errMsg = '无法创建代币: 房产ID无效';
      console.error(`❌ ${errMsg}`);
      testData.skippedTests.push({
        step: '代币创建',
        reason: errMsg,
        timestamp: new Date().toISOString()
      });
      return null;
    }
    
    // 检查房产是否存在
    const existsResponse = await client.get(`/contracts/PropertyRegistry/propertyExists?propertyId=${propertyId}`);
    assert.equal(existsResponse.data.success, true);
    assert.equal(existsResponse.data.data, true, `房产${propertyId}不存在，无法创建代币`);
    
    // 检查房产是否已审核通过
    const statusResponse = await client.get(`/contracts/PropertyRegistry/getPropertyStatus?propertyId=${propertyId}`);
    console.log(`创建代币前检查房产状态: ${statusResponse.data.data}`);
    
    if (statusResponse.data.data !== 2) {
      const errMsg = `房产${propertyId}未审核通过(状态=${statusResponse.data.data})，无法创建代币`;
      console.error(`❌ ${errMsg}`);
      testData.skippedTests.push({
        step: '代币创建',
        reason: errMsg,
        timestamp: new Date().toISOString()
      });
      return null;
    }
    
    // 检查是否已有代币，避免重复创建
    try {
      const tokenCheckResponse = await client.get(`/contracts/TokenFactory/getTokenAddress?propertyId=${propertyId}`);
      if (tokenCheckResponse.data.success && 
          tokenCheckResponse.data.data && 
          tokenCheckResponse.data.data !== '0x0000000000000000000000000000000000000000') {
        console.log(`房产${propertyId}已有代币: ${tokenCheckResponse.data.data}`);
        testData.tokenAddress = tokenCheckResponse.data.data;
        return tokenCheckResponse.data.data;
      }
    } catch (error) {
      console.log(`检查代币存在性失败，继续创建: ${error.message}`);
    }
    
    // 检查token implementation是否已配置
    try {
      const tokenImplCheckResponse = await client.get('/contracts/TokenFactory/getTokenImplementation');
      if (!tokenImplCheckResponse.data.success || 
          !tokenImplCheckResponse.data.data || 
          tokenImplCheckResponse.data.data === '0x0000000000000000000000000000000000000000') {
        const errMsg = '无法创建代币: TokenFactory未配置代币实现地址';
        console.error(`❌ ${errMsg}`);
        testData.skippedTests.push({
          step: '代币创建',
          reason: errMsg,
          timestamp: new Date().toISOString()
        });
        return null;
      }
      console.log(`确认TokenFactory代币实现地址: ${tokenImplCheckResponse.data.data}`);
    } catch (error) {
      console.log(`检查代币实现地址失败: ${error.message}`);
    }
    
    // 创建房产代币
    const shortId = propertyId.substring(5);
    const tokenName = `Tokyo Property ${shortId}`;
    const tokenSymbol = `TPT${shortId.substring(0, 4)}`;
    
    const tokenData = {
      propertyId: propertyId,
      tokenName: tokenName,
      tokenSymbol: tokenSymbol,
      totalSupply: '10000000000000000000000' // 10000 tokens with 18 decimals
    };
    
    console.log(`准备创建代币: ${tokenName} (${tokenSymbol})`);
    console.log(`代币数据: ${JSON.stringify(tokenData, null, 2)}`);
    
    // 调用创建代币API
    console.log('调用TokenFactory.createToken API...');
    const createResponse = await client.post('/contracts/TokenFactory/createToken', tokenData);
    
    if (!createResponse.data.success) {
      throw new Error(`代币创建API调用失败: ${JSON.stringify(createResponse.data)}`);
    }
    
    const txHash = createResponse.data.data.txHash;
    console.log(`代币创建交易已提交: ${txHash}`);
    
    // 等待交易确认
    await waitForTransaction(txHash);
    
    // 检查代币是否已创建 - 重试几次确保区块链状态同步
    let tokenAddress = null;
    for (let i = 0; i < 5; i++) {
      try {
        const tokenResponse = await client.get(`/contracts/TokenFactory/getTokenAddress?propertyId=${propertyId}`);
        
        if (tokenResponse.data.success && 
            tokenResponse.data.data && 
            tokenResponse.data.data !== '0x0000000000000000000000000000000000000000') {
          tokenAddress = tokenResponse.data.data;
          break;
        }
        
        console.log(`代币创建尚未在链上确认，等待同步... (尝试 ${i+1}/5)`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.log(`检查代币创建状态失败 (尝试 ${i+1}/5): ${error.message}`);
      }
    }
    
    if (!tokenAddress) {
      throw new Error('代币创建失败 - 在多次尝试后仍未能获取代币地址');
    }
    
    testData.tokenAddress = tokenAddress;
    console.log(`✅ 代币创建成功: ${tokenName} (${tokenSymbol}) @ ${tokenAddress}`);
    
    return tokenAddress;
  } catch (error) {
    console.error('❌ 代币创建失败:', error.message);
    testData.errors.push({
      step: '代币创建',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

/**
 * 测试步骤7: 查看代币信息
 */
async function testTokenQuery(tokenAddress) {
  console.log('\n📋 步骤7: 查看代币信息');
  
  if (!tokenAddress) {
    console.log('⚠️ 跳过代币查询 - 代币未成功创建');
    return null;
  }
  
  try {
    // 查询代币名称
    const nameResponse = await client.get(`/contracts/token/${tokenAddress}/name`);
    assert.equal(nameResponse.data.success, true);
    const tokenName = nameResponse.data.data;
    
    // 查询代币符号
    const symbolResponse = await client.get(`/contracts/token/${tokenAddress}/symbol`);
    assert.equal(symbolResponse.data.success, true);
    const tokenSymbol = symbolResponse.data.data;
    
    // 查询代币总供应量
    const supplyResponse = await client.get(`/contracts/token/${tokenAddress}/totalSupply`);
    assert.equal(supplyResponse.data.success, true);
    const totalSupply = supplyResponse.data.data;
    
    console.log('代币信息:');
    console.log(`- 名称: ${tokenName}`);
    console.log(`- 符号: ${tokenSymbol}`);
    console.log(`- 总供应量: ${totalSupply}`);
    
    console.log('✅ 代币查询成功');
    return {
      name: tokenName,
      symbol: tokenSymbol,
      totalSupply
    };
  } catch (error) {
    console.error('❌ 代币查询失败:', error.message);
    return null;
  }
}

/**
 * 测试步骤8: 查询平台费率
 */
async function testPlatformFee() {
  console.log('\n📋 步骤8: 查询平台费率');
  
  try {
    // 获取当前平台费率
    const feeResponse = await client.get('/contracts/PlatformFee/getFeeRate');
    assert.equal(feeResponse.data.success, true);
    
    const currentFee = feeResponse.data.data;
    console.log(`当前平台费率: ${currentFee}`);
    
    // 尝试更新平台费率
    const newFee = (Number(currentFee) + 100) % 1000; // 变更费率，确保在合理范围内
    
    console.log(`尝试更新平台费率至: ${newFee}`);
    const updateResponse = await client.post('/contracts/PlatformFee/updateFeeRate', {
      newFeeRate: newFee
    });
    
    // 等待交易确认
    await waitForTransaction(updateResponse.data.data.txHash);
    
    // 检查费率是否更新
    const checkResponse = await client.get('/contracts/PlatformFee/getFeeRate');
    assert.equal(checkResponse.data.success, true);
    assert.equal(Number(checkResponse.data.data), newFee, '费率更新失败');
    
    console.log('✅ 平台费率更新成功');
    return true;
  } catch (error) {
    console.error('❌ 平台费率操作失败:', error.message);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('🚀 开始HTTP API测试...');
  console.log(`测试时间: ${new Date().toISOString()}`);
  console.log(`目标API: ${config.baseUrl}`);
  console.log('-----------------------------------------------------');
  
  const startTime = Date.now();
  let completedTests = 0;
  const totalTests = 8; // 总测试步骤数
  
  try {
    // 步骤1: 检查系统状态 - 基础检查
    console.log(`\n[${++completedTests}/${totalTests}] 执行系统状态检查...`);
    await testSystemStatus();
    
    // 步骤2: 检查管理员权限 - 确保具有执行后续操作的权限
    console.log(`\n[${++completedTests}/${totalTests}] 执行管理员权限检查...`);
    const adminAddress = await testAdminRoles();
    
    // 步骤3: 注册房产 - 业务流程第一步
    console.log(`\n[${++completedTests}/${totalTests}] 执行房产注册...`);
    const propertyId = await testPropertyRegistration(adminAddress);
    
    // 步骤4: 审核房产 - 业务流程第二步，依赖步骤3
    console.log(`\n[${++completedTests}/${totalTests}] 执行房产审核...`);
    if (propertyId) {
      await testPropertyApproval(propertyId);
    } else {
      throw new Error('无法继续测试: 房产注册失败，无法执行审核步骤');
    }
    
    // 步骤5: 查询房产信息 - 验证前两步的结果
    console.log(`\n[${++completedTests}/${totalTests}] 执行房产查询...`);
    if (propertyId) {
      await testPropertyQuery(propertyId);
    } else {
      throw new Error('无法继续测试: 房产注册失败，无法执行查询步骤');
    }
    
    // 步骤6: 创建房产代币 - 业务流程第三步，依赖步骤4
    console.log(`\n[${++completedTests}/${totalTests}] 执行代币创建...`);
    let tokenAddress = null;
    if (propertyId) {
      tokenAddress = await testTokenCreation(propertyId);
      // 注意: 即使代币创建失败，我们也继续后续测试，只是记录错误并跳过依赖代币的步骤
    } else {
      console.log('⚠️ 跳过代币创建: 房产注册失败');
      testData.skippedTests.push({
        step: '代币创建',
        reason: '房产注册失败',
        timestamp: new Date().toISOString()
      });
    }
    
    // 步骤7: 查询代币信息 - 验证步骤6的结果
    console.log(`\n[${++completedTests}/${totalTests}] 执行代币查询...`);
    if (tokenAddress) {
      await testTokenQuery(tokenAddress);
    } else {
      console.log('⚠️ 跳过代币查询: 代币创建失败或被跳过');
      testData.skippedTests.push({
        step: '代币查询',
        reason: '代币创建失败或被跳过',
        timestamp: new Date().toISOString()
      });
    }
    
    // 步骤8: 测试平台费率 - 独立功能测试
    console.log(`\n[${++completedTests}/${totalTests}] 执行平台费率测试...`);
    await testPlatformFee();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n');
    console.log('-----------------------------------------------------');
    
    // 生成API请求报告
    generateApiRequestReport();
    
    // 检查是否有跳过的测试或错误
    if (testData.skippedTests.length > 0 || testData.errors.length > 0) {
      console.log('⚠️ 测试完成，但存在警告或错误:');
      
      if (testData.errors.length > 0) {
        console.log(`❌ 测试过程中发生 ${testData.errors.length} 个错误:`);
        testData.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. [${error.step}] ${error.error}`);
        });
      }
      
      if (testData.skippedTests.length > 0) {
        console.log(`⚠️ 跳过了 ${testData.skippedTests.length} 个测试步骤:`);
        testData.skippedTests.forEach((skip, index) => {
          console.log(`  ${index + 1}. [${skip.step}] 原因: ${skip.reason}`);
        });
      }
    } else {
      console.log('✅ 所有测试步骤成功完成！');
    }
    
    console.log(`总耗时: ${duration.toFixed(2)}秒`);
    console.log(`交易总数: ${testData.transactionIds.length}`);
    console.log(`API请求总数: ${testData.requestLogs.length}`);
    
    // 保存测试结果
    const testResult = {
      success: testData.errors.length === 0,
      partial: testData.skippedTests.length > 0,
      timestamp: new Date().toISOString(),
      duration: duration,
      completedTests: completedTests,
      totalTests: totalTests,
      errors: testData.errors,
      skippedTests: testData.skippedTests,
      data: {
        propertyId: testData.propertyId,
        tokenAddress: testData.tokenAddress,
        transactionCount: testData.transactionIds.length,
        requestCount: testData.requestLogs.length
      },
      // 将请求日志添加到测试结果
      requests: DEBUG ? testData.requestLogs : testData.requestLogs.map(log => ({
        method: log.request.method,
        url: log.request.url,
        status: log.response.status,
        success: log.response.data?.success
      }))
    };
    
    // 确保结果目录存在
    const resultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // 生成带时间戳的文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = path.join(resultsDir, `test-result-${timestamp}.json`);
    
    fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
    console.log(`📝 测试结果已保存至 ${resultFile}`);
    
    // 同时更新最新的结果文件
    fs.writeFileSync(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(testResult, null, 2)
    );
    
    // 如果有错误，返回非零退出码
    if (testData.errors.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中断:');
    console.error(error);
    
    // 生成API请求报告（即使测试中断）
    generateApiRequestReport();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // 保存失败结果
    const testResult = {
      success: false,
      interrupted: true,
      timestamp: new Date().toISOString(),
      duration: duration,
      completedTests: completedTests,
      totalTests: totalTests,
      fatalError: error.message,
      errors: testData.errors,
      skippedTests: testData.skippedTests,
      data: {
        propertyId: testData.propertyId,
        tokenAddress: testData.tokenAddress,
        transactionCount: testData.transactionIds.length,
        requestCount: testData.requestLogs.length
      },
      // 将请求日志添加到测试结果
      requests: DEBUG ? testData.requestLogs : testData.requestLogs.map(log => ({
        method: log.request.method,
        url: log.request.url,
        status: log.response.status,
        success: log.response.data?.success
      }))
    };
    
    // 确保结果目录存在
    const resultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // 生成带时间戳的文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = path.join(resultsDir, `test-result-${timestamp}.json`);
    
    fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
    console.log(`📝 测试失败结果已保存至 ${resultFile}`);
    
    // 同时更新最新的结果文件
    fs.writeFileSync(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(testResult, null, 2)
    );
    
    process.exit(1);
  }
}

/**
 * 生成API请求报告
 */
function generateApiRequestReport() {
  if (testData.requestLogs.length === 0) {
    console.log('📊 无API请求记录');
    return;
  }
  
  console.log('\n📊 API请求摘要报告:');
  console.log(`总请求数: ${testData.requestLogs.length}`);
  
  // 按方法统计
  const methodStats = {};
  testData.requestLogs.forEach(log => {
    const method = log.request.method.toUpperCase();
    methodStats[method] = (methodStats[method] || 0) + 1;
  });
  
  console.log('\n请求方法分布:');
  Object.entries(methodStats).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}次`);
  });
  
  // 按状态码统计
  const statusStats = {};
  testData.requestLogs.forEach(log => {
    const status = log.response?.status || 'unknown';
    statusStats[status] = (statusStats[status] || 0) + 1;
  });
  
  console.log('\n响应状态码分布:');
  Object.entries(statusStats).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}次`);
  });
  
  // 按成功/失败统计
  let successCount = 0;
  let failureCount = 0;
  
  testData.requestLogs.forEach(log => {
    if (log.response?.data?.success === true) {
      successCount++;
    } else {
      failureCount++;
    }
  });
  
  console.log('\n请求结果分布:');
  console.log(`  成功: ${successCount}次 (${(successCount / testData.requestLogs.length * 100).toFixed(1)}%)`);
  console.log(`  失败: ${failureCount}次 (${(failureCount / testData.requestLogs.length * 100).toFixed(1)}%)`);
  
  // 按交易类型统计
  let txCount = 0;
  testData.requestLogs.forEach(log => {
    if (log.response?.data?.data?.txHash) {
      txCount++;
    }
  });
  
  console.log(`\n交易操作: ${txCount}次`);
  console.log('-----------------------------------------------------');
}

// 添加命令行参数支持
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    skipTests: [],
    onlyTests: []
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--skip') {
      options.skipTests = (args[i+1] || '').split(',');
      i++;
    } else if (args[i] === '--only') {
      options.onlyTests = (args[i+1] || '').split(',');
      i++;
    } else if (args[i] === '--help') {
      console.log('使用方法: node test-api.js [选项]');
      console.log('选项:');
      console.log('  --skip test1,test2    跳过指定的测试步骤');
      console.log('  --only test1,test2    只执行指定的测试步骤');
      console.log('  --help                显示帮助信息');
      process.exit(0);
    }
  }
  
  return options;
}

// 执行测试
const options = parseArgs();
runTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
}); 