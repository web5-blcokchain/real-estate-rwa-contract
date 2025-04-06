/**
 * 合约交易管理类
 * 负责处理合约交易的高级封装和状态跟踪
 */
const { ethers } = require('ethers');
const { ContractError, ErrorHandler } = require('../../utils/errors');
const Logger = require('../../utils/logger');
const Validation = require('../../utils/validation');
const ContractSender = require('./sender');
const ContractEvent = require('./event');
const { formatContractArgs } = require('../../utils/formatter');

/**
 * 交易状态枚举
 */
const TransactionStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
  REVERTED: 'reverted'
};

/**
 * 合约交易管理类
 */
class ContractTransaction {
  /**
   * 执行合约交易并等待确认
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} method - 方法名称
   * @param {Array} args - 参数数组
   * @param {Object} options - 交易选项
   * @param {number} [options.confirmations=1] - 确认数
   * @param {number} [options.timeout=300000] - 超时时间(毫秒)
   * @param {Function} [options.onStatus] - 状态变化回调函数
   * @returns {Promise<Object>} 交易结果对象
   */
  static async execute(contract, method, args = [], options = {}) {
    // 默认值设置
    const confirmations = options.confirmations || 1;
    const timeout = options.timeout || 300000; // 默认5分钟
    const onStatus = options.onStatus || (() => {});
    
    // 记录交易开始
    Logger.debug(`开始执行合约交易: ${method}`, {
      contract: contract.address,
      method,
      args: formatContractArgs(args),
      confirmations,
      timeout
    });

    try {
      // 更新状态: 等待交易发送
      onStatus({
        status: TransactionStatus.PENDING,
        message: '正在提交交易...',
        timestamp: Date.now()
      });

      // 发送交易
      const tx = await ContractSender.send(contract, method, args, options);
      
      // 更新状态: 交易已发送，等待确认
      onStatus({
        status: TransactionStatus.PENDING,
        message: '交易已提交，等待确认...',
        txHash: tx.hash,
        timestamp: Date.now()
      });

      // 创建一个带超时的Promise
      const receiptPromise = ContractSender.waitForTransaction(tx, confirmations);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new ContractError(`交易确认超时(${timeout}ms): ${tx.hash}`));
        }, timeout);
      });

      // 等待交易确认或超时
      const receipt = await Promise.race([receiptPromise, timeoutPromise]);

      // 验证交易是否成功
      if (receipt.status !== 1) {
        // 交易被还原
        onStatus({
          status: TransactionStatus.REVERTED,
          message: '交易被还原',
          txHash: tx.hash,
          receipt,
          timestamp: Date.now()
        });
        
        throw new ContractError(`交易被还原: ${tx.hash}`);
      }

      // 交易成功
      onStatus({
        status: TransactionStatus.CONFIRMED,
        message: '交易已确认',
        txHash: tx.hash,
        receipt,
        timestamp: Date.now()
      });

      // 解析事件
      const events = ContractEvent.parseReceiptEvents(receipt, contract);

      // 返回交易结果
      return {
        status: TransactionStatus.CONFIRMED,
        txHash: tx.hash,
        receipt,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        events,
        timestamp: Date.now()
      };
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { 
          method: 'execute', 
          contractMethod: method,
          args: formatContractArgs(args)
        }
      });

      // 判断错误类型
      let status = TransactionStatus.FAILED;
      if (error.message && error.message.includes('timeout')) {
        status = TransactionStatus.TIMEOUT;
      } else if (error.message && error.message.includes('reverted')) {
        status = TransactionStatus.REVERTED;
      }

      // 更新状态: 交易失败
      onStatus({
        status,
        message: handledError.message,
        error: handledError,
        timestamp: Date.now()
      });

      Logger.error(`合约交易失败: ${handledError.message}`, {
        status,
        method,
        args: formatContractArgs(args),
        error: handledError
      });

      // 返回失败结果
      return {
        status,
        error: handledError,
        message: handledError.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 批量执行多个合约交易
   * @param {Array<Object>} transactions - 交易对象数组
   * @param {ethers.Contract} transactions[].contract - 合约实例
   * @param {string} transactions[].method - 方法名称
   * @param {Array} transactions[].args - 参数数组
   * @param {Object} transactions[].options - 交易选项
   * @param {Object} options - 批量执行选项
   * @param {boolean} [options.stopOnFailure=false] - 是否在失败时停止
   * @param {Function} [options.onProgress] - 进度回调函数
   * @returns {Promise<Array>} 交易结果数组
   */
  static async batchExecute(transactions, options = {}) {
    const stopOnFailure = options.stopOnFailure || false;
    const onProgress = options.onProgress || (() => {});
    const results = [];
    
    Logger.info(`开始批量执行合约交易`, { count: transactions.length });

    // 遍历执行每个交易
    for (let i = 0; i < transactions.length; i++) {
      const { contract, method, args = [], options = {} } = transactions[i];
      
      // 更新进度
      onProgress({
        current: i + 1,
        total: transactions.length,
        percentage: Math.floor(((i + 1) / transactions.length) * 100),
        status: 'processing',
        message: `正在处理第${i + 1}个交易: ${method}`
      });

      // 执行单个交易
      const result = await this.execute(contract, method, args, options);
      results.push(result);

      // 如果设置了失败停止且当前交易失败
      if (stopOnFailure && result.status !== TransactionStatus.CONFIRMED) {
        Logger.warn(`批量执行交易中断: 交易${i + 1}失败`, {
          status: result.status,
          message: result.message
        });
        
        // 更新进度
        onProgress({
          current: i + 1,
          total: transactions.length,
          percentage: Math.floor(((i + 1) / transactions.length) * 100),
          status: 'interrupted',
          message: `执行中断: ${result.message}`
        });
        
        break;
      }
    }

    // 计算成功和失败的交易数量
    const successCount = results.filter(r => r.status === TransactionStatus.CONFIRMED).length;
    
    // 更新最终进度
    onProgress({
      current: results.length,
      total: transactions.length,
      percentage: Math.floor((results.length / transactions.length) * 100),
      status: 'completed',
      message: `批量执行完成: ${successCount}/${results.length}成功`
    });

    Logger.info(`批量执行合约交易完成`, { 
      total: transactions.length,
      executed: results.length,
      success: successCount,
      failed: results.length - successCount
    });

    return results;
  }
}

// 导出交易状态枚举和交易管理类
module.exports = {
  TransactionStatus,
  ContractTransaction
}; 