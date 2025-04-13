/**
 * RewardManager API 测试脚本
 * 测试奖励分配系统的核心功能
 */
const axios = require('axios');
const readline = require('readline');
const { ethers } = require('ethers');
const propertyCache = require('../utils/propertyCache');
const { EnvConfig } = require('../../common');

// ---------------- 测试配置和常量 ----------------
// API 基础配置
const BASE_URL = 'http://localhost:3001'; // 使用3001端口
const API_KEY = '123456'; // 设置API密钥
const USER_ROLE = 'admin'; // 设置用户角色

// 合约和账户相关配置
const STABLECOIN_ADDRESS = EnvConfig.get('CONTRACT_TESTTOKEN_ADDRESS') || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const TEST_USER_ADDRESS = '0x1234567890123456789012345678901234567890'; // 测试用户地址
const RECEIVER_ADDRESS = '0xAdminReceiverAddress0123456789012345678901'; // 接收未领取资金的地址
const DEFAULT_PROPERTY_ID = '1234567'; // 默认房产ID，与已注册的保持一致

// 分配测试配置
const NORMAL_DISTRIBUTION = {
  amount: '50000',
  distributionType: 0, // 0=分红, 1=租金, 2=奖金
  description: `测试分红分配-${new Date().toISOString().split('T')[0]}`
};

const MERKLE_DISTRIBUTION = {
  amount: '100000',
  distributionType: 1, // 租金
  description: `测试租金分配(Merkle)-${new Date().toISOString().split('T')[0]}`
};

// Merkle相关配置
const MERKLE_ROOT = '0x1234567890123456789012345678901234567890123456789012345678901234';
const MERKLE_PROOF = [
  '0x1234567890123456789012345678901234567890123456789012345678901234',
  '0x2345678901234567890123456789012345678901234567890123456789012345'
];

// 提取金额配置
const WITHDRAW_AMOUNT = '1000'; // 提取1000单位稳定币

// ---------------- 日志工具 ----------------
// 简单的日志实现
const Logger = {
  info: (message) => console.log(`\x1b[32m[INFO]\x1b[0m ${message}`),
  warn: (message) => console.log(`\x1b[33m[WARN]\x1b[0m ${message}`),
  error: (message, error) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
    if (error) console.error(error);
  }
};

// 打印初始配置信息
Logger.info('===== 测试配置信息 =====');
Logger.info(`API地址: ${BASE_URL}`);
Logger.info(`稳定币合约地址: ${STABLECOIN_ADDRESS}`);
Logger.info(`测试用户地址: ${TEST_USER_ADDRESS}`);
Logger.info(`默认房产ID: ${DEFAULT_PROPERTY_ID}`);
Logger.info('');

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
    rl.question(`${message} (按回车继续)...`, () => {
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
  // 获取一个有效的房产ID
  getPropertyId() {
    // 尝试从缓存获取
    const propertyId = propertyCache.getPropertyId();
    
    if (propertyId) {
      Logger.info(`从缓存获取到房产ID: ${propertyId}`);
      return propertyId;
    }
    
    // 如果没有缓存，使用默认ID
    Logger.warn(`未找到缓存的房产ID，使用默认ID: ${DEFAULT_PROPERTY_ID}`);
    return DEFAULT_PROPERTY_ID;
  },
  
  // 查询所有分配
  async getAllDistributions() {
    Logger.info('\n===== 查询所有分配 =====');
    return await callApi('get', '/api/v1/reward/distributions');
  },
  
  // 创建分配
  async createDistribution() {
    Logger.info('\n===== 创建新的分配 =====');
    const propertyId = this.getPropertyId();
    
    const data = {
      propertyId: propertyId,
      amount: NORMAL_DISTRIBUTION.amount,
      stablecoinAddress: STABLECOIN_ADDRESS, 
      distributionType: NORMAL_DISTRIBUTION.distributionType,
      description: NORMAL_DISTRIBUTION.description
    };
    
    return await callApi('post', '/api/v1/reward/create-distribution', data);
  },
  
  // 创建Merkle树分配
  async createMerkleDistribution() {
    Logger.info('\n===== 创建Merkle树分配（普通分配） =====');
    const propertyId = this.getPropertyId();
    
    const data = {
      propertyId: propertyId,
      amount: MERKLE_DISTRIBUTION.amount,
      stablecoinAddress: STABLECOIN_ADDRESS,
      distributionType: MERKLE_DISTRIBUTION.distributionType,
      description: MERKLE_DISTRIBUTION.description
    };
    
    // 创建一个普通分配，稍后会更新Merkle根
    return await callApi('post', '/api/v1/reward/create-distribution', data);
  },
  
  // 验证稳定币是否受支持
  async checkStablecoinSupport() {
    Logger.info('\n===== 验证稳定币是否受支持 =====');
    const endpoint = `/api/v1/reward/stablecoin/${STABLECOIN_ADDRESS}/supported`;
    return await callApi('get', endpoint);
  },
  
  // 更新Merkle根
  async updateMerkleRoot(distributionId) {
    Logger.info('\n===== 更新分配的Merkle根 =====');
    
    const data = {
      distributionId,
      merkleRoot: MERKLE_ROOT
    };
    
    return await callApi('post', '/api/v1/reward/update-merkle-root', data);
  },
  
  // 查询分配详情
  async getDistributionDetails(distributionId) {
    Logger.info('\n===== 查询分配详情 =====');
    const endpoint = `/api/v1/reward/distribution/${distributionId}`;
    return await callApi('get', endpoint);
  },
  
  // 更新分配状态
  async updateDistributionStatus(distributionId, status = 1) {
    Logger.info('\n===== 更新分配状态 =====');
    const data = {
      status // 0=待定，1=激活，2=完成，3=取消
    };
    
    const endpoint = `/api/v1/reward/distribution/${distributionId}/status`;
    return await callApi('put', endpoint, data);
  },
  
  // 获取用户在特定分配中的数据
  async getUserDistribution(distributionId, userAddress = TEST_USER_ADDRESS) {
    Logger.info('\n===== 查询用户分配数据 =====');
    const endpoint = `/api/v1/reward/distribution/${distributionId}/user/${userAddress}`;
    return await callApi('get', endpoint);
  },
  
  // 提取分配（模拟普通提取）
  async withdrawDistribution(distributionId) {
    Logger.info('\n===== 提取分配 =====');
    
    // 先获取分配详情
    const distributionDetails = await this.getDistributionDetails(distributionId);
    if (!distributionDetails || !distributionDetails.success) {
      Logger.error(`获取分配详情失败，无法提取`);
      return null;
    }
    
    // 准备提取数据
    const data = {
      userAddress: TEST_USER_ADDRESS,
      amount: WITHDRAW_AMOUNT
    };
    
    // 普通分配不支持直接提取，但我们模拟尝试
    const endpoint = `/api/v1/reward/distribution/${distributionId}/withdraw`;
    return await callApi('post', endpoint, data);
  },
  
  // 提取Merkle分配
  async withdrawMerkleDistribution(distributionId) {
    Logger.info('\n===== 提取Merkle分配 =====');
    
    // 准备提取数据
    const data = {
      userAddress: TEST_USER_ADDRESS,
      amount: WITHDRAW_AMOUNT,
      proof: MERKLE_PROOF
    };
    
    const endpoint = `/api/v1/reward/distribution/${distributionId}/withdraw`;
    return await callApi('post', endpoint, data);
  },
  
  // 收回未领取的资金
  async recoverUnclaimedFunds(distributionId) {
    Logger.info('\n===== 收回未领取的资金 =====');
    const data = {
      receiver: RECEIVER_ADDRESS
    };
    
    const endpoint = `/api/v1/reward/distribution/${distributionId}/recover`;
    return await callApi('post', endpoint, data);
  }
};

// 主测试流程
const runTests = async () => {
  try {
    Logger.info('开始测试 RewardManager API...');
    
    // 检查区块链连接状态
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
    
    // 检查是否有缓存的房产ID
    const propertyId = tests.getPropertyId();
    Logger.info(`将使用房产ID: ${propertyId} 进行测试`);
    
    // 检查稳定币是否受支持
    await promptToContinue('检查稳定币是否受支持');
    await tests.checkStablecoinSupport();
    
    // 用户交互，逐个运行测试
    
    // 1. 查询现有分配
    await promptToContinue('开始查询现有分配');
    await tests.getAllDistributions();
    
    // 2. 创建普通分配
    await promptToContinue('开始创建普通分配');
    const distributionResult = await tests.createDistribution();
    
    let distributionId = null;
    if (distributionResult && distributionResult.success && distributionResult.data) {
      distributionId = distributionResult.data.distributionId;
      Logger.info(`创建分配成功，ID: ${distributionId}`);
      
      // 获取分配详情
      await tests.getDistributionDetails(distributionId);
      
      // 更新分配状态为激活
      await promptToContinue('开始激活分配');
      await tests.updateDistributionStatus(distributionId, 1);
      
      // 尝试提取分配
      await promptToContinue('开始提取普通分配');
      await tests.withdrawDistribution(distributionId);
    } else {
      Logger.warn('创建分配失败，跳过后续测试');
    }
    
    // 3. 创建Merkle树分配
    await promptToContinue('开始创建Merkle树分配');
    const merkleResult = await tests.createMerkleDistribution();
    
    let merkleDistributionId = null;
    if (merkleResult && merkleResult.success && merkleResult.data) {
      merkleDistributionId = merkleResult.data.distributionId;
      Logger.info(`创建Merkle分配成功，ID: ${merkleDistributionId}`);
      
      // 更新默克尔根
      await promptToContinue('开始更新Merkle根');
      await tests.updateMerkleRoot(merkleDistributionId);
      
      // 获取分配详情
      await tests.getDistributionDetails(merkleDistributionId);
      
      // 更新分配状态为激活
      await promptToContinue('开始激活Merkle分配');
      await tests.updateDistributionStatus(merkleDistributionId, 1);
      
      // 提取Merkle分配
      await promptToContinue('开始提取Merkle分配');
      await tests.withdrawMerkleDistribution(merkleDistributionId);
    } else {
      Logger.warn('创建Merkle分配失败，跳过后续测试');
    }
    
    // 收回未领取的资金
    if (distributionId) {
      await promptToContinue('开始测试收回未领取的资金');
      await tests.recoverUnclaimedFunds(distributionId);
    }
    
    Logger.info('\n===== 所有测试已完成 =====');
    
  } catch (error) {
    Logger.error('测试过程中出现错误:', error);
  } finally {
    rl.close();
  }
};

// 启动测试
runTests(); 