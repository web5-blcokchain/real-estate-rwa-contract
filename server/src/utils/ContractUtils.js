/**
 * 合约工具类
 * 提供处理智能合约数据的通用工具函数
 */
const { ethers } = require('ethers');

/**
 * 处理合约返回结果
 * 统一处理BigNumber、数组、结构体等各种类型
 * @param {any} result - 合约调用结果
 * @returns {any} - 处理后的结果
 */
function processContractResult(result) {
  // 处理BigNumber类型
  if (ethers.BigNumber.isBigNumber(result)) {
    return result.toString();
  }
  
  // 处理数组
  if (Array.isArray(result)) {
    return result.map(item => processContractResult(item));
  }
  
  // 处理对象，包括结构体
  if (result && typeof result === 'object' && !ethers.BigNumber.isBigNumber(result)) {
    // 检查是否是结构体（有数字索引）
    if (Object.keys(result).some(key => !isNaN(parseInt(key)))) {
      const processed = {};
      // 处理数字索引和命名属性
      for (const key in result) {
        if (!isNaN(parseInt(key))) continue; // 跳过数字索引
        processed[key] = processContractResult(result[key]);
      }
      return processed;
    }
    
    // 普通对象
    const processed = {};
    for (const key in result) {
      processed[key] = processContractResult(result[key]);
    }
    return processed;
  }
  
  return result;
}

/**
 * 格式化代币金额，从wei转换为标准单位
 * @param {string|BigNumber} amount - 代币金额（wei）
 * @param {number} decimals - 代币精度，默认18
 * @returns {string} - 格式化后的金额
 */
function formatTokenAmount(amount, decimals = 18) {
  if (!amount) return '0';
  return ethers.utils.formatUnits(amount, decimals);
}

/**
 * 解析代币金额，从标准单位转换为wei
 * @param {string|number} amount - 代币金额（标准单位）
 * @param {number} decimals - 代币精度，默认18
 * @returns {BigNumber} - 解析后的金额（wei）
 */
function parseTokenAmount(amount, decimals = 18) {
  if (!amount) return ethers.BigNumber.from(0);
  return ethers.utils.parseUnits(amount.toString(), decimals);
}

/**
 * 统一的API响应格式
 * @param {Object} res - Express响应对象 
 * @param {any} data - 响应数据
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} - Express响应
 */
function sendResponse(res, data, statusCode = 200) {
  if (!res) return;
  
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    data: data,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  processContractResult,
  formatTokenAmount,
  parseTokenAmount,
  sendResponse
}; 