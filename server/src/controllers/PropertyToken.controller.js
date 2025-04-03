/**
 * PropertyToken合约控制器
 * 直接代理PropertyToken.json ABI文件中的所有方法
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../../../shared/src/utils');
const { blockchainService } = require('../services');

// 读取ABI文件
const abiPath = path.resolve(process.cwd(), 'config/abi/PropertyToken.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// 合约地址配置
const addressConfigPath = path.resolve(process.cwd(), 'config/contract-addresses.json');
let contractAddress;

// 从配置文件获取合约地址
if (fs.existsSync(addressConfigPath)) {
  const addressConfig = JSON.parse(fs.readFileSync(addressConfigPath, 'utf8'));
  const networkType = process.env.BLOCKCHAIN_NETWORK || 'localhost';
  contractAddress = addressConfig[networkType]?.PropertyToken;
}

// 如果配置文件中没有，尝试从环境变量获取
if (!contractAddress) {
  contractAddress = process.env.CONTRACT_PROPERTYTOKEN_ADDRESS;
}

// 合约实例
let contractInstance = null;

/**
 * 初始化合约实例
 */
async function initContract() {
  try {
    if (!contractInstance) {
      await blockchainService.initialize();
      contractInstance = blockchainService.getContractInstance(abi, contractAddress);
      Logger.info('PropertyToken合约初始化成功', { address: contractAddress });
    }
    return contractInstance;
  } catch (error) {
    Logger.error(`PropertyToken合约初始化失败: ${error.message}`, { error });
    throw error;
  }
}

/**
 * 处理合约返回结果
 * @param {any} result - 合约调用结果
 * @returns {any} - 处理后的结果
 */
function processContractResult(result) {
  // 如果是数组
  if (Array.isArray(result)) {
    return result.map(item => processContractResult(item));
  }
  
  // 如果是对象
  if (result && typeof result === 'object') {
    // 检查是否是BigNumber（ethers.js中BigNumber有_hex属性）
    if (result._hex !== undefined) {
      return result.toString();
    }
    
    // 普通对象
    const processed = {};
    for (const key of Object.keys(result)) {
      // 忽略数字索引，处理命名属性
      if (isNaN(parseInt(key))) {
        processed[key] = processContractResult(result[key]);
      }
    }
    return processed;
  }
  
  // 原始类型直接返回
  return result;
}

/**
 * 统一的API响应格式
 * @param {Object} res - Express响应对象
 * @param {any} data - 响应数据
 * @param {string} errorMessage - 错误消息
 * @param {number} statusCode - HTTP状态码
 */
function sendResponse(res, data = null, errorMessage = null, statusCode = 200) {
  const success = !errorMessage;
  
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    response.data = data;
  } else {
    response.error = {
      message: errorMessage
    };
  }
  
  return res.status(statusCode).json(response);
}

/**
 * 获取合约地址
 */
async function getContractAddress(req, res) {
  try {
    return sendResponse(res, { address: contractAddress });
  } catch (error) {
    Logger.error(`获取PropertyToken合约地址失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * name - 获取代币名称
 */
async function name(req, res) {
  try {
    const contract = await initContract();
    const result = await contract.name();
    return sendResponse(res, result);
  } catch (error) {
    Logger.error(`调用PropertyToken.name失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * symbol - 获取代币符号
 */
async function symbol(req, res) {
  try {
    const contract = await initContract();
    const result = await contract.symbol();
    return sendResponse(res, result);
  } catch (error) {
    Logger.error(`调用PropertyToken.symbol失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * balanceOf - 查询余额
 */
async function balanceOf(req, res) {
  try {
    const contract = await initContract();
    const { account } = req.query;
    
    if (!account) {
      return sendResponse(res, null, '缺少必要参数: account', 400);
    }
    
    const result = await contract.balanceOf(account);
    return sendResponse(res, processContractResult(result));
  } catch (error) {
    Logger.error(`调用PropertyToken.balanceOf失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * totalSupply - 获取总供应量
 */
async function totalSupply(req, res) {
  try {
    const contract = await initContract();
    const result = await contract.totalSupply();
    return sendResponse(res, processContractResult(result));
  } catch (error) {
    Logger.error(`调用PropertyToken.totalSupply失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * transfer - 转账
 */
async function transfer(req, res) {
  try {
    const { to, amount } = req.body;
    
    if (!to || amount === undefined) {
      return sendResponse(res, null, '缺少必要参数: to, amount', 400);
    }
    
    // 获取私钥
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) {
      return sendResponse(res, null, '未配置区块链私钥，无法发送交易', 400);
    }
    
    // 创建签名者
    await blockchainService.initialize();
    const provider = blockchainService.provider;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // 获取带签名者的合约实例
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    
    // 发送交易
    const tx = await contract.transfer(to, amount);
    
    // 等待交易确认
    Logger.info(`交易已提交: ${tx.hash}`, { method: 'transfer' });
    const receipt = await tx.wait();
    
    return sendResponse(res, {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });
  } catch (error) {
    Logger.error(`调用PropertyToken.transfer失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * 其他PropertyToken合约特有方法...
 */

// 导出所有方法
module.exports = {
  getContractAddress,
  name,
  symbol,
  balanceOf,
  totalSupply,
  transfer,
  // 其他方法...
}; 