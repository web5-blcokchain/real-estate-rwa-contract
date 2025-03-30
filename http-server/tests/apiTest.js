/**
 * API测试脚本
 * 测试HTTP服务器的核心功能
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 测试配置
const config = {
  baseUrl: 'http://localhost:3031',
  apiKey: 'default-api-key', // 你的API密钥，来自于.env配置
  testTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // 示例交易哈希
  testBlockNumber: 'latest', // 示例区块号
  testAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // 使用有效的地址
  testContractName: 'RealEstateSystem', // 示例合约名称
  testFeeType: 0, // 示例费用类型
  testAmount: 1000, // 示例金额
  testRole: 'SUPER_ADMIN', // 使用系统中定义的角色名
  testRoleBytes: '0x0000000000000000000000000000000000000000000000000000000000000000', // 角色的bytes32表示
  testPropertyId: 1, // 示例房产ID
  testTokenAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // 使用有效的地址
  saveResults: true,
  // 测试顺序控制
  waitForTransaction: true, // 是否等待交易确认
  transactionTimeout: 30000, // 等待交易确认的超时时间（毫秒）
  // 保存有效的交易哈希和ID供后续测试使用
  dynamicData: {
    validTxHash: null,
    validPropertyId: null,
    validTokenAddress: null
  }
};

// 结果记录
const results = {
  success: 0,
  fail: 0,
  total: 0,
  startTime: new Date(),
  endTime: null,
  tests: []
};

// 将API密钥添加到URL
function addApiKey(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}api_key=${config.apiKey}`;
}

// 记录测试结果
function recordTest(name, success, response, error) {
  results.total++;
  if (success) {
    results.success++;
  } else {
    results.fail++;
  }
  results.tests.push({
    name,
    success,
    response: success ? response : null,
    error: !success ? (error ? error.message : 'Unknown error') : null,
    timestamp: new Date().toISOString()
  });
  
  if (success) {
    console.log(`✅ ${name}: 成功`);
  } else {
    console.error(`❌ ${name}: 失败 - ${error ? error.message : 'Unknown error'}`);
  }
}

// 保存测试结果
function saveTestResults() {
  results.endTime = new Date();
  results.duration = results.endTime - results.startTime;
  
  const resultsDir = path.join(__dirname, '../test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const filename = path.join(resultsDir, `test-result-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`测试结果已保存到: ${filename}`);
  
  // 调用清理函数
  cleanupOldTestResults(resultsDir, filename);
}

// 清理旧的测试结果文件，只保留最新的5个
function cleanupOldTestResults(resultsDir, currentFile) {
  try {
    // 获取所有测试结果文件
    const files = fs.readdirSync(resultsDir)
      .filter(file => file.startsWith('test-result-') && file.endsWith('.json'))
      .map(file => path.join(resultsDir, file))
      .sort((a, b) => {
        // 根据文件修改时间排序，最新的在前面
        return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
      });
    
    // 保留最新的5个文件，删除其余的
    const filesToKeep = 5;
    if (files.length > filesToKeep) {
      const filesToDelete = files.slice(filesToKeep);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file);
          console.log(`已删除旧的测试结果文件: ${path.basename(file)}`);
        } catch (err) {
          console.error(`删除文件失败: ${path.basename(file)}`, err.message);
        }
      });
      console.log(`清理完成，保留最新的${filesToKeep}个测试结果文件`);
    }
  } catch (error) {
    console.error(`清理旧测试结果文件时发生错误: ${error.message}`);
  }
}

// 添加详细的请求日志功能
async function loggedRequest(method, url, data = null) {
  const fullUrl = addApiKey(url);
  console.log(`\n📡 请求: ${method.toUpperCase()} ${fullUrl}`);
  
  if (data) {
    console.log(`📦 请求参数: ${JSON.stringify(data, null, 2)}`);
  }
  
  try {
    let response;
    if (method.toLowerCase() === 'get') {
      response = await axios.get(fullUrl);
    } else if (method.toLowerCase() === 'post') {
      response = await axios.post(fullUrl, data);
    } else if (method.toLowerCase() === 'put') {
      response = await axios.put(fullUrl, data);
    } else if (method.toLowerCase() === 'delete') {
      response = await axios.delete(fullUrl);
    }
    
    console.log(`📥 响应状态: ${response.status}`);
    console.log(`📄 响应数据: ${JSON.stringify(response.data, null, 2)}`);
    
    return response;
  } catch (error) {
    console.error(`❌ 请求失败: ${error.message}`);
    
    if (error.response) {
      console.error(`📉 响应状态: ${error.response.status}`);
      console.error(`📄 响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    throw error;
  }
}

// 修改服务状态查询测试，使用loggedRequest
async function testGetServiceStatus() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/status`);
    recordTest('获取API服务状态', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取API服务状态', false, null, error);
    return null;
  }
}

// 修改获取区块链连接状态测试，使用loggedRequest
async function testGetBlockchainStatus() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/status/blockchain`);
    recordTest('获取区块链连接状态', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取区块链连接状态', false, null, error);
    return null;
  }
}

// 修改获取系统状态测试，使用loggedRequest
async function testGetSystemStatus() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/system/status`);
    
    // 检查响应数据结构
    if (response.data && response.data.status === 'success') {
      recordTest('获取系统状态', true, response.data);
      return response.data;
    } else {
      // 响应格式不正确
      recordTest('获取系统状态', false, response.data, new Error('无效的响应格式'));
      return null;
    }
  } catch (error) {
    recordTest('获取系统状态', false, null, error);
    return null;
  }
}

// 修改获取角色列表测试，使用loggedRequest
async function testGetRoles() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/roles`);
    recordTest('获取所有角色', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取所有角色', false, null, error);
    return null;
  }
}

// 修改检查角色测试，修复linter错误并增强错误处理
async function testCheckRole() {
  try {
    const url = `${config.baseUrl}/api/v1/roles/${config.testRole}/check/${config.testAddress}`;
    const response = await loggedRequest('get', url);
    recordTest(`检查地址是否拥有角色 ${config.testRole}`, true, response.data);
    return response.data;
  } catch (error) {
    console.log(`\n🔍 检查角色失败，尝试替代方案...`);
    
    // 如果是400错误，可能是因为角色格式问题，尝试使用字节格式
    if (error.response && error.response.status === 400) {
      try {
        console.log('尝试使用角色字节格式重新请求...');
        const retryUrl = `${config.baseUrl}/api/v1/roles/check?role=${config.testRoleBytes}&account=${config.testAddress}`;
        const retryResponse = await loggedRequest('get', retryUrl);
        recordTest(`检查地址是否拥有角色 ${config.testRole}（字节格式）`, true, retryResponse.data);
        return retryResponse.data;
      } catch (retryError) {
        recordTest(`检查地址是否拥有角色 ${config.testRole}（字节格式）`, false, null, retryError);
        return null;
      }
    } else if (error.response && error.response.status === 500) {
      // 500错误可能是因为合约调用问题
      console.log('\n🔍 服务器错误，尝试检查具体原因...');
      // 这里可以添加更多的错误诊断逻辑
    }
    
    recordTest(`检查地址是否拥有角色 ${config.testRole}`, false, null, error);
    return null;
  }
}

// 修改创建代币函数，修复linter错误并增强错误处理
async function testCreateToken() {
  // 使用动态获取的房产ID，如果没有则使用配置中的默认值
  const propertyId = config.dynamicData.validPropertyId || config.testPropertyId;
  
  const requestData = {
    name: '测试代币',
    symbol: 'TEST',
    propertyId: propertyId,
    initialSupply: '1000000000000000000' // 1 token with 18 decimals
  };
  
  try {
    const response = await loggedRequest('post', `${config.baseUrl}/api/v1/tokens`, requestData);
    recordTest('创建新代币', true, response.data);
    
    // 保存返回的代币地址供后续测试使用
    if (response.data?.data?.tokenAddress) {
      saveDynamicData('validTokenAddress', response.data.data.tokenAddress);
    }
    
    // 处理交易响应，等待确认
    await handleTransactionResponse(response.data);
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('\n🔍 创建代币失败 (400错误)，可能是参数问题：');
      console.log(`- 检查propertyId是否有效: ${propertyId}`);
      console.log('- 检查房产是否已被批准');
    } else if (error.response && error.response.status === 500) {
      console.log('\n🔍 创建代币失败 (500错误)，可能是合约调用问题：');
      console.log('- 检查TokenFactory合约是否正确部署');
      console.log('- 检查调用账户是否有权限创建代币');
    }
    
    recordTest('创建新代币', false, null, error);
    return null;
  }
}

// 修改获取合约地址测试，使用loggedRequest
async function testGetContractAddress() {
  try {
    const url = `${config.baseUrl}/api/v1/contracts/${config.testContractName}/address`;
    const response = await loggedRequest('get', url);
    recordTest(`获取合约 ${config.testContractName} 地址`, true, response.data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`\n🔍 获取合约地址失败 (404错误)，检查合约名称：`);
      console.log(`- 当前测试的合约名称: ${config.testContractName}`);
      console.log(`- 尝试获取所有可用合约列表，检查正确的名称`);
    }
    
    recordTest(`获取合约 ${config.testContractName} 地址`, false, null, error);
    return null;
  }
}

// 修改等待交易确认函数，增加更多日志
async function waitForTransactionConfirmation(txHash, timeout = config.transactionTimeout) {
  if (!config.waitForTransaction || !txHash) {
    return null;
  }
  
  console.log(`\n⏳ 等待交易确认: ${txHash}`);
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      console.log(`\n📡 查询交易状态: GET ${config.baseUrl}/api/v1/transactions/status/${txHash}`);
      const response = await axios.get(addApiKey(`${config.baseUrl}/api/v1/transactions/status/${txHash}`));
      console.log(`📥 状态查询响应: ${JSON.stringify(response.data, null, 2)}`);
      
      const status = response.data?.data?.status;
      
      if (status === 'confirmed') {
        console.log(`✅ 交易已确认: ${txHash}`);
        return response.data;
      } else if (status === 'failed') {
        console.error(`❌ 交易失败: ${txHash}`);
        
        // 尝试获取失败详情
        try {
          const receiptResponse = await axios.get(addApiKey(`${config.baseUrl}/api/v1/transactions/receipt/${txHash}`));
          console.log(`📄 交易收据: ${JSON.stringify(receiptResponse.data, null, 2)}`);
        } catch (receiptError) {
          console.error(`无法获取交易收据: ${receiptError.message}`);
        }
        
        return null;
      }
      
      console.log(`⏳ 交易状态: ${status || '未知'}`);
      // 等待一段时间再继续查询
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`查询交易状态出错: ${error.message}`);
      // 继续尝试，直到超时
    }
  }
  
  console.error(`⏱️ 等待交易确认超时: ${txHash}`);
  return null;
}

// 保存动态数据，如交易哈希、房产ID等
function saveDynamicData(key, value) {
  if (value && Object.prototype.hasOwnProperty.call(config.dynamicData, key)) {
    config.dynamicData[key] = value;
    console.log(`📝 记录动态数据: ${key} = ${value}`);
  }
}

// 添加更健壮的处理交易响应的函数
async function handleTransactionResponse(response, name = '') {
  if (!response) return null;
  
  try {
    // 检查是否是标准的响应对象
    if (response.status === 'success' && response.data && response.data.txHash) {
      const txHash = response.data.txHash;
      saveDynamicData('validTxHash', txHash);
      
      // 等待交易确认
      return await waitForTransactionConfirmation(txHash);
    }
    // 检查嵌套的响应对象
    else if (response.data && response.data.status === 'success' && response.data.data && response.data.data.txHash) {
      const txHash = response.data.data.txHash;
      saveDynamicData('validTxHash', txHash);
      
      // 等待交易确认
      return await waitForTransactionConfirmation(txHash);
    }
  } catch (error) {
    console.error(`处理交易响应出错(${name}): ${error.message}`);
  }
  
  return null;
}

// === 系统管理测试 ===
async function testGetLinkedContracts() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/system/linked-contracts`);
    recordTest('获取系统链接的合约地址', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取系统链接的合约地址', false, null, error);
    return null;
  }
}

// === 费用管理测试 ===
async function testGetFeeTypes() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/fees/types`);
    recordTest('获取所有费用类型', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取所有费用类型', false, null, error);
    return null;
  }
}

async function testGetFeePercentage() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/fees/percentage/${config.testFeeType}`);
    recordTest(`获取费用类型 ${config.testFeeType} 的百分比`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取费用类型 ${config.testFeeType} 的百分比`, false, null, error);
    return null;
  }
}

async function testGetAllFeePercentages() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/fees/percentages`);
    recordTest('获取所有费用百分比', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取所有费用百分比', false, null, error);
    return null;
  }
}

async function testGetFeeReceiver() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/fees/receiver`);
    recordTest('获取费用接收者地址', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取费用接收者地址', false, null, error);
    return null;
  }
}

async function testCalculateFee() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/fees/calculate?amount=${config.testAmount}`);
    recordTest(`计算费用金额 (${config.testAmount})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`计算费用金额 (${config.testAmount})`, false, null, error);
    return null;
  }
}

// === 合约信息测试 ===
async function testGetAllContractAddresses() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/contracts`);
    recordTest('获取所有合约地址', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取所有合约地址', false, null, error);
    return null;
  }
}

async function testGetContractInfo() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/contracts/${config.testContractName}/info`);
    recordTest(`获取合约 ${config.testContractName} 信息`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取合约 ${config.testContractName} 信息`, false, null, error);
    return null;
  }
}

async function testIsContractDeployed() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/contracts/${config.testContractName}/deployed`);
    recordTest(`检查合约 ${config.testContractName} 是否已部署`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`检查合约 ${config.testContractName} 是否已部署`, false, null, error);
    return null;
  }
}

// === 交易查询测试 ===
async function testGetTransactionStatus() {
  // 使用动态获取的交易哈希，如果没有则使用配置中的默认值
  const txHash = config.dynamicData.validTxHash || config.testTxHash;
  
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/transactions/status/${txHash}`);
    recordTest(`获取交易状态 (${txHash})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取交易状态 (${txHash})`, false, null, error);
    return null;
  }
}

async function testGetTransactionReceipt() {
  // 使用动态获取的交易哈希，如果没有则使用配置中的默认值
  const txHash = config.dynamicData.validTxHash || config.testTxHash;
  
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/transactions/receipt/${txHash}`);
    recordTest(`获取交易收据 (${txHash})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取交易收据 (${txHash})`, false, null, error);
    return null;
  }
}

async function testGetTransactionDetails() {
  // 使用动态获取的交易哈希，如果没有则使用配置中的默认值
  const txHash = config.dynamicData.validTxHash || config.testTxHash;
  
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/transactions/details/${txHash}`);
    recordTest(`获取交易详情 (${txHash})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取交易详情 (${txHash})`, false, null, error);
    return null;
  }
}

async function testGetBlock() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/transactions/block/${config.testBlockNumber}`);
    recordTest(`获取区块信息 (${config.testBlockNumber})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取区块信息 (${config.testBlockNumber})`, false, null, error);
    return null;
  }
}

async function testGetBalance() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/transactions/balance/${config.testAddress}`);
    recordTest(`获取账户余额 (${config.testAddress})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取账户余额 (${config.testAddress})`, false, null, error);
    return null;
  }
}

async function testGetRoleMembers() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/roles/${config.testRole}/members`);
    recordTest(`获取角色 ${config.testRole} 的所有成员`, true, response.data);
    return response.data;
  } catch (error) {
    // 如果是400错误，可能是因为角色格式问题，尝试使用字节格式
    if (error.response && error.response.status === 400) {
      try {
        console.log('尝试使用角色字节格式重新请求...');
        const retryUrl = `${config.baseUrl}/api/v1/roles/members?role=${config.testRoleBytes}`;
        const retryResponse = await loggedRequest('get', retryUrl);
        recordTest(`获取角色 ${config.testRole} 的所有成员（字节格式）`, true, retryResponse.data);
        return retryResponse.data;
      } catch (retryError) {
        recordTest(`获取角色 ${config.testRole} 的所有成员（字节格式）`, false, null, retryError);
        return null;
      }
    }
    
    recordTest(`获取角色 ${config.testRole} 的所有成员`, false, null, error);
    return null;
  }
}

async function testGrantRole() {
  try {
    const requestData = {
      role: config.testRole,
      account: config.testAddress
    };
    const response = await loggedRequest('post', `${config.baseUrl}/api/v1/roles/grant`, requestData);
    recordTest(`授予角色 ${config.testRole}`, true, response.data);
    
    // 处理交易响应，等待确认
    await handleTransactionResponse(response.data);
    
    return response.data;
  } catch (error) {
    // 如果是400错误，可能是因为角色格式问题，尝试使用字节格式
    if (error.response && error.response.status === 400) {
      try {
        console.log('尝试使用角色字节格式重新请求...');
        const retryData = {
          role: config.testRoleBytes,
          account: config.testAddress
        };
        const retryResponse = await loggedRequest('post', `${config.baseUrl}/api/v1/roles/grant`, retryData);
        recordTest(`授予角色 ${config.testRole}（字节格式）`, true, retryResponse.data);
        
        // 处理交易响应，等待确认
        await handleTransactionResponse(retryResponse.data);
        
        return retryResponse.data;
      } catch (retryError) {
        recordTest(`授予角色 ${config.testRole}（字节格式）`, false, null, retryError);
        return null;
      }
    } else if (error.response && error.response.status === 500) {
      console.log('\n🔍 授予角色失败 (500错误)，可能是合约调用问题：');
      console.log('- 检查RoleManager合约是否正确部署');
      console.log('- 检查调用账户是否有权限分配角色');
    }
    
    recordTest(`授予角色 ${config.testRole}`, false, null, error);
    return null;
  }
}

async function testRevokeRole() {
  try {
    const requestData = {
      role: config.testRole,
      account: config.testAddress
    };
    const response = await loggedRequest('post', `${config.baseUrl}/api/v1/roles/revoke`, requestData);
    recordTest(`撤销角色 ${config.testRole}`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`撤销角色 ${config.testRole}`, false, null, error);
    return null;
  }
}

async function testGetRoleAdmin() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/roles/${config.testRole}/admin`);
    recordTest(`获取角色 ${config.testRole} 的管理员`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取角色 ${config.testRole} 的管理员`, false, null, error);
    return null;
  }
}

// === 代币管理测试 ===
async function testGetTokenCount() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/tokens/count`);
    recordTest('获取代币总数', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取代币总数', false, null, error);
    return null;
  }
}

async function testGetTokens() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/tokens`);
    recordTest('获取代币列表', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取代币列表', false, null, error);
    return null;
  }
}

async function testGetTokenByAddress() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/tokens/${config.testTokenAddress}`);
    recordTest(`获取代币详情 (${config.testTokenAddress})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取代币详情 (${config.testTokenAddress})`, false, null, error);
    return null;
  }
}

async function testGetTokenImplementation() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/tokens/implementation/address`);
    recordTest('获取代币实现合约地址', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取代币实现合约地址', false, null, error);
    return null;
  }
}

// === 房产管理测试 ===
async function testGetPropertyCount() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/properties/count`);
    recordTest('获取房产总数', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取房产总数', false, null, error);
    return null;
  }
}

async function testGetProperties() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/properties`);
    recordTest('获取房产列表', true, response.data);
    return response.data;
  } catch (error) {
    recordTest('获取房产列表', false, null, error);
    return null;
  }
}

async function testGetPropertyById() {
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/properties/${config.testPropertyId}`);
    recordTest(`获取房产详情 (ID: ${config.testPropertyId})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`获取房产详情 (ID: ${config.testPropertyId})`, false, null, error);
    return null;
  }
}

async function testRegisterProperty() {
  const requestData = {
    name: '测试房产',
    location: '测试地址',
    description: '这是一个测试房产',
    value: '1000000000000000000', // 1 ETH in wei
    metadata: {
      size: '100',
      rooms: '3',
      year: '2023'
    }
  };
  
  try {
    const response = await loggedRequest('post', `${config.baseUrl}/api/v1/properties`, requestData);
    recordTest('注册新房产', true, response.data);
    
    // 保存返回的房产ID供后续测试使用
    if (response.data?.data?.propertyId) {
      saveDynamicData('validPropertyId', response.data.data.propertyId);
    }
    
    // 处理交易响应，等待确认
    await handleTransactionResponse(response.data);
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log('\n🔍 注册房产失败 (500错误)，可能是合约调用问题：');
      console.log('- 检查PropertyRegistry合约是否正确部署');
      console.log('- 检查调用账户是否有权限注册房产');
    }
    
    recordTest('注册新房产', false, null, error);
    return null;
  }
}

async function testApproveProperty() {
  try {
    const response = await loggedRequest('put', `${config.baseUrl}/api/v1/properties/${config.testPropertyId}/approve`);
    recordTest(`审核房产 (ID: ${config.testPropertyId})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`审核房产 (ID: ${config.testPropertyId})`, false, null, error);
    return null;
  }
}

async function testRejectProperty() {
  const requestData = {
    reason: '测试拒绝原因'
  };
  
  try {
    const response = await loggedRequest('put', `${config.baseUrl}/api/v1/properties/${config.testPropertyId}/reject`, requestData);
    recordTest(`拒绝房产 (ID: ${config.testPropertyId})`, true, response.data);
    return response.data;
  } catch (error) {
    recordTest(`拒绝房产 (ID: ${config.testPropertyId})`, false, null, error);
    return null;
  }
}

// 增加合约诊断功能
async function diagnoseContractIssue(contractName) {
  console.log(`\n🔍 正在诊断合约 ${contractName} 的问题...`);
  
  try {
    // 1. 检查合约是否已部署
    const deployedRes = await loggedRequest('get', `${config.baseUrl}/api/v1/contracts/${contractName}/deployed`);
    
    if (!deployedRes.data.data.deployed) {
      console.log(`❌ 合约 ${contractName} 未部署，请先部署合约。`);
      return false;
    }
    
    // 2. 检查合约地址
    const addressRes = await loggedRequest('get', `${config.baseUrl}/api/v1/contracts/${contractName}/address`);
    const contractAddress = addressRes.data.data.address;
    
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      console.log(`❌ 合约 ${contractName} 地址无效: ${contractAddress}`);
      return false;
    }
    
    console.log(`✅ 合约 ${contractName} 已部署在地址: ${contractAddress}`);
    
    // 3. 检查合约信息
    const infoRes = await loggedRequest('get', `${config.baseUrl}/api/v1/contracts/${contractName}/info`);
    console.log(`ℹ️ 合约信息:`, infoRes.data.data);
    
    return true;
  } catch (error) {
    console.error(`❌ 诊断合约 ${contractName} 时出错: ${error.message}`);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return false;
  }
}

// 增强错误处理的测试助手函数
async function runTestWithDiagnosis(testFunction, dependsOnContract = null) {
  const result = await testFunction();
  
  // 如果测试失败，并且依赖特定合约，尝试诊断合约问题
  if (!result && dependsOnContract) {
    console.log(`\n⚠️ 测试失败，可能与合约 ${dependsOnContract} 有关，尝试诊断...`);
    await diagnoseContractIssue(dependsOnContract);
  }
  
  return result;
}

// 执行系统诊断，确保所有合约已正确部署
async function performSystemDiagnosis() {
  console.log('\n=== 执行系统诊断 ===');
  
  // 获取所有合约地址
  try {
    const response = await loggedRequest('get', `${config.baseUrl}/api/v1/contracts`);
    const contracts = response.data.data.contracts || [];
    
    console.log(`\n找到 ${contracts.length} 个合约:`);
    
    // 检查每个合约的部署状态
    for (const contract of contracts) {
      await diagnoseContractIssue(contract.name);
    }
    
    console.log('\n=== 诊断完成 ===');
    return contracts.length > 0;
  } catch (error) {
    console.error(`\n❌ 获取合约列表失败: ${error.message}`);
    return false;
  }
}

// 修改runAllTests函数，增加诊断功能
async function runAllTests() {
  console.log('开始 API 测试...');
  console.log('配置信息:');
  console.log(`- API 地址: ${config.baseUrl}`);
  console.log(`- API 密钥: ${config.apiKey}`);
  console.log(`- 等待交易确认: ${config.waitForTransaction ? '是' : '否'}`);
  console.log('----------------------------');
  
  try {
    // 执行系统诊断
    console.log('\n⭐ 执行系统诊断');
    const diagnosisResult = await performSystemDiagnosis();
    
    if (!diagnosisResult) {
      console.log('\n⚠️ 系统诊断发现问题，可能影响测试结果。是否继续？(测试将继续进行)');
      // 在实际环境中，可以添加用户确认逻辑
    }
    
    // 第1阶段: 基础服务和状态测试
    console.log('\n⭐ 第1阶段: 基础服务和状态测试');
    await testGetServiceStatus();
    await testGetBlockchainStatus();
    await runTestWithDiagnosis(testGetAllContractAddresses);
    await testGetSystemStatus();
    
    // 第2阶段: 角色和合约测试
    console.log('\n⭐ 第2阶段: 角色和合约测试');
    await runTestWithDiagnosis(testGetRoles, 'RealEstateSystem');
    await runTestWithDiagnosis(() => testCheckRole(), 'RealEstateSystem');
    await runTestWithDiagnosis(() => testGetRoleMembers(), 'RealEstateSystem');
    await runTestWithDiagnosis(() => testIsContractDeployed(), null);
    await runTestWithDiagnosis(testGetLinkedContracts, 'RealEstateSystem');
    
    // 第3阶段: 区块链信息测试
    console.log('\n⭐ 第3阶段: 区块链信息测试');
    await testGetBlock();
    await testGetBalance();
    
    // 第4阶段: 费用管理测试
    console.log('\n⭐ 第4阶段: 费用管理测试');
    await runTestWithDiagnosis(testGetFeeTypes, 'FeeManager');
    await runTestWithDiagnosis(() => testGetFeePercentage(), 'FeeManager');
    await runTestWithDiagnosis(testGetAllFeePercentages, 'FeeManager');
    await runTestWithDiagnosis(testGetFeeReceiver, 'FeeManager');
    await runTestWithDiagnosis(() => testCalculateFee(), 'FeeManager');
    
    // 第5阶段: 房产管理测试 (有依赖顺序)
    console.log('\n⭐ 第5阶段: 房产管理测试');
    await runTestWithDiagnosis(testGetPropertyCount, 'PropertyRegistry');
    await runTestWithDiagnosis(testGetProperties, 'PropertyRegistry');
    
    // 先注册一个房产
    console.log('\n📌 正在注册新房产用于后续测试...');
    const registerResult = await runTestWithDiagnosis(testRegisterProperty, 'PropertyRegistry');
    
    // 如果成功注册了房产，则继续相关测试
    if (registerResult && config.dynamicData.validPropertyId) {
      await runTestWithDiagnosis(() => testGetPropertyById(), 'PropertyRegistry');
      await runTestWithDiagnosis(() => testApproveProperty(), 'PropertyRegistry');
      
      // 第6阶段: 代币管理测试 (依赖已批准的房产)
      console.log('\n⭐ 第6阶段: 代币管理测试');
      await runTestWithDiagnosis(testGetTokenCount, 'TokenFactory');
      await runTestWithDiagnosis(testGetTokens, 'TokenFactory');
      
      // 创建一个代币
      console.log('\n📌 正在创建新代币用于后续测试...');
      const createTokenResult = await runTestWithDiagnosis(testCreateToken, 'TokenFactory');
      
      // 如果成功创建了代币，则继续相关测试
      if (createTokenResult && config.dynamicData.validTokenAddress) {
        await runTestWithDiagnosis(() => testGetTokenByAddress(), 'TokenFactory');
        await runTestWithDiagnosis(testGetTokenImplementation, 'TokenFactory');
      }
    } else {
      console.log('\n⚠️ 房产注册失败，跳过相关测试');
      // 仍然测试部分不依赖新房产的功能
      await runTestWithDiagnosis(testGetTokenCount, 'TokenFactory');
      await runTestWithDiagnosis(testGetTokens, 'TokenFactory');
      await runTestWithDiagnosis(testGetTokenImplementation, 'TokenFactory');
    }
    
    // 第7阶段: 交易测试 (依赖前面已产生的交易)
    console.log('\n⭐ 第7阶段: 交易测试');
    // 如果有有效的交易哈希，测试交易相关功能
    if (config.dynamicData.validTxHash) {
      await testGetTransactionStatus();
      await testGetTransactionReceipt();
      await testGetTransactionDetails();
    } else {
      console.log('\n⚠️ 未获取到有效交易哈希，使用模拟数据测试');
      await testGetTransactionStatus();
      await testGetTransactionReceipt();
      await testGetTransactionDetails();
    }
    
    // 第8阶段: 角色授权测试 (可能需要特殊权限)
    console.log('\n⭐ 第8阶段: 角色授权测试');
    await runTestWithDiagnosis(testGrantRole, 'RoleManager');
    await runTestWithDiagnosis(testRevokeRole, 'RoleManager');
    await runTestWithDiagnosis(() => testGetRoleAdmin(), 'RoleManager');
    
    // 第9阶段: 合约详情测试
    console.log('\n⭐ 第9阶段: 合约详情测试');
    await runTestWithDiagnosis(() => testGetContractAddress(), null);
    await runTestWithDiagnosis(() => testGetContractInfo(), null);
    
    // 第10阶段: 房产拒绝测试
    console.log('\n⭐ 第10阶段: 房产拒绝测试');
    if (config.dynamicData.validPropertyId) {
      await runTestWithDiagnosis(() => testRejectProperty(), 'PropertyRegistry');
    } else {
      console.log('\n⚠️ 未获取到有效房产ID，跳过拒绝房产测试');
    }
    
  } catch (error) {
    console.error(`\n❌ 测试过程中发生未捕获的错误: ${error.message}`);
    console.error(error.stack);
  } finally {
    // 输出测试结果
    console.log('\n=== 测试结果汇总 ===');
    console.log(`✅ 成功: ${results.success}`);
    console.log(`❌ 失败: ${results.fail}`);
    console.log(`📊 总计: ${results.total}`);
    console.log(`⏱️ 耗时: ${((new Date() - results.startTime) / 1000).toFixed(2)}秒`);
    
    // 保存测试结果
    if (config.saveResults) {
      saveTestResults();
    }
  }
}

// 启动测试
runAllTests(); 