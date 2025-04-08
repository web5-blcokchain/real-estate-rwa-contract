/**
 * PropertyManagerController 测试脚本
 * 用于测试 PropertyManagerController 的所有功能和流程
 */

// 导入必要模块
const ethers = require('ethers');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

// 导入控制器
const PropertyManagerController = require('../controllers/core/PropertyManagerController');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 创建readline接口用于等待用户输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 日志函数
function log(title, message) {
  const separator = '='.repeat(50);
  console.log(`\n${separator}\n${title}\n${separator}`);
  if (message) {
    // 添加BigInt序列化支持
    const replacer = (key, value) => {
      // 检查值是否是BigInt类型
      if (typeof value === 'bigint') {
        // 将BigInt转换为字符串
        return value.toString();
      }
      return value;
    };
    
    console.log(typeof message === 'object' ? JSON.stringify(message, replacer, 2) : message);
  }
}

// 等待用户输入函数
function waitForUserInput(message = '按回车键继续下一个测试...') {
  return new Promise((resolve) => {
    rl.question(message, () => {
      resolve();
    });
  });
}

// 生成唯一ID
function generateUniqueId() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

/**
 * 创建模拟请求和响应对象
 * @param {Object} params - 参数对象
 * @param {Object} query - 查询参数
 * @param {Object} body - 请求体
 * @returns {Object} 请求和响应对象
 */
function createMockReqRes(params = {}, query = {}, body = {}) {
  const req = {
    params,
    query,
    body,
    headers: {
      'x-api-key': process.env.API_KEY || '123456'
    }
  };

  let statusCode = 200;
  let responseData = null;
  let responseError = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      if (statusCode >= 400) {
        responseError = data;
      } else {
        responseData = data;
      }
      return res;
    },
    getResponse: () => {
      return {
        statusCode,
        data: responseData,
        error: responseError
      };
    }
  };

  return { req, res };
}

/**
 * 测试 PropertyManagerController 的 registerProperty 方法
 */
async function testRegisterProperty() {
  log('测试 registerProperty 方法');
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 使用带有时间戳的动态propertyId，确保每次测试都是唯一的
  const timestamp = Date.now();
  const propertyId = `PROP-TEST-${timestamp}`; // 动态生成的propertyId
  console.log("使用动态生成的 propertyId:", propertyId);
  console.log("propertyId length:", propertyId.length);
  console.log("propertyId type:", typeof propertyId);
  
  // 将propertyId转换为UTF8字节并打印
  const utf8Bytes = ethers.toUtf8Bytes(propertyId);
  console.log("propertyId UTF8 bytes:", utf8Bytes);
  
  // 计算propertyId的keccak256哈希并打印
  const propertyIdHash = ethers.keccak256(utf8Bytes);
  console.log("propertyId hash (keccak256):", propertyIdHash);
  
  // 创建模拟数据 - 修改为与合约函数匹配的参数
  const propertyDetails = {
    propertyId,
    country: "Japan",
    metadataURI: "ipfs://QmXyZ123456789"
  };

  console.log("Property Details:", propertyDetails);

  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, { propertyDetails });

  try {
    // 调用 registerProperty 方法
    await controller.registerProperty(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '房产注册失败');
      console.log("错误信息:", response.error || response.data);
      return null;
    }
    
    // 确保我们使用的是注册成功后的propertyId
    log('测试成功', '房产注册成功');
    console.log("注册成功的propertyId:", propertyId);
    console.log("注册成功的propertyId hash:", propertyIdHash);
    console.log("请在后续测试中使用此ID");
    
    // 返回创建的 propertyId 以供后续测试使用
    return propertyId;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return null;
  }
}

/**
 * 测试 PropertyManagerController 的 getPropertyInfo 方法
 * @param {string} propertyId - 房产ID
 */
async function testGetPropertyInfo(propertyId) {
  log('测试 getPropertyInfo 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log("propertyId类型:", typeof propertyId);
  console.log("propertyId长度:", propertyId.length);
  
  // 将propertyId转换为UTF8字节并打印
  const utf8Bytes = ethers.toUtf8Bytes(propertyId);
  console.log("propertyId UTF8 bytes:", utf8Bytes);
  
  // 计算propertyId的keccak256哈希并打印
  const propertyIdHash = ethers.keccak256(utf8Bytes);
  console.log("propertyId hash (keccak256):", propertyIdHash);
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({ propertyId });

  try {
    // 调用 getPropertyInfo 方法
    await controller.getPropertyInfo(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '获取房产信息失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '获取房产信息成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 PropertyManagerController 的 getPropertyDetails 方法
 * @param {string} propertyId - 房产ID
 */
async function testGetPropertyDetails(propertyId) {
  log('测试 getPropertyDetails 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log("propertyId类型:", typeof propertyId);
  console.log("propertyId长度:", propertyId.length);
  
  // 将propertyId转换为UTF8字节并打印
  const utf8Bytes = ethers.toUtf8Bytes(propertyId);
  console.log("propertyId UTF8 bytes:", utf8Bytes);
  
  // 计算propertyId的keccak256哈希并打印
  const propertyIdHash = ethers.keccak256(utf8Bytes);
  console.log("propertyId hash (keccak256):", propertyIdHash);
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({ propertyId });

  try {
    console.log("[testGetPropertyDetails] 准备调用controller.getPropertyDetails");
    // 调用 getPropertyDetails 方法
    await controller.getPropertyDetails(req, res);
    console.log("[testGetPropertyDetails] controller.getPropertyDetails调用完成");
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '获取房产详情失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '获取房产详情成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.log("详细错误信息:");
    console.log(error);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 PropertyManagerController 的 updatePropertyStatus 方法
 * @param {string} propertyId - 房产ID
 */
async function testUpdatePropertyStatus(propertyId) {
  log('测试 updatePropertyStatus 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log("propertyId类型:", typeof propertyId);
  console.log("propertyId长度:", propertyId.length);
  
  // 将propertyId转换为UTF8字节并打印
  const utf8Bytes = ethers.toUtf8Bytes(propertyId);
  console.log("propertyId UTF8 bytes:", utf8Bytes);
  
  // 计算propertyId的keccak256哈希并打印
  const propertyIdHash = ethers.keccak256(utf8Bytes);
  console.log("propertyId hash (keccak256):", propertyIdHash);
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 创建请求体，确保propertyId使用正确的值
  const requestBody = {
    propertyId: propertyId,  // 使用通过参数传入的propertyId
    newStatus: 2  // 假设 2 代表已售出
  };
  
  console.log("请求体:", requestBody);
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 调用 updatePropertyStatus 方法
    await controller.updatePropertyStatus(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '更新房产状态失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '更新房产状态成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 PropertyManagerController 的 setPropertyToken 方法
 * @param {string} propertyId - 房产ID
 */
async function testSetPropertyToken(propertyId) {
  log('测试 setPropertyToken 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log("propertyId类型:", typeof propertyId);
  console.log("propertyId长度:", propertyId.length);
  
  // 将propertyId转换为UTF8字节并打印
  const utf8Bytes = ethers.toUtf8Bytes(propertyId);
  console.log("propertyId UTF8 bytes:", utf8Bytes);
  
  // 计算propertyId的keccak256哈希并打印
  const propertyIdHash = ethers.keccak256(utf8Bytes);
  console.log("propertyId hash (keccak256):", propertyIdHash);
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 创建模拟数据
  const tokenAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
  
  // 创建请求体，确保propertyId使用正确的值
  const requestBody = {
    propertyId: propertyId,  // 使用通过参数传入的propertyId
    tokenAddress: tokenAddress
  };
  
  console.log("请求体:", requestBody);
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, requestBody);

  try {
    // 调用 setPropertyToken 方法
    await controller.setPropertyToken(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '设置房产代币失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '设置房产代币成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 PropertyManagerController 的 getPropertyToken 方法
 * @param {string} propertyId - 房产ID
 */
async function testGetPropertyToken(propertyId) {
  log('测试 getPropertyToken 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log("propertyId类型:", typeof propertyId);
  console.log("propertyId长度:", propertyId.length);
  
  // 将propertyId转换为UTF8字节并打印
  const utf8Bytes = ethers.toUtf8Bytes(propertyId);
  console.log("propertyId UTF8 bytes:", utf8Bytes);
  
  // 计算propertyId的keccak256哈希并打印
  const propertyIdHash = ethers.keccak256(utf8Bytes);
  console.log("propertyId hash (keccak256):", propertyIdHash);
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({ propertyId });

  try {
    // 调用 getPropertyToken 方法
    await controller.getPropertyToken(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '获取房产代币失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '获取房产代币成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 PropertyManagerController 的 verifyPropertyOwnership 方法
 * @param {string} propertyId - 房产ID
 */
async function testVerifyPropertyOwnership(propertyId) {
  log('测试 verifyPropertyOwnership 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log("propertyId类型:", typeof propertyId);
  console.log("propertyId长度:", propertyId.length);
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({ 
    propertyId,
    owner: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  });

  try {
    // 调用 verifyPropertyOwnership 方法
    await controller.verifyPropertyOwnership(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '验证房产所有权失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '验证房产所有权成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 PropertyManagerController 的 transferPropertyOwnership 方法
 * @param {string} propertyId - 房产ID
 */
async function testTransferPropertyOwnership(propertyId) {
  log('测试 transferPropertyOwnership 方法');
  console.log("使用的 propertyId:", propertyId);
  console.log("propertyId类型:", typeof propertyId);
  console.log("propertyId长度:", propertyId.length);
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({}, {}, { 
    propertyId,
    newOwner: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' // 不同的测试地址
  });

  try {
    // 调用 transferPropertyOwnership 方法
    await controller.transferPropertyOwnership(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '转移房产所有权失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '转移房产所有权成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 测试 PropertyManagerController 的 getOwnerProperties 方法
 */
async function testGetOwnerProperties() {
  log('测试 getOwnerProperties 方法');
  
  // 创建一个新的控制器实例
  const controller = new PropertyManagerController();
  
  // 创建模拟请求和响应对象
  const { req, res } = createMockReqRes({ 
    owner: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' 
  });

  try {
    // 调用 getOwnerProperties 方法
    await controller.getOwnerProperties(req, res);
    
    // 获取响应
    const response = res.getResponse();
    
    // 输出响应
    log('响应数据', response);
    
    if (response.statusCode >= 400 || response.error) {
      log('测试失败', '获取账户房产失败');
      console.log("错误信息:", response.error || response.data);
      return false;
    }
    
    log('测试成功', '获取账户房产成功');
    return true;
  } catch (error) {
    log('测试失败', error.message);
    console.error("Stack trace:", error.stack);
    return false;
  }
}

/**
 * 简化的主函数，仅测试注册房产功能
 */
async function main() {
  log('开始测试 PropertyManagerController');
  
  try {
    // 测试 registerProperty 方法
    const propertyId = await testRegisterProperty();
    
    if (!propertyId) {
      log('测试中断', '无法创建房产，测试终止');
      rl.close();
      return;
    }
    
    log('注册房产测试成功完成');
    console.log("创建的propertyId:", propertyId);
    
    // 添加更多测试，所有测试共用相同的propertyId
    // 等待用户确认继续
    await waitForUserInput("按回车键继续测试 getPropertyInfo...");
    
    // 测试 getPropertyInfo 方法
    const infoSuccess = await testGetPropertyInfo(propertyId);
    if (!infoSuccess) {
      log('测试警告', 'getPropertyInfo 测试失败，但继续进行其他测试');
    }
    
    // 等待用户确认继续
    await waitForUserInput("按回车键继续测试 getPropertyDetails...");
    
    // 测试 getPropertyDetails 方法
    const detailsSuccess = await testGetPropertyDetails(propertyId);
    if (!detailsSuccess) {
      log('测试警告', 'getPropertyDetails 测试失败，但继续进行其他测试');
    }
    
    // 等待用户确认继续
    await waitForUserInput("按回车键继续测试 updatePropertyStatus...");
    
    // 测试 updatePropertyStatus 方法
    const updateStatusSuccess = await testUpdatePropertyStatus(propertyId);
    if (!updateStatusSuccess) {
      log('测试警告', 'updatePropertyStatus 测试失败，但继续进行其他测试');
    }
    
    // 等待用户确认继续
    await waitForUserInput("按回车键继续测试 setPropertyToken...");
    
    // 测试 setPropertyToken 方法
    const setTokenSuccess = await testSetPropertyToken(propertyId);
    if (!setTokenSuccess) {
      log('测试警告', 'setPropertyToken 测试失败，但继续进行其他测试');
    }
    
    // 等待用户确认继续
    await waitForUserInput("按回车键继续测试 getPropertyToken...");
    
    // 测试 getPropertyToken 方法
    const getTokenSuccess = await testGetPropertyToken(propertyId);
    if (!getTokenSuccess) {
      log('测试警告', 'getPropertyToken 测试失败，但继续进行其他测试');
    }
    
    // 跳过不支持的方法
    log('信息', '跳过 getOwnerProperties 测试 - 在当前合约中未完全实现');
    log('信息', '跳过 verifyPropertyOwnership 测试 - 在当前合约中未完全实现');
    log('信息', '跳过 transferPropertyOwnership 测试 - 在当前合约中未完全实现');
    
    log('测试完成', '所有测试已完成');
    rl.close();
  } catch (error) {
    log('测试主函数失败', error.message);
    console.error("Stack trace:", error.stack);
    rl.close();
  }
}

// 运行主函数
main().catch(error => {
  log('测试失败', error.message);
  console.error("Stack trace:", error.stack);
  rl.close();
  process.exit(1);
}); 