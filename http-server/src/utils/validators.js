/**
 * 参数验证工具
 * 提供常用的参数验证方法
 */
const { ethers } = require('ethers');

/**
 * 验证以太坊地址格式
 * @param {string} value - 要验证的地址
 * @returns {boolean} 是否有效
 */
function isEthAddress(value) {
  try {
    return typeof value === 'string' && ethers.isAddress(value);
  } catch (error) {
    return false;
  }
}

/**
 * 验证是否为非空字符串
 * @param {string} value - 要验证的字符串
 * @returns {boolean} 是否有效
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 验证是否为正整数
 * @param {number|string} value - 要验证的数值
 * @returns {boolean} 是否有效
 */
function isPositiveInteger(value) {
  if (typeof value === 'string') {
    value = value.trim();
  }
  return /^(0|[1-9]\d*)$/.test(value);
}

/**
 * 验证是否为有效的十六进制字符串
 * @param {string} value - 要验证的十六进制字符串
 * @param {boolean} includePrefix - 是否必须包含0x前缀
 * @returns {boolean} 是否有效
 */
function isHexString(value, includePrefix = true) {
  if (typeof value !== 'string') {
    return false;
  }
  
  const hexRegex = includePrefix 
    ? /^0x[0-9a-fA-F]+$/
    : /^(0x)?[0-9a-fA-F]+$/;
    
  return hexRegex.test(value);
}

/**
 * 验证是否为有效的私钥
 * @param {string} value - 要验证的私钥
 * @returns {boolean} 是否有效
 */
function isPrivateKey(value) {
  try {
    if (!isHexString(value, false)) {
      return false;
    }
    
    // 移除可能的0x前缀
    const key = value.startsWith('0x') ? value.slice(2) : value;
    
    // 私钥应该是32字节（64个十六进制字符）
    if (key.length !== 64) {
      return false;
    }
    
    // 尝试创建钱包验证私钥
    new ethers.Wallet(value);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 验证是否为正数（包括小数）
 * @param {number|string} value - 要验证的数值
 * @returns {boolean} 是否有效
 */
function isPositiveNumber(value) {
  if (typeof value === 'string') {
    value = value.trim();
  }
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

/**
 * 验证是否为有效的交易哈希
 * @param {string} value - 要验证的交易哈希
 * @returns {boolean} 是否有效
 */
function isTransactionHash(value) {
  return isHexString(value, true) && value.length === 66;
}

/**
 * 验证是否为ISO日期格式
 * @param {string} value - 要验证的日期字符串
 * @returns {boolean} 是否有效
 */
function isISODate(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }
  
  try {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString().includes(value);
  } catch (error) {
    return false;
  }
}

module.exports = {
  isEthAddress,
  isNonEmptyString,
  isPositiveInteger,
  isHexString,
  isPrivateKey,
  isPositiveNumber,
  isTransactionHash,
  isISODate
}; 