const { transactionQueue, TX_PRIORITY } = require('./transactionQueue');
const { logger } = require('../../../shared/utils/logger');

/**
 * 通过交易队列发送合约交易
 * @param {Object} contract 合约实例
 * @param {string} methodName 方法名
 * @param {Array} args 方法参数
 * @param {Object} options 选项对象
 * @param {string} options.from 发送地址
 * @param {string} options.priority 交易优先级
 * @param {Function} callback 回调函数
 * @returns {Promise<string>} 交易哈希
 */
async function sendContractTransaction(contract, methodName, args = [], options = {}, callback = null) {
  try {
    // 合约地址作为 'to'
    const to = contract.address;
    
    // 发送交易并跟踪它
    const txHash = await transactionQueue.addTransaction({
      from: options.from,
      to,
      contract,
      method: methodName,
      args,
      priority: options.priority || TX_PRIORITY.NORMAL,
    }, callback);
    
    logger.info(`合约交易已提交到队列: ${txHash}`, {
      contract: to,
      method: methodName
    });
    
    return txHash;
  } catch (error) {
    logger.error(`发送合约交易失败: ${error.message}`, {
      contract: contract.address,
      method: methodName,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * 通过交易队列发送标准交易
 * @param {string} to 接收地址
 * @param {string} data 交易数据
 * @param {string} value 交易金额
 * @param {Object} options 选项对象
 * @param {string} options.from 发送地址
 * @param {string} options.privateKey 私钥（用于签名）
 * @param {string} options.priority 交易优先级
 * @param {Function} callback 回调函数
 * @returns {Promise<string>} 交易哈希
 */
async function sendTransaction(to, data, value, options = {}, callback = null) {
  try {
    // 必须提供私钥
    if (!options.privateKey) {
      throw new Error('未提供私钥，无法发送交易');
    }
    
    // 发送交易并跟踪它
    const txHash = await transactionQueue.addTransaction({
      from: options.from,
      to,
      data,
      value,
      privateKey: options.privateKey,
      priority: options.priority || TX_PRIORITY.NORMAL,
    }, callback);
    
    logger.info(`标准交易已提交到队列: ${txHash}`, {
      to
    });
    
    return txHash;
  } catch (error) {
    logger.error(`发送标准交易失败: ${error.message}`, {
      to,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * 将合约方法转换为使用交易队列的方法
 * @param {Object} contract 合约实例
 * @param {string} methodName 方法名
 * @returns {Function} 包装后的方法
 */
function wrapContractMethod(contract, methodName) {
  return async function(...args) {
    // 最后一个参数可能是选项对象
    let options = {};
    let methodArgs = args;
    
    if (args.length > 0 && typeof args[args.length - 1] === 'object' && !Array.isArray(args[args.length - 1])) {
      options = args[args.length - 1];
      methodArgs = args.slice(0, args.length - 1);
    }
    
    return sendContractTransaction(contract, methodName, methodArgs, options);
  };
}

/**
 * 创建使用交易队列的合约包装器
 * @param {Object} contract 原始合约实例
 * @returns {Object} 包装后的合约实例
 */
function createQueuedContract(contract) {
  const queuedContract = {};
  
  // 复制所有合约属性
  Object.keys(contract).forEach(key => {
    if (typeof contract[key] === 'function') {
      // 对于方法，检查是否会改变状态（非view/pure方法）
      // 简单判断：没有'call'方法的通常是状态改变方法
      if (!contract[key].call) {
        queuedContract[key] = wrapContractMethod(contract, key);
      } else {
        // 对于只读方法，直接使用原始方法
        queuedContract[key] = contract[key].bind(contract);
      }
    } else {
      // 对于非方法属性，直接复制
      queuedContract[key] = contract[key];
    }
  });
  
  return queuedContract;
}

module.exports = {
  sendContractTransaction,
  sendTransaction,
  wrapContractMethod,
  createQueuedContract
}; 