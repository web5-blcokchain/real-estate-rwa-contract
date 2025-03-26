import axios from 'axios';

// 更新 API 基础路径，添加 /v1 或去掉前缀
const API_BASE_URL = 'http://localhost:3000/api';
const API_KEY = 'japan-rwa-dev-key';

// 创建一个 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  params: { api_key: API_KEY }
});

// 创建一个 v1 API 实例
const v1Api = axios.create({
  baseURL: API_BASE_URL + '/v1',
  params: { api_key: API_KEY }
});

async function testBasicEndpoint() {
  try {
    console.log('测试基本API端点...\n');
    console.log('请求URL:', `${API_BASE_URL}/test`);
    console.log('请求参数:', { api_key: API_KEY });

    const response = await api.get('/test');
    console.log('响应状态码:', response.status);
    console.log('响应数据:', response.data);
    console.log('----------------------------------------\n');

    console.log('基本API测试完成！');
    return true;
  } catch (error: any) {
    console.error('测试过程中发生错误:');
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
      console.error('错误头信息:', error.response.headers);
    } else if (error.request) {
      console.error('请求已发送但没有收到响应');
      console.error('请求配置:', error.request);
    } else {
      console.error('请求配置时发生错误:', error.message);
    }
    if (error.config) {
      console.error('请求配置:', error.config);
    }
    return false;
  }
}

async function testHealthEndpoint() {
  try {
    console.log('测试健康检查端点...\n');

    const response = await v1Api.get('/health');
    console.log('响应状态码:', response.status);
    console.log('响应数据:', response.data);
    console.log('----------------------------------------\n');

    console.log('健康检查测试完成！');
    return true;
  } catch (error: any) {
    console.error('测试过程中发生错误:', error.response?.data || error.message);
    return false;
  }
}

async function testPropertyEndpoints() {
  try {
    console.log('开始测试房产相关接口...\n');

    // 测试获取房产列表
    console.log('测试获取房产列表');
    const listResponse = await v1Api.get('/properties');
    console.log('响应状态码:', listResponse.status);
    console.log('响应数据:', listResponse.data);
    console.log('----------------------------------------\n');

    // 获取列表中第一个房产的 ID
    const propertyId = listResponse.data.data[0].id;

    // 测试获取特定房产详情
    console.log(`测试获取房产详情: ${propertyId}`);
    const detailResponse = await v1Api.get(`/properties/${propertyId}`);
    console.log('响应状态码:', detailResponse.status);
    console.log('响应数据:', detailResponse.data);
    console.log('----------------------------------------\n');

    // 测试获取不存在的房产
    console.log('测试获取不存在的房产');
    try {
      const notFoundResponse = await v1Api.get('/properties/INVALID_ID');
      console.log('响应状态码:', notFoundResponse.status);
      console.log('响应数据:', notFoundResponse.data);
    } catch (error: any) {
      console.log('预期的错误:', error.response?.status, error.response?.data);
    }
    console.log('----------------------------------------\n');

    console.log('房产接口测试完成！');
  } catch (error: any) {
    console.error('测试过程中发生错误:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('开始API接口测试...\n');
  
  // 先测试基本端点
  const basicTestSuccess = await testBasicEndpoint();
  
  // 如果基本测试成功，测试健康检查端点
  if (basicTestSuccess) {
    const healthTestSuccess = await testHealthEndpoint();
    
    // 如果健康检查测试成功，测试其他端点
    if (healthTestSuccess) {
      await testPropertyEndpoints();
    } else {
      console.log('由于健康检查测试失败，跳过后续测试...');
    }
  } else {
    console.log('由于基本API测试失败，跳过后续测试...');
  }
  
  console.log('\nAPI接口测试完成！');
}

// 运行测试
runTests().catch(console.error); 