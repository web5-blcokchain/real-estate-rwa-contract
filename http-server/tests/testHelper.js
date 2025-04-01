/**
 * 测试助手
 * 提供测试中常用的功能和数据
 */
import supertest from 'supertest';
import app from '../src/index.js';

// 创建测试请求对象
const request = supertest(app);

export const getRequest = async () => {
  return request;
};

// 获取development.env中的API密钥
export const API_KEY = 'dev-api-key';

// 测试用的以太坊地址和角色
export const TEST_ADDRESSES = {
  admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  manager: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  trader: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  user: '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
};

// 测试用的房产数据
export const TEST_PROPERTY = {
  propertyId: 'TEST-PROPERTY-1',
  location: '日本东京都中央区银座4-5-6',
  area: 80.5,
  description: '位于银座核心地段的高级公寓，交通便利',
  initialSupply: '1000',
  decimals: 18,
  symbol: 'JPRE'
};

// 测试用的交易数据
export const TEST_TRADE = {
  propertyId: 'TEST-PROPERTY-1',
  amount: '100',
  price: '50000000000000000',
  deadline: Math.floor(Date.now() / 1000) + 86400, // 24小时后
};

// 测试用的奖励数据
export const TEST_REWARD = {
  propertyId: 'TEST-PROPERTY-1',
  amount: '1000000000000000000', // 1 ETH
  description: '2023年第一季度租金收益'
};

// 工具方法: 测试API是否需要API KEY
export const testRequiresApiKey = async (endpoint, method = 'get') => {
  const response = await request[method](endpoint);
  expect(response.status).toBe(401);
  expect(response.body.error).toBeTruthy();
  return response;
};

// 工具方法: 带API密钥的请求
export const apiRequest = async (endpoint, method = 'get', data = null) => {
  const url = `${endpoint}?api_key=${API_KEY}`;
  if (method === 'get') {
    return request.get(url);
  } else if (method === 'post') {
    return request.post(url).send(data);
  } else if (method === 'put') {
    return request.put(url).send(data);
  } else if (method === 'delete') {
    return request.delete(url);
  }
};

// 延迟函数，用于测试时等待
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}; 