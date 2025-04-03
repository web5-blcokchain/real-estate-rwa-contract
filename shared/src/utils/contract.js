/**
 * 合约交互工具
 * 通过shared模块与区块链合约交互
 */
const { ethers } = require('ethers');
const Logger = require('./logger');
const { ConfigError } = require('./errors');
const { EnvConfig, ContractConfig, NetworkConfig, AbiConfig } = require('../config');
const { Provider, Wallet } = require('../core');

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
 * 格式化代币金额，从wei转换为标准单位
 * @param {BigNumber|string|number} amount - 代币金额（wei）
 * @param {number} decimals - 代币精度，默认18
 * @returns {string} - 格式化后的金额（标准单位）
 */
function formatTokenAmount(amount, decimals = 18) {
  if (!amount) return '0';
  return ethers.utils.formatUnits(amount.toString(), decimals);
}

/**
 * 创建合约实例
 * @param {string} contractName - 合约名称
 * @param {Object} [options] - 选项
 * @param {string} [options.networkType] - 网络类型，可选值：localhost, testnet, mainnet
 * @param {Object} [options.provider] - Provider实例
 * @param {Object} [options.wallet] - 钱包实例
 * @param {string} [options.privateKey] - 私钥
 * @param {string} [options.address] - 自定义合约地址（可选，默认使用环境配置）
 * @returns {Promise<ethers.Contract>} - 合约实例
 */
async function createContractInstance(contractName, options = {}) {
  try {
    // 获取网络类型
    const networkType = options.networkType || EnvConfig.getNetworkType();
    
    // 获取合约地址和ABI
    let contractAddress, contractAbi;
    
    try {
      // 优先使用options中指定的地址
      contractAddress = options.address;
      
      if (!contractAddress) {
        // 使用ContractConfig获取地址
        if (networkType) {
          contractAddress = ContractConfig.getNetworkSpecificContractAddress(contractName, networkType);
        } else {
          contractAddress = ContractConfig.getContractAddress(contractName);
        }
      }
      
      // 获取ABI
      const contractInfo = ContractConfig.getContractConfig(contractName);
      contractAbi = contractInfo.abi;
    } catch (error) {
      throw new ConfigError(`获取合约配置失败: ${error.message}`);
    }
    
    // 创建Provider
    const provider = options.provider || await Provider.create({
      networkType
    });
    
    // 获取钱包或签名者
    let signer = null;
    if (options.wallet) {
      signer = options.wallet.connect(provider);
    } else if (options.privateKey) {
      signer = new ethers.Wallet(options.privateKey, provider);
    }
    
    // 创建合约实例
    const contract = new ethers.Contract(
      contractAddress,
      contractAbi,
      signer || provider
    );
    
    // 记录创建信息
    Logger.debug('合约实例创建成功', {
      contractName,
      address: contractAddress,
      networkType
    });
    
    return contract;
  } catch (error) {
    Logger.error('创建合约实例失败', {
      contractName,
      error: error.message,
      stack: error.stack
    });
    throw new ConfigError(`创建合约实例 ${contractName} 失败: ${error.message}`);
  }
}

/**
 * 调用合约只读方法
 * @param {string} contractName - 合约名称
 * @param {string} methodName - 方法名称
 * @param {Array} args - 参数数组
 * @param {Object} [options] - 选项 
 * @param {string} [options.networkType] - 网络类型，可选值：localhost, testnet, mainnet
 * @param {boolean} [options.processResult=true] - 是否处理返回结果
 * @returns {Promise<any>} - 返回合约调用结果
 */
async function callContractMethod(contractName, methodName, args = [], options = {}) {
  try {
    // 获取网络类型
    const networkType = options.networkType || EnvConfig.getNetworkType();
    
    // 记录日志，增加网络类型信息
    Logger.info('调用合约方法', { 
      contractName, 
      methodName,
      networkType,
      args: JSON.stringify(args) 
    });
    
    // 创建合约实例
    const contract = await createContractInstance(contractName, options);
    
    // 验证方法是否存在
    if (typeof contract[methodName] !== 'function') {
      throw new ConfigError(`合约 ${contractName} 中不存在方法: ${methodName}`);
    }
    
    // 调用合约方法
    const result = await contract[methodName](...args);
    
    // 记录成功日志
    Logger.debug('合约方法调用成功', {
      contractName,
      methodName,
      result: typeof result === 'object' ? '复杂对象' : result.toString()
    });
    
    // 处理结果
    const shouldProcessResult = options.processResult !== false;
    return shouldProcessResult ? processContractResult(result) : result;
  } catch (error) {
    // 记录详细错误日志
    Logger.error('调用合约方法失败', {
      contractName,
      methodName,
      args: JSON.stringify(args),
      error: error.message,
      stack: error.stack
    });
    
    // 重新抛出带有上下文的错误
    throw new ConfigError(`调用合约 ${contractName}.${methodName} 失败: ${error.message}`);
  }
}

/**
 * 发送合约交易
 * @param {string} contractName - 合约名称
 * @param {string} methodName - 方法名称
 * @param {Array} args - 参数数组
 * @param {Object} options - 选项
 * @param {Object} [options.wallet] - 钱包实例
 * @param {string} [options.privateKey] - 私钥
 * @param {string} [options.networkType] - 网络类型，可选值：localhost, testnet, mainnet
 * @param {number|string} [options.gasLimit] - Gas限制
 * @param {number|string} [options.gasPrice] - Gas价格
 * @param {number} [options.maxRetries=1] - 最大重试次数
 * @param {boolean} [options.processResult=true] - 是否处理返回结果
 * @returns {Promise<any>} - 返回交易回执
 */
async function sendContractTransaction(contractName, methodName, args = [], options = {}) {
  let retryCount = 0;
  const maxRetries = options.maxRetries || 1;
  
  while (retryCount <= maxRetries) {
    try {
      // 获取网络类型
      const networkType = options.networkType || EnvConfig.getNetworkType();
      
      // 记录日志，增加网络类型信息
      Logger.info('发送合约交易', { 
        contractName, 
        methodName,
        networkType,
        args: JSON.stringify(args),
        retry: retryCount
      });
      
      // 如果没有提供钱包或私钥，抛出错误
      if (!options.wallet && !options.privateKey) {
        throw new ConfigError('未提供钱包或私钥，无法发送交易');
      }
      
      // 创建合约实例（使用钱包/私钥作为签名者）
      const contract = await createContractInstance(contractName, options);
      
      // 验证方法是否存在
      if (typeof contract[methodName] !== 'function') {
        throw new ConfigError(`合约 ${contractName} 中不存在方法: ${methodName}`);
      }
      
      // 构建交易选项
      const txOptions = {};
      if (options.gasLimit) txOptions.gasLimit = options.gasLimit;
      if (options.gasPrice) txOptions.gasPrice = options.gasPrice;
      
      // 检查网络是否是本地网络，如果是则添加更高的gas限制
      if (NetworkConfig.isLocalNetwork() && !options.gasLimit) {
        txOptions.gasLimit = 8000000; // 本地网络使用更高的gas限制
      }
      
      // 发送交易
      const tx = await contract[methodName](...args, txOptions);
      Logger.info('交易已提交', { 
        hash: tx.hash, 
        contractName, 
        methodName 
      });
      
      const receipt = await tx.wait();
      Logger.info('交易已确认', { 
        hash: receipt.hash, 
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      
      // 处理结果
      const shouldProcessResult = options.processResult !== false;
      return shouldProcessResult ? processContractResult(receipt) : receipt;
    } catch (error) {
      // 记录错误
      Logger.error('发送合约交易失败', {
        contractName,
        methodName,
        args: JSON.stringify(args),
        retry: retryCount,
        error: error.message,
        stack: error.stack
      });
      
      // 检查是否需要重试
      if (retryCount < maxRetries && 
          (error.message.includes('timeout') || 
           error.message.includes('network') ||
           error.message.includes('nonce') ||
           error.message.includes('underpriced'))) {
        retryCount++;
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        continue;
      }
      
      // 重新抛出带有上下文的错误
      throw new ConfigError(`发送合约交易 ${contractName}.${methodName} 失败: ${error.message}`);
    }
  }
}

module.exports = {
  callContractMethod,
  sendContractTransaction,
  createContractInstance,
  processContractResult,
  parseTokenAmount,
  formatTokenAmount
}; 