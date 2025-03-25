/**
 * 交易工具模块
 * 提供交易处理的公共函数
 */
const { ethers } = require('ethers');
const { logger } = require('./logger');

/**
 * 处理交易错误
 * @param {Error} error 错误对象
 * @param {string} operation 操作名称
 * @returns {Object} 错误信息对象
 */
function handleTransactionError(error, operation) {
  logger.error(`${operation}失败: ${error.message}`);
  
  // 解析错误信息
  let errorMessage = error.message;
  let errorCode = '';
  let errorData = '';
  
  // 检查是否是ethers的错误
  if (error.code && error.reason) {
    errorCode = error.code;
    errorMessage = error.reason;
  }
  
  // 检查是否包含交易数据
  if (error.transaction) {
    errorData = {
      to: error.transaction.to,
      from: error.transaction.from,
      data: error.transaction.data ? error.transaction.data.substring(0, 66) + '...' : '',
      gasLimit: error.transaction.gasLimit?.toString() || ''
    };
  }
  
  // 解析智能合约错误
  if (error.data) {
    try {
      const iface = new ethers.utils.Interface(['function Error(string)']);
      const decodedError = iface.parseError(error.data);
      if (decodedError && decodedError.args && decodedError.args.length > 0) {
        errorMessage = decodedError.args[0];
      }
    } catch (parseError) {
      // 无法解析合约错误，使用原始错误信息
    }
  }
  
  return {
    success: false,
    error: {
      message: errorMessage,
      code: errorCode,
      data: errorData,
      original: error.message
    }
  };
}

/**
 * 估算交易gas
 * @param {ethers.Contract} contract 合约实例
 * @param {string} method 方法名称
 * @param {Array} args 方法参数
 * @param {Object} options 选项
 * @returns {Promise<ethers.BigNumber>} gas限制
 */
async function estimateGas(contract, method, args, options = {}) {
  try {
    // 获取方法估算gas
    const estimatedGas = await contract.estimateGas[method](...args);
    
    // 增加安全边际 (默认20%)
    const safetyMargin = options.safetyMargin || 0.2;
    const gasLimit = estimatedGas.mul(Math.floor(100 + safetyMargin * 100)).div(100);
    
    logger.info(`方法 ${method} 估算gas: ${estimatedGas.toString()}, 安全gas限制: ${gasLimit.toString()}`);
    
    return gasLimit;
  } catch (error) {
    logger.warn(`估算gas失败: ${error.message}`);
    
    // 如果估算失败，返回配置的默认值或固定值
    return ethers.BigNumber.from(options.defaultGasLimit || 500000);
  }
}

/**
 * 获取最佳gas价格
 * @param {ethers.providers.Provider} provider 提供者
 * @param {Object} options 选项
 * @returns {Promise<ethers.BigNumber>} gas价格
 */
async function getGasPrice(provider, options = {}) {
  try {
    // 获取当前gas价格
    const gasPrice = await provider.getGasPrice();
    
    // 根据优先级调整gas价格 (默认10%)
    const priority = options.priority || 'medium';
    let priorityMultiplier = 1.0;
    
    switch (priority) {
      case 'low':
        priorityMultiplier = 0.9;  // 低优先级，降低10%
        break;
      case 'medium':
        priorityMultiplier = 1.1;  // 中优先级，增加10%
        break;
      case 'high':
        priorityMultiplier = 1.3;  // 高优先级，增加30%
        break;
      case 'urgent':
        priorityMultiplier = 1.5;  // 紧急，增加50%
        break;
      default:
        priorityMultiplier = 1.0;
    }
    
    const adjustedGasPrice = gasPrice.mul(Math.floor(priorityMultiplier * 100)).div(100);
    
    logger.info(`当前gas价格: ${ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei, 调整后: ${ethers.utils.formatUnits(adjustedGasPrice, 'gwei')} Gwei`);
    
    return adjustedGasPrice;
  } catch (error) {
    logger.warn(`获取gas价格失败: ${error.message}`);
    
    // 如果获取失败，返回配置的默认值
    return ethers.utils.parseUnits(options.defaultGasPrice || '5', 'gwei');
  }
}

/**
 * 等待交易确认
 * @param {ethers.providers.Provider} provider 提供者
 * @param {string} txHash 交易哈希
 * @param {number} confirmations 确认数
 * @returns {Promise<ethers.providers.TransactionReceipt>} 交易收据
 */
async function waitForTransaction(provider, txHash, confirmations = 1) {
  try {
    logger.info(`等待交易 ${txHash} 确认中...`);
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    
    if (receipt.status === 1) {
      logger.info(`交易 ${txHash} 已确认，区块: ${receipt.blockNumber}`);
    } else {
      logger.error(`交易 ${txHash} 失败`);
    }
    
    return receipt;
  } catch (error) {
    logger.error(`等待交易确认失败: ${error.message}`);
    throw error;
  }
}

/**
 * 执行合约交易
 * @param {ethers.Contract} contract 合约实例
 * @param {string} method 方法名称
 * @param {Array} args 方法参数
 * @param {Object} options 选项
 * @returns {Promise<Object>} 交易结果
 */
async function executeTransaction(contract, method, args, options = {}) {
  const operation = options.operation || `执行方法 ${method}`;
  
  try {
    logger.info(`开始${operation}...`);
    
    let txOptions = {};
    
    // 如果需要估算gas
    if (options.estimateGas !== false) {
      txOptions.gasLimit = await estimateGas(contract, method, args, {
        safetyMargin: options.safetyMargin,
        defaultGasLimit: options.gasLimit
      });
    } else if (options.gasLimit) {
      txOptions.gasLimit = options.gasLimit;
    }
    
    // 如果需要设置gas价格
    if (options.customGasPrice) {
      txOptions.gasPrice = options.customGasPrice;
    } else if (options.getGasPrice !== false) {
      txOptions.gasPrice = await getGasPrice(contract.provider, {
        priority: options.priority,
        defaultGasPrice: options.defaultGasPrice
      });
    }
    
    // 执行交易
    const tx = await contract.functions[method](...args, txOptions);
    logger.info(`${operation}交易已提交: ${tx.hash}`);
    
    // 等待交易确认
    const confirmations = options.confirmations || 1;
    const receipt = await waitForTransaction(contract.provider, tx.hash, confirmations);
    
    // 处理交易结果
    if (receipt.status === 1) {
      logger.info(`${operation}成功，交易哈希: ${tx.hash}`);
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } else {
      logger.error(`${operation}失败，交易被回滚`);
      return {
        success: false,
        error: {
          message: '交易被回滚',
          transactionHash: tx.hash
        }
      };
    }
  } catch (error) {
    return handleTransactionError(error, operation);
  }
}

module.exports = {
  executeTransaction,
  estimateGas,
  getGasPrice,
  waitForTransaction,
  handleTransactionError
}; 