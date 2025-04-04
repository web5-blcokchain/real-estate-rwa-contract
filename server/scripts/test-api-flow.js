/**
 * API测试脚本 - 测试服务器API的核心流程
 * 
 * 本脚本通过HTTP请求方式测试服务器的API，确保完整流程正常工作
 * 包括：房产注册、代币创建、交易等功能
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { ethers } = require('ethers');

// 加载环境变量 - 从项目根目录加载
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  console.log(`正在加载.env文件: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`错误: .env文件不存在: ${envPath}`);
  process.exit(1);
}

// API配置
const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:3002/api/v1',
  apiKey: process.env.API_KEY || '123456',
  timeout: 30000 // 30秒超时
};

// 创建HTTP客户端
const client = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_CONFIG.apiKey
  }
});

// 测试数据
const TEST_DATA = {
  property: {
    propertyId: `PROP${Date.now()}`,
    country: 'Japan',
    metadataURI: 'https://example.com/metadata',
    tokenName: `房产代币${Date.now()}`,
    tokenSymbol: `RPT${Date.now().toString().slice(-4)}`,
    initialSupply: '1000',
    price: '100'
  },
  accounts: {
    admin: process.env.ADMIN_PRIVATE_KEY,
    operator: process.env.OPERATOR_PRIVATE_KEY
  }
};

/**
 * 延迟函数 - 等待指定的毫秒数
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
function delay(ms) {
  console.log(`等待 ${ms/1000} 秒...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查服务器健康状态
 * @returns {Promise<boolean>} 服务器是否健康
 */
async function checkServerHealth() {
  try {
    console.log('===== 检查服务器健康状态 =====');
    const response = await client.get('/health');
    console.log('服务器健康状态:', response.data);
    return response.data.status === 'ok';
  } catch (error) {
    console.error('服务器健康检查失败:', error.message);
    return false;
  }
}

/**
 * 检查区块链连接状态
 * @returns {Promise<boolean>} 区块链是否连接成功
 */
async function checkBlockchainConnection() {
  try {
    console.log('===== 检查区块链连接状态 =====');
    const response = await client.get('/blockchain/status');
    console.log('区块链连接状态:', response.data);
    return response.data.success && response.data.data.connected;
  } catch (error) {
    console.error('区块链连接检查失败:', error.message);
    return false;
  }
}

/**
 * 获取RealEstateFacade合约地址
 * @returns {Promise<string>} 合约地址
 */
async function getRealEstateFacadeAddress() {
  try {
    console.log('===== 获取RealEstateFacade合约地址 =====');
    const response = await client.get('/contracts/RealEstateFacade/address');
    console.log('RealEstateFacade合约地址:', response.data);
    return response.data.success ? response.data.data.address : null;
  } catch (error) {
    console.error('获取RealEstateFacade合约地址失败:', error.message);
    return null;
  }
}

/**
 * 注册房产并创建代币
 * @returns {Promise<Object>} 注册结果
 */
async function registerPropertyAndCreateToken() {
  try {
    console.log('===== 注册房产并创建代币 =====');
    const payload = {
      propertyId: TEST_DATA.property.propertyId,
      country: TEST_DATA.property.country,
      metadataURI: TEST_DATA.property.metadataURI,
      tokenName: TEST_DATA.property.tokenName,
      tokenSymbol: TEST_DATA.property.tokenSymbol,
      initialSupply: TEST_DATA.property.initialSupply
    };
    
    console.log('请求数据:', payload);
    const response = await client.post('/contracts/RealEstateFacade/registerPropertyAndCreateToken', payload);
    console.log('注册房产并创建代币结果:', response.data);
    
    if (response.data.success) {
      // 保存代币地址供后续使用
      TEST_DATA.property.tokenAddress = response.data.data.tokenAddress;
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('注册房产并创建代币失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return null;
  }
}

/**
 * 获取房产信息
 * @param {string} propertyId - 房产ID
 * @returns {Promise<Object>} 房产信息
 */
async function getPropertyDetails(propertyId) {
  try {
    console.log(`===== 获取房产信息: ${propertyId} =====`);
    const response = await client.get(`/contracts/PropertyManager/getPropertyById?propertyId=${propertyId}`);
    console.log('房产信息:', response.data);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('获取房产信息失败:', error.message);
    return null;
  }
}

/**
 * 获取代币信息
 * @param {string} tokenAddress - 代币合约地址
 * @returns {Promise<Object>} 代币信息
 */
async function getTokenDetails(tokenAddress) {
  try {
    console.log(`===== 获取代币信息: ${tokenAddress} =====`);
    const response = await client.get(`/contracts/PropertyToken/details?tokenAddress=${tokenAddress}`);
    console.log('代币信息:', response.data);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('获取代币信息失败:', error.message);
    return null;
  }
}

/**
 * 设置房产价格
 * @param {string} propertyId - 房产ID
 * @param {string} price - 价格
 * @returns {Promise<Object>} 设置结果
 */
async function setPropertyPrice(propertyId, price) {
  try {
    console.log(`===== 设置房产价格: ${propertyId} =====`);
    const payload = {
      propertyId,
      price: ethers.parseUnits(price, 18).toString()
    };
    
    console.log('请求数据:', payload);
    const response = await client.post('/contracts/PropertyManager/setPropertyPrice', payload);
    console.log('设置房产价格结果:', response.data);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('设置房产价格失败:', error.message);
    return null;
  }
}

/**
 * 设置房产为可出售状态
 * @param {string} propertyId - 房产ID
 * @returns {Promise<Object>} 设置结果
 */
async function setPropertyForSale(propertyId) {
  try {
    console.log(`===== 设置房产为可出售状态: ${propertyId} =====`);
    const payload = {
      propertyId,
      forSale: true
    };
    
    console.log('请求数据:', payload);
    const response = await client.post('/contracts/PropertyManager/setPropertyForSale', payload);
    console.log('设置房产为可出售状态结果:', response.data);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('设置房产为可出售状态失败:', error.message);
    return null;
  }
}

/**
 * 获取代币余额
 * @param {string} tokenAddress - 代币合约地址
 * @param {string} account - 账户地址
 * @returns {Promise<string>} 余额
 */
async function getTokenBalance(tokenAddress, account) {
  try {
    console.log(`===== 获取代币余额: ${account} =====`);
    const response = await client.get(`/contracts/PropertyToken/balanceOf?tokenAddress=${tokenAddress}&account=${account}`);
    console.log('代币余额:', response.data);
    return response.data.success ? response.data.data.balance : null;
  } catch (error) {
    console.error('获取代币余额失败:', error.message);
    return null;
  }
}

/**
 * 批准代币授权
 * @param {string} tokenAddress - 代币合约地址
 * @param {string} spender - 被授权账户地址
 * @param {string} amount - 授权金额
 * @returns {Promise<Object>} 授权结果
 */
async function approveTokens(tokenAddress, spender, amount) {
  try {
    console.log(`===== 批准代币授权: ${spender} =====`);
    const payload = {
      tokenAddress,
      spender,
      amount: ethers.parseUnits(amount, 18).toString()
    };
    
    console.log('请求数据:', payload);
    const response = await client.post('/contracts/PropertyToken/approve', payload);
    console.log('批准代币授权结果:', response.data);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('批准代币授权失败:', error.message);
    return null;
  }
}

/**
 * 模拟房产交易 - 买家购买房产
 * @param {string} propertyId - 房产ID
 * @param {string} buyerAddress - 买家地址
 * @returns {Promise<Object>} 交易结果
 */
async function buyProperty(propertyId, buyerAddress) {
  try {
    console.log(`===== 模拟房产交易: ${propertyId} =====`);
    const payload = {
      propertyId,
      buyer: buyerAddress
    };
    
    console.log('请求数据:', payload);
    const response = await client.post('/contracts/TradingManager/buyProperty', payload);
    console.log('房产交易结果:', response.data);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('房产交易失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return null;
  }
}

/**
 * 检查房产所有权
 * @param {string} propertyId - 房产ID
 * @returns {Promise<Object>} 所有权信息
 */
async function checkPropertyOwnership(propertyId) {
  try {
    console.log(`===== 检查房产所有权: ${propertyId} =====`);
    const response = await client.get(`/contracts/PropertyManager/getPropertyOwner?propertyId=${propertyId}`);
    console.log('房产所有权信息:', response.data);
    return response.data.success ? response.data.data : null;
  } catch (error) {
    console.error('检查房产所有权失败:', error.message);
    return null;
  }
}

/**
 * 获取管理员地址
 * @returns {Promise<string>} 管理员地址
 */
async function getAdminAddress() {
  try {
    console.log('===== 获取管理员地址 =====');
    const response = await client.get('/contracts/RoleManager/getAdmins');
    console.log('管理员地址:', response.data);
    return response.data.success && response.data.data.length > 0 ? response.data.data[0] : null;
  } catch (error) {
    console.error('获取管理员地址失败:', error.message);
    return null;
  }
}

/**
 * 获取操作员地址
 * @returns {Promise<string>} 操作员地址
 */
async function getOperatorAddress() {
  try {
    console.log('===== 获取操作员地址 =====');
    const response = await client.get('/contracts/RoleManager/getOperators');
    console.log('操作员地址:', response.data);
    return response.data.success && response.data.data.length > 0 ? response.data.data[0] : null;
  } catch (error) {
    console.error('获取操作员地址失败:', error.message);
    return null;
  }
}

/**
 * 主测试流程
 */
async function runTest() {
  try {
    console.log('===== 开始API测试流程 =====');
    
    // 步骤1: 检查服务器健康状态
    const isServerHealthy = await checkServerHealth();
    if (!isServerHealthy) {
      throw new Error('服务器健康检查失败，终止测试');
    }
    
    // 步骤2: 检查区块链连接状态
    const isBlockchainConnected = await checkBlockchainConnection();
    if (!isBlockchainConnected) {
      throw new Error('区块链连接检查失败，终止测试');
    }
    
    // 步骤3: 获取RealEstateFacade合约地址
    const facadeAddress = await getRealEstateFacadeAddress();
    if (!facadeAddress) {
      throw new Error('获取RealEstateFacade合约地址失败，终止测试');
    }
    
    // 获取管理员和操作员地址（用于后续交易）
    const adminAddress = await getAdminAddress();
    const operatorAddress = await getOperatorAddress();
    
    if (!adminAddress || !operatorAddress) {
      throw new Error('获取管理员或操作员地址失败，终止测试');
    }
    
    console.log('测试将使用以下地址:');
    console.log('- 管理员地址:', adminAddress);
    console.log('- 操作员地址:', operatorAddress);
    
    // 保存地址信息
    TEST_DATA.accounts.adminAddress = adminAddress;
    TEST_DATA.accounts.operatorAddress = operatorAddress;
    
    // 步骤4: 注册房产并创建代币
    const registrationResult = await registerPropertyAndCreateToken();
    if (!registrationResult) {
      throw new Error('注册房产并创建代币失败，终止测试');
    }
    
    // 保存tokenAddress供后续使用
    if (registrationResult.tokenAddress) {
      TEST_DATA.property.tokenAddress = registrationResult.tokenAddress;
      console.log('代币已创建，地址:', TEST_DATA.property.tokenAddress);
    } else {
      console.warn('警告: 注册成功但未返回代币地址');
    }
    
    // 等待区块确认
    await delay(5000);
    
    // 步骤5: 获取房产信息
    const propertyDetails = await getPropertyDetails(TEST_DATA.property.propertyId);
    if (!propertyDetails) {
      throw new Error('获取房产信息失败，终止测试');
    }
    
    // 保存房产详情
    TEST_DATA.property.details = propertyDetails;
    
    // 步骤6: 获取代币信息
    if (TEST_DATA.property.tokenAddress) {
      const tokenDetails = await getTokenDetails(TEST_DATA.property.tokenAddress);
      if (!tokenDetails) {
        throw new Error('获取代币信息失败，终止测试');
      }
      
      // 保存代币详情
      TEST_DATA.property.tokenDetails = tokenDetails;
      
      // 获取初始代币余额
      const adminBalance = await getTokenBalance(TEST_DATA.property.tokenAddress, adminAddress);
      console.log('管理员初始代币余额:', adminBalance);
      TEST_DATA.property.initialAdminBalance = adminBalance;
    } else {
      console.warn('警告: 未获取到代币地址，跳过获取代币信息步骤');
    }
    
    // 步骤7: 设置房产价格
    const priceResult = await setPropertyPrice(TEST_DATA.property.propertyId, TEST_DATA.property.price);
    if (!priceResult) {
      throw new Error('设置房产价格失败，终止测试');
    }
    
    // 等待区块确认
    await delay(5000);
    
    // 步骤8: 设置房产为可出售状态
    const forSaleResult = await setPropertyForSale(TEST_DATA.property.propertyId);
    if (!forSaleResult) {
      throw new Error('设置房产为可出售状态失败，终止测试');
    }
    
    // 等待区块确认
    await delay(5000);
    
    // 步骤9: 检查房产所有权（应该是管理员）
    const initialOwnership = await checkPropertyOwnership(TEST_DATA.property.propertyId);
    if (!initialOwnership) {
      throw new Error('检查房产所有权失败，终止测试');
    }
    
    console.log('初始房产所有者:', initialOwnership);
    TEST_DATA.property.initialOwner = initialOwnership.owner;
    
    if (initialOwnership.owner.toLowerCase() !== adminAddress.toLowerCase()) {
      console.warn(`警告: 房产所有者(${initialOwnership.owner})与预期的管理员地址(${adminAddress})不符`);
    }
    
    // 步骤10: 为操作员批准代币使用权限（模拟交易准备）
    if (TEST_DATA.property.tokenAddress) {
      const approvalResult = await approveTokens(
        TEST_DATA.property.tokenAddress,
        operatorAddress,
        TEST_DATA.property.price
      );
      
      if (!approvalResult) {
        throw new Error('代币授权失败，终止测试');
      }
      
      console.log('代币授权成功，操作员可以使用管理员的代币');
      
      // 等待区块确认
      await delay(5000);
    }
    
    // 步骤11: 模拟房产交易（操作员购买管理员的房产）
    const buyResult = await buyProperty(TEST_DATA.property.propertyId, operatorAddress);
    if (!buyResult) {
      throw new Error('房产交易失败，终止测试');
    }
    
    console.log('房产交易成功，操作员已购买房产');
    
    // 等待区块确认
    await delay(5000);
    
    // 步骤12: 验证交易结果 - 检查房产所有权变更
    const finalOwnership = await checkPropertyOwnership(TEST_DATA.property.propertyId);
    if (!finalOwnership) {
      throw new Error('验证房产所有权变更失败，终止测试');
    }
    
    console.log('交易后房产所有者:', finalOwnership);
    TEST_DATA.property.finalOwner = finalOwnership.owner;
    
    if (finalOwnership.owner.toLowerCase() !== operatorAddress.toLowerCase()) {
      throw new Error(`交易失败: 房产所有者(${finalOwnership.owner})与预期的操作员地址(${operatorAddress})不符`);
    }
    
    console.log('房产所有权已成功转移到操作员');
    
    // 步骤13: 检查代币余额变化
    if (TEST_DATA.property.tokenAddress) {
      const finalAdminBalance = await getTokenBalance(TEST_DATA.property.tokenAddress, adminAddress);
      const operatorBalance = await getTokenBalance(TEST_DATA.property.tokenAddress, operatorAddress);
      
      console.log('交易后管理员代币余额:', finalAdminBalance);
      console.log('交易后操作员代币余额:', operatorBalance);
      
      TEST_DATA.property.finalAdminBalance = finalAdminBalance;
      TEST_DATA.property.operatorBalance = operatorBalance;
    }
    
    // 测试完成
    console.log('===== API测试流程成功完成 =====');
    console.log('测试数据总结:');
    console.log(JSON.stringify(TEST_DATA, null, 2));
    
    return true;
  } catch (error) {
    console.error('测试流程失败:', error.message);
    return false;
  }
}

// 执行测试
runTest()
  .then(success => {
    if (success) {
      console.log('API测试成功完成');
      process.exit(0);
    } else {
      console.error('API测试失败');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('API测试过程中发生错误:', error);
    process.exit(1);
  }); 