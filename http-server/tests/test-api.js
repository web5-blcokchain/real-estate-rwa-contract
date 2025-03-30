/**
 * API测试脚本
 * 测试HTTP API服务的基本功能
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 测试配置
const config = {
  baseUrl: 'http://localhost:3030/api',
  apiKey: 'default-api-key',
  timeout: 5000,
  retryCount: 3,
  retryDelay: 1000,
  maxConcurrent: 5
};

// 测试数据存储
const testData = {
  results: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  startTime: new Date(),
  endTime: null,
  duration: 0,
  txIds: [],
  errors: []
};

// 创建HTTP客户端
const httpClient = axios.create({
  baseURL: config.baseUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': config.apiKey
  }
});

// 添加API密钥到URL
function addApiKey(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}api_key=${config.apiKey}`;
}

// 等待交易确认
async function waitForTx(txHash, retries = config.retryCount) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await httpClient.get(`/system/transaction/${txHash}`);
      const txStatus = response.data.data.status;
      
      if (txStatus === 'confirmed') {
        console.log(`✅ 交易已确认: ${txHash}`);
        return true;
      }
      
      if (txStatus === 'failed') {
        console.error(`❌ 交易失败: ${txHash}`);
        return false;
      }
      
      console.log(`⏳ 交易等待中(${i+1}/${retries}): ${txHash}`);
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    } catch (error) {
      console.error(`❌ 获取交易状态失败(${i+1}/${retries}): ${error.message}`);
      
      if (i === retries - 1) {
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    }
  }
  
  return false;
}

// 运行测试
async function runTest(name, testFn) {
  console.log(`\n🧪 开始测试: ${name}`);
  testData.results.total++;
  
  try {
    await testFn();
    console.log(`✅ 测试通过: ${name}`);
    testData.results.passed++;
    return true;
  } catch (error) {
    console.error(`❌ 测试失败: ${name}`);
    console.error(`   原因: ${error.message}`);
    
    testData.results.failed++;
    testData.errors.push({
      test: name,
      error: error.message,
      stack: error.stack
    });
    
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log(`\n🚀 开始HTTP API测试 - ${new Date().toISOString()}`);
  console.log(`📡 API地址: ${config.baseUrl}`);
  console.log(`🔑 API密钥: ${config.apiKey}`);
  console.log(`🐞 调试模式: 已启用\n`);
  
  // 测试1: 检查API状态
  await runTest('检查API状态', async () => {
    const response = await httpClient.get('/system/status');
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('API状态检查失败');
    }
    
    console.log(`  API状态: ${JSON.stringify(response.data)}`);
  });
  
  // 测试2: 获取系统信息
  await runTest('获取系统信息', async () => {
    const response = await httpClient.get('/system/info');
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('获取系统信息失败');
    }
    
    const systemInfo = response.data.data;
    console.log(`  系统状态: ${systemInfo.paused ? '已暂停' : '正常运行'}`);
    console.log(`  签名地址: ${systemInfo.signer}`);
    
    // 如果系统已暂停，尝试解除暂停
    if (systemInfo.paused) {
      console.log('  系统当前已暂停，尝试解除暂停...');
      
      const unpauseResponse = await httpClient.post('/system/unpause');
      
      if (!unpauseResponse.data || unpauseResponse.data.status !== 'success') {
        throw new Error('解除系统暂停失败');
      }
      
      const txHash = unpauseResponse.data.data.txHash;
      testData.txIds.push(txHash);
      
      console.log(`  解除暂停交易已提交: ${txHash}`);
      
      // 等待交易确认
      const confirmed = await waitForTx(txHash);
      
      if (!confirmed) {
        throw new Error('解除暂停交易未能确认');
      }
      
      // 再次检查系统状态
      const checkResponse = await httpClient.get('/system/info');
      
      if (checkResponse.data.data.paused) {
        throw new Error('系统仍然处于暂停状态');
      }
      
      console.log('  ✅ 系统已成功解除暂停');
    }
  });
  
  // 测试3: 获取合约地址
  await runTest('获取合约地址', async () => {
    const response = await httpClient.get('/system/contracts');
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('获取合约地址失败');
    }
    
    const contracts = response.data.data;
    
    // 检查是否存在关键合约
    const requiredContracts = ['RealEstateSystem', 'PropertyRegistry', 'TokenFactory'];
    
    for (const contract of requiredContracts) {
      if (!contracts[contract]) {
        throw new Error(`缺少必要的合约地址: ${contract}`);
      }
      
      console.log(`  ${contract}: ${contracts[contract]}`);
    }
  });
  
  // 测试4: 暂停系统
  await runTest('暂停系统', async () => {
    const response = await httpClient.post('/system/pause');
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('暂停系统失败');
    }
    
    const txHash = response.data.data.txHash;
    testData.txIds.push(txHash);
    
    console.log(`  暂停交易已提交: ${txHash}`);
    
    // 等待交易确认
    const confirmed = await waitForTx(txHash);
    
    if (!confirmed) {
      throw new Error('暂停交易未能确认');
    }
    
    // 检查系统状态
    const checkResponse = await httpClient.get('/system/info');
    
    if (!checkResponse.data.data.paused) {
      throw new Error('系统未处于暂停状态');
    }
    
    console.log('  ✅ 系统已成功暂停');
  });
  
  // 测试5: 解除系统暂停
  await runTest('解除系统暂停', async () => {
    const response = await httpClient.post('/system/unpause');
    
    if (!response.data || response.data.status !== 'success') {
      throw new Error('解除系统暂停失败');
    }
    
    const txHash = response.data.data.txHash;
    testData.txIds.push(txHash);
    
    console.log(`  解除暂停交易已提交: ${txHash}`);
    
    // 等待交易确认
    const confirmed = await waitForTx(txHash);
    
    if (!confirmed) {
      throw new Error('解除暂停交易未能确认');
    }
    
    // 检查系统状态
    const checkResponse = await httpClient.get('/system/info');
    
    if (checkResponse.data.data.paused) {
      throw new Error('系统仍然处于暂停状态');
    }
    
    console.log('  ✅ 系统已成功解除暂停');
  });
  
  // 完成测试
  testData.endTime = new Date();
  testData.duration = testData.endTime - testData.startTime;
  
  console.log('\n📊 测试结果摘要:');
  console.log(`  总计:  ${testData.results.total}个测试`);
  console.log(`  通过:  ${testData.results.passed}个测试`);
  console.log(`  失败:  ${testData.results.failed}个测试`);
  console.log(`  跳过:  ${testData.results.skipped}个测试`);
  console.log(`  耗时:  ${testData.duration / 1000}秒`);
  
  // 如果有错误，输出详细信息
  if (testData.errors.length > 0) {
    console.log('\n❌ 错误详情:');
    testData.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  // 保存测试结果
  const resultsDir = path.join(__dirname, '../test-results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultsFile = path.join(resultsDir, `test-result-${new Date().toISOString().replace(/:/g, '-')}.json`);
  
  fs.writeFileSync(resultsFile, JSON.stringify(testData, null, 2));
  console.log(`\n💾 测试结果已保存到: ${resultsFile}`);
}

// 执行测试
runTests().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
}); 