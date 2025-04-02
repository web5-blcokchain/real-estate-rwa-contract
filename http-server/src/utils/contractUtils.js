/**
 * 合约交互工具函数
 * 封装合约操作，提供重试机制和错误处理
 */
const { Contract, Provider, NetworkManager, Logger } = require('../../../shared/src');

/**
 * 获取合约实例
 * @param {String} contractName - 合约名称
 * @param {Object} options - 选项
 * @param {String} options.network - 网络名称，默认使用当前活动网络
 * @param {Object} options.wallet - 钱包实例，用于发送交易
 * @returns {Promise<Object>} 合约实例
 */
exports.getContract = async (contractName, options = {}) => {
  try {
    const { network, wallet } = options;
    
    // 获取网络参数
    let networkInfo;
    if (network) {
      networkInfo = await NetworkManager.getNetwork(network);
    } else {
      networkInfo = await NetworkManager.getActiveNetwork();
    }
    
    if (!networkInfo) {
      throw new Error(`无法获取网络信息`);
    }
    
    // 获取提供者
    const provider = await Provider.getProvider(networkInfo);
    
    // 创建合约实例
    return await Contract.getContract(contractName, provider, wallet);
  } catch (error) {
    Logger.error(`获取合约 ${contractName} 实例失败`, { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * 调用合约方法（只读操作）
 * @param {String} contractName - 合约名称
 * @param {String} methodName - 方法名称
 * @param {Array} args - 方法参数
 * @param {Object} options - 选项
 * @param {String} options.network - 网络名称
 * @returns {Promise<*>} 方法调用结果
 */
exports.callContractMethod = async (contractName, methodName, args = [], options = {}) => {
  try {
    // 获取合约实例
    const contract = await exports.getContract(contractName, options);
    
    // 调用合约方法
    Logger.info(`调用合约方法: ${contractName}.${methodName}`, { args });
    const result = await contract[methodName](...args);
    
    return result;
  } catch (error) {
    Logger.error(`调用合约方法 ${contractName}.${methodName} 失败`, { 
      error: error.message, 
      stack: error.stack,
      args 
    });
    throw error;
  }
};

/**
 * 发送合约交易（写入操作）
 * @param {String} contractName - 合约名称
 * @param {String} methodName - 方法名称
 * @param {Array} args - 方法参数
 * @param {Object} options - 选项
 * @param {String} options.network - 网络名称
 * @param {Object} options.wallet - 钱包实例，必须提供
 * @param {Object} options.txOptions - 交易选项（gasLimit, gasPrice等）
 * @returns {Promise<Object>} 交易收据
 */
exports.sendContractTransaction = async (contractName, methodName, args = [], options = {}) => {
  const { wallet, txOptions = {} } = options;
  
  if (!wallet) {
    throw new Error('发送合约交易需要提供钱包实例');
  }
  
  try {
    // 获取合约实例
    const contract = await exports.getContract(contractName, { ...options, wallet });
    
    // 调用合约方法，获取交易响应
    Logger.info(`发送合约交易: ${contractName}.${methodName}`, { args, txOptions });
    const tx = await contract[methodName](...args, txOptions);
    
    // 等待交易确认
    Logger.info(`等待交易确认: ${tx.hash}`);
    const receipt = await tx.wait();
    
    Logger.info(`交易已确认: ${tx.hash}`, { 
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });
    
    return receipt;
  } catch (error) {
    Logger.error(`发送合约交易 ${contractName}.${methodName} 失败`, { 
      error: error.message, 
      stack: error.stack,
      args,
      txOptions
    });
    throw error;
  }
};

/**
 * 重试合约调用
 * 当遇到临时错误时自动重试
 * @param {Function} contractCall - 合约调用函数
 * @param {Object} options - 重试选项
 * @param {Number} options.maxRetries - 最大重试次数，默认3次
 * @param {Number} options.delay - 重试延迟(ms)，默认1000ms
 * @param {Function} options.shouldRetry - 判断是否应该重试的函数，接收错误对象参数
 * @returns {Promise<*>} 合约调用结果
 */
exports.retryContractCall = async (contractCall, options = {}) => {
  const { 
    maxRetries = 3, 
    delay = 1000,
    shouldRetry = (error) => {
      // 默认判断是否为临时错误
      const temporaryErrors = [
        'timeout', 'time out', 'timed out',
        'connection', 'network', 'reset',
        'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
        'rate limit', 'too many requests',
        'nonce', 'replacement transaction underpriced',
        'transaction underpriced'
      ];
      
      const errorMsg = error.message.toLowerCase();
      return temporaryErrors.some(msg => errorMsg.includes(msg));
    }
  } = options;
  
  let retries = 0;
  let lastError;
  
  while (retries <= maxRetries) {
    try {
      if (retries > 0) {
        Logger.info(`尝试第 ${retries} 次重试合约调用`);
      }
      
      return await contractCall();
    } catch (error) {
      lastError = error;
      
      if (retries >= maxRetries || !shouldRetry(error)) {
        // 达到最大重试次数或不应该重试的错误
        break;
      }
      
      Logger.warn(`合约调用失败，${delay}ms后重试`, { 
        error: error.message, 
        retry: retries + 1 
      });
      
      // 等待延迟时间
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 指数退避策略
      retries++;
    }
  }
  
  // 所有重试都失败
  throw lastError;
}; 