/**
 * 交易工具模块
 * 提供交易处理的公共函数
 */
const { ethers } = require('hardhat');
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
  if (error.code) {
    errorCode = error.code;
    // ethers v6 错误处理
    if (error.code === 'NETWORK_ERROR') {
      errorMessage = '网络连接错误，请检查网络连接';
    } else if (error.code === 'NONCE_EXPIRED') {
      errorMessage = '交易nonce已过期，请重试';
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = '账户余额不足';
    } else if (error.code === 'REPLACEMENT_TRANSACTION_UNDERPRICED') {
      errorMessage = '替换交易gas价格过低';
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      errorMessage = '无法预测gas限制，可能是合约执行失败';
    }
  }
  
  // 检查是否包含交易数据
  if (error.transaction) {
    errorData = {
      to: error.transaction.to,
      from: error.transaction.from,
      data: error.transaction.data ? error.transaction.data.substring(0, 66) + '...' : '',
      gasLimit: error.transaction.gasLimit?.toString() || '',
      nonce: error.transaction.nonce?.toString() || ''
    };
  }
  
  // 解析智能合约错误
  if (error.data) {
    try {
      const iface = new ethers.Interface(['function Error(string)']);
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
 * @returns {Promise<bigint>} gas限制
 */
async function estimateGas(contract, method, args, options = {}) {
  try {
    // 获取方法估算gas
    const estimatedGas = await contract[method].estimateGas(...args);
    
    // 增加安全边际 (默认20%)
    const safetyMargin = options.safetyMargin || 0.2;
    const gasLimit = estimatedGas * BigInt(Math.floor(100 + safetyMargin * 100)) / BigInt(100);
    
    // 记录gas估算信息
    logger.info(`方法 ${method} 估算gas: ${estimatedGas.toString()}, 安全gas限制: ${gasLimit.toString()}`);
    
    // 检查是否超过区块gas限制
    try {
      // 确保我们有有效的provider
      const provider = contract.runner.provider || await ethers.provider;
      if (!provider) {
        throw new Error('Provider is not available');
      }
      
      const block = await provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get latest block');
      }
      
      if (gasLimit > block.gasLimit) {
        logger.warn(`警告: 估算的gas限制(${gasLimit.toString()})超过区块gas限制(${block.gasLimit.toString()})`);
      }
    } catch (error) {
      logger.warn(`获取区块gas限制失败: ${error.message}`);
    }
    
    return gasLimit;
  } catch (error) {
    logger.warn(`估算gas失败: ${error.message}`);
    
    // 如果估算失败，返回配置的默认值或固定值
    const defaultGasLimit = options.defaultGasLimit || 500000;
    return BigInt(defaultGasLimit);
  }
}

/**
 * 获取最佳gas价格
 * @param {ethers.Provider} provider 提供者
 * @returns {Promise<bigint>} gas价格
 */
async function getGasPrice(provider) {
  try {
    // Ensure we have a valid provider
    if (!provider) {
      provider = await ethers.provider;
    }
    
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
    
    // 记录gas价格信息
    logger.info(`[system] 当前gas价格: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    // 检查gas价格是否过高
    const maxGasPrice = ethers.parseUnits('100', 'gwei'); // 100 gwei
    if (gasPrice > maxGasPrice) {
      logger.warn(`警告: gas价格(${ethers.formatUnits(gasPrice, 'gwei')} gwei)超过阈值`);
    }
    
    return gasPrice;
  } catch (error) {
    logger.warn(`[system] 获取gas价格失败: ${error.message}`);
    // Return a reasonable default gas price (30 gwei)
    return ethers.parseUnits('30', 'gwei');
  }
}

/**
 * 等待交易确认
 * @param {ethers.TransactionResponse} tx 交易响应
 * @param {number} confirmations 确认数
 * @returns {Promise<ethers.TransactionReceipt>} 交易收据
 */
async function waitForTransaction(tx, confirmations = 1) {
  try {
    // 等待交易确认
    const receipt = await tx.wait(confirmations);
    if (!receipt) {
      throw new Error('Transaction receipt is not available');
    }
    
    // 检查交易状态
    if (receipt.status === 0) {
      throw new Error('Transaction failed');
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
      const provider = contract.runner.provider || await ethers.provider;
      txOptions.gasPrice = await getGasPrice(provider);
    }
    
    // 设置交易优先级
    if (options.priority === 'high') {
      txOptions.maxFeePerGas = txOptions.gasPrice * BigInt(2);
      txOptions.maxPriorityFeePerGas = txOptions.gasPrice / BigInt(2);
    }
    
    // 执行交易
    const tx = await contract[method](...args, txOptions);
    logger.info(`${operation}交易已提交: ${tx.hash}`);
    
    // 等待交易确认
    const receipt = await waitForTransaction(tx, options.confirmations || 1);
    
    // 构建返回结果
    const result = {
      success: true,
      transactionHash: tx.hash
    };
    
    // 安全地添加收据信息
    if (receipt) {
      if (receipt.gasUsed) {
        result.gasUsed = receipt.gasUsed.toString();
      }
      if (receipt.gasPrice) {
        result.effectiveGasPrice = receipt.gasPrice.toString();
      }
      if (receipt.blockNumber) {
        result.blockNumber = receipt.blockNumber;
      }
    }
    
    return result;
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