const { logger } = require('../../../shared/utils/logger');
const { ethers } = require('ethers');
const { getProvider } = require('../../../shared/services/web3Service');
const CacheManager = require('./cacheManager');

// 创建用于交易队列的缓存实例
const txCache = CacheManager.createNamespace('transactionQueue', {
  stdTTL: 86400, // 1 day in seconds
  checkperiod: 300 // 5 mins
});

/**
 * 交易状态枚举
 */
const TX_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  STUCK: 'stuck',
  DROPPED: 'dropped'
};

/**
 * 交易优先级枚举
 */
const TX_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * 交易队列管理类
 * 负责跟踪区块链交易的状态、重试失败的交易以及优化gas价格
 */
class TransactionQueue {
  constructor() {
    this.provider = getProvider();
    this.pendingTxs = new Map();
    this.confirmationBlocks = 2; // 交易确认所需的区块数
    this.maxRetries = 3; // 交易重试最大次数
    this.checkInterval = 30000; // 交易状态检查间隔（30秒）
    this.gasPriceIncreasePercentage = 10; // 每次重试增加gas价格的百分比

    // 启动交易状态检查定时任务
    this.checker = setInterval(() => this._checkPendingTransactions(), this.checkInterval);
    
    // 从缓存恢复未处理交易
    this._recoverFromCache();
    
    // 为正常退出注册清理函数
    process.on('SIGTERM', () => this._cleanup());
    process.on('SIGINT', () => this._cleanup());
    
    logger.info('交易队列管理器已初始化');
  }

  /**
   * 添加交易到队列
   * @param {Object} txData 交易数据
   * @param {string} txData.hash 交易哈希
   * @param {string} txData.from 发送地址
   * @param {string} txData.to 接收地址
   * @param {string} txData.data 交易数据
   * @param {string} txData.value 交易金额
   * @param {Object} txData.contract 合约实例（可选）
   * @param {string} txData.method 合约方法名（可选）
   * @param {Array} txData.args 合约方法参数（可选）
   * @param {string} txData.priority 交易优先级（默认NORMAL）
   * @param {function} callback 交易完成后的回调函数（可选）
   * @returns {string} 交易哈希
   */
  async addTransaction(txData, callback = null) {
    try {
      // 如果没有提供交易哈希（即这是一个新交易请求）
      if (!txData.hash) {
        // 确定适当的gas价格
        const gasPrice = await this._getOptimalGasPrice(txData.priority || TX_PRIORITY.NORMAL);
        
        // 如果提供了合约实例，使用它发送交易
        if (txData.contract && txData.method) {
          const tx = await txData.contract[txData.method](...(txData.args || []), {
            gasPrice,
            gasLimit: txData.gasLimit || 2000000
          });
          txData.hash = tx.hash;
          logger.info(`交易已提交: ${txData.hash}`);
        } 
        // 否则使用provider发送交易
        else if (txData.to && (txData.data || txData.value)) {
          const wallet = new ethers.Wallet(txData.privateKey, this.provider);
          const tx = await wallet.sendTransaction({
            to: txData.to,
            data: txData.data || '0x',
            value: txData.value || '0x0',
            gasPrice,
            gasLimit: txData.gasLimit || 2000000
          });
          txData.hash = tx.hash;
          logger.info(`交易已提交: ${txData.hash}`);
        } else {
          throw new Error('无效的交易数据，未提供足够的信息');
        }
      }

      // 记录交易到队列
      const txRecord = {
        hash: txData.hash,
        from: txData.from,
        to: txData.to,
        data: txData.data,
        value: txData.value,
        contract: txData.contract ? true : false, // 只存储标记，不存储完整合约
        method: txData.method,
        args: txData.args,
        priority: txData.priority || TX_PRIORITY.NORMAL,
        status: TX_STATUS.PENDING,
        submittedAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        retryCount: 0,
        gasPrice: await this.provider.getGasPrice(),
        callback: callback ? true : false // 只存储标记，不存储回调函数
      };

      this.pendingTxs.set(txData.hash, {
        ...txRecord,
        callbackFn: callback // 内存中保存实际回调函数
      });

      // 同时保存到缓存中（不包含回调函数）
      txCache.set(txData.hash, txRecord);

      // 开始跟踪交易
      this._watchTransaction(txData.hash);

      return txData.hash;
    } catch (error) {
      logger.error(`添加交易失败: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * 获取交易状态
   * @param {string} txHash 交易哈希
   * @returns {Object} 交易状态信息
   */
  getTransactionStatus(txHash) {
    try {
      // 先从内存中获取
      if (this.pendingTxs.has(txHash)) {
        const tx = this.pendingTxs.get(txHash);
        return {
          hash: tx.hash,
          status: tx.status,
          submittedAt: tx.submittedAt,
          confirmedAt: tx.confirmedAt,
          retryCount: tx.retryCount,
          priority: tx.priority
        };
      }
      
      // 如果内存中没有，尝试从缓存中获取
      const cachedTx = txCache.get(txHash);
      if (cachedTx) {
        return {
          hash: cachedTx.hash,
          status: cachedTx.status,
          submittedAt: cachedTx.submittedAt,
          confirmedAt: cachedTx.confirmedAt,
          retryCount: cachedTx.retryCount,
          priority: cachedTx.priority
        };
      }
      
      return { hash: txHash, status: 'unknown' };
    } catch (error) {
      logger.error(`获取交易状态失败: ${error.message}`, { txHash });
      return { hash: txHash, status: 'error', error: error.message };
    }
  }

  /**
   * 重试指定的交易
   * @param {string} txHash 交易哈希
   * @returns {string} 新的交易哈希
   */
  async retryTransaction(txHash) {
    try {
      const tx = this.pendingTxs.get(txHash) || txCache.get(txHash);
      if (!tx) {
        throw new Error(`找不到交易: ${txHash}`);
      }
      
      if (tx.status !== TX_STATUS.FAILED && tx.status !== TX_STATUS.STUCK) {
        throw new Error(`只能重试失败或阻塞的交易`);
      }
      
      // 增加gas价格
      const newGasPrice = ethers.BigNumber.from(tx.gasPrice)
        .mul(100 + this.gasPriceIncreasePercentage)
        .div(100);
      
      // 准备新的交易数据
      const txData = {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        priority: tx.priority,
        gasPrice: newGasPrice.toString()
      };
      
      // 如果原交易是合约调用，重新构建合约实例
      if (tx.contract && tx.method && tx.args) {
        // 注意：此处需要实际重构合约实例，但简化处理
        // 在实际实现中，需要根据ABI和地址重新创建合约实例
        txData.method = tx.method;
        txData.args = tx.args;
      }
      
      // 记录旧交易为dropped
      this._updateTransactionStatus(txHash, TX_STATUS.DROPPED);
      
      // 提交新交易
      const newTxHash = await this.addTransaction(txData, 
        tx.callback ? this.pendingTxs.get(txHash).callbackFn : null);
      
      // 将旧交易与新交易关联
      const newTx = this.pendingTxs.get(newTxHash);
      newTx.previousTxHash = txHash;
      newTx.retryCount = (tx.retryCount || 0) + 1;
      this.pendingTxs.set(newTxHash, newTx);
      
      // 更新缓存
      txCache.set(newTxHash, {
        ...newTx,
        callbackFn: undefined // 不存储回调函数
      });
      
      logger.info(`重试交易: ${txHash} -> ${newTxHash}`);
      return newTxHash;
    } catch (error) {
      logger.error(`重试交易失败: ${error.message}`, { txHash });
      throw error;
    }
  }

  /**
   * 取消所有待处理的交易
   */
  cancelAllPendingTransactions() {
    try {
      for (const [txHash, tx] of this.pendingTxs.entries()) {
        if (tx.status === TX_STATUS.PENDING) {
          this._updateTransactionStatus(txHash, TX_STATUS.DROPPED);
          logger.info(`交易已取消: ${txHash}`);
        }
      }
    } catch (error) {
      logger.error(`取消交易失败: ${error.message}`);
    }
  }

  /**
   * 开始监控交易状态
   * @param {string} txHash 交易哈希
   * @private
   */
  _watchTransaction(txHash) {
    this.provider.once(txHash, (receipt) => {
      if (receipt.status === 1) {
        this._confirmTransaction(txHash, receipt);
      } else {
        this._handleFailedTransaction(txHash, receipt);
      }
    });
  }

  /**
   * 确认交易成功
   * @param {string} txHash 交易哈希
   * @param {Object} receipt 交易收据
   * @private
   */
  _confirmTransaction(txHash, receipt) {
    try {
      const tx = this.pendingTxs.get(txHash);
      if (!tx) return;
      
      tx.status = TX_STATUS.CONFIRMED;
      tx.confirmedAt = new Date().toISOString();
      tx.blockNumber = receipt.blockNumber;
      tx.gasUsed = receipt.gasUsed.toString();
      
      // 更新内存和缓存
      this.pendingTxs.set(txHash, tx);
      txCache.set(txHash, {
        ...tx,
        callbackFn: undefined
      });
      
      logger.info(`交易已确认: ${txHash}`, { blockNumber: receipt.blockNumber });
      
      // 执行回调
      if (tx.callbackFn) {
        try {
          tx.callbackFn(null, receipt);
        } catch (callbackError) {
          logger.error(`交易回调执行失败: ${callbackError.message}`);
        }
      }
      
      // 从待处理列表移除（但保留在缓存中供历史查询）
      this.pendingTxs.delete(txHash);
    } catch (error) {
      logger.error(`确认交易失败: ${error.message}`, { txHash });
    }
  }

  /**
   * 处理失败的交易
   * @param {string} txHash 交易哈希
   * @param {Object} receipt 交易收据
   * @private
   */
  _handleFailedTransaction(txHash, receipt) {
    try {
      const tx = this.pendingTxs.get(txHash);
      if (!tx) return;
      
      tx.status = TX_STATUS.FAILED;
      tx.error = 'Transaction reverted';
      tx.failedAt = new Date().toISOString();
      
      // 更新内存和缓存
      this.pendingTxs.set(txHash, tx);
      txCache.set(txHash, {
        ...tx,
        callbackFn: undefined
      });
      
      logger.error(`交易失败: ${txHash}`, { blockNumber: receipt.blockNumber });
      
      // 如果设置了重试并且未超过最大重试次数，自动重试
      if (tx.priority === TX_PRIORITY.HIGH || tx.priority === TX_PRIORITY.CRITICAL) {
        if ((tx.retryCount || 0) < this.maxRetries) {
          logger.info(`自动重试高优先级交易: ${txHash}`);
          this.retryTransaction(txHash).catch(error => {
            logger.error(`自动重试失败: ${error.message}`);
          });
          return;
        }
      }
      
      // 执行回调传递错误
      if (tx.callbackFn) {
        try {
          tx.callbackFn(new Error('Transaction failed'), receipt);
        } catch (callbackError) {
          logger.error(`交易错误回调执行失败: ${callbackError.message}`);
        }
      }
    } catch (error) {
      logger.error(`处理失败交易异常: ${error.message}`, { txHash });
    }
  }

  /**
   * 检查所有待处理交易的状态
   * @private
   */
  async _checkPendingTransactions() {
    const now = Date.now();
    const pendingTime = 10 * 60 * 1000; // 10分钟
    
    for (const [txHash, tx] of this.pendingTxs.entries()) {
      if (tx.status !== TX_STATUS.PENDING) continue;
      
      try {
        tx.lastChecked = new Date().toISOString();
        this.pendingTxs.set(txHash, tx);
        
        // 检查交易收据
        const receipt = await this.provider.getTransactionReceipt(txHash);
        
        if (receipt) {
          // 交易已经被挖出
          if (receipt.status === 1) {
            this._confirmTransaction(txHash, receipt);
          } else {
            this._handleFailedTransaction(txHash, receipt);
          }
        } else {
          // 检查交易是否因为各种原因卡住了
          const submittedTime = new Date(tx.submittedAt).getTime();
          if (now - submittedTime > pendingTime) {
            // 如果交易超过10分钟还未被确认，标记为stuck
            tx.status = TX_STATUS.STUCK;
            this.pendingTxs.set(txHash, tx);
            txCache.set(txHash, {
              ...tx,
              callbackFn: undefined
            });
            
            logger.warn(`交易已卡住: ${txHash}`, { pendingTime: Math.floor((now - submittedTime) / 1000) });
            
            // 高优先级交易自动重试
            if (tx.priority === TX_PRIORITY.HIGH || tx.priority === TX_PRIORITY.CRITICAL) {
              if ((tx.retryCount || 0) < this.maxRetries) {
                logger.info(`自动重试卡住的高优先级交易: ${txHash}`);
                this.retryTransaction(txHash).catch(error => {
                  logger.error(`自动重试失败: ${error.message}`);
                });
              }
            }
          }
        }
      } catch (error) {
        logger.error(`检查交易状态失败: ${error.message}`, { txHash });
      }
    }
  }

  /**
   * 根据优先级获取最佳gas价格
   * @param {string} priority 交易优先级
   * @returns {string} gas价格（wei）
   * @private
   */
  async _getOptimalGasPrice(priority) {
    try {
      const baseGasPrice = await this.provider.getGasPrice();
      let multiplier = 1.0;
      
      switch (priority) {
        case TX_PRIORITY.LOW:
          multiplier = 0.9; // 比基础价格低10%
          break;
        case TX_PRIORITY.HIGH:
          multiplier = 1.2; // 比基础价格高20%
          break;
        case TX_PRIORITY.CRITICAL:
          multiplier = 1.5; // 比基础价格高50%
          break;
        default: // NORMAL
          multiplier = 1.0;
      }
      
      // 计算新的gas价格并确保是整数
      const gasPrice = ethers.BigNumber.from(baseGasPrice)
        .mul(Math.floor(multiplier * 100))
        .div(100);
      
      return gasPrice.toString();
    } catch (error) {
      logger.error(`获取最佳gas价格失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从缓存恢复未处理的交易
   * @private
   */
  _recoverFromCache() {
    try {
      const transactions = txCache.keys();
      let recoveredCount = 0;
      
      for (const txHash of transactions) {
        const tx = txCache.get(txHash);
        
        // 只恢复pending和stuck状态的交易
        if (tx && (tx.status === TX_STATUS.PENDING || tx.status === TX_STATUS.STUCK)) {
          // 将交易添加到内存队列，不带回调函数
          this.pendingTxs.set(txHash, {
            ...tx,
            callbackFn: null
          });
          
          // 恢复监控
          this._watchTransaction(txHash);
          recoveredCount++;
        }
      }
      
      if (recoveredCount > 0) {
        logger.info(`从缓存恢复了 ${recoveredCount} 个未完成的交易`);
      }
    } catch (error) {
      logger.error(`从缓存恢复交易失败: ${error.message}`);
    }
  }

  /**
   * 更新交易状态
   * @param {string} txHash 交易哈希
   * @param {string} status 新状态
   * @private
   */
  _updateTransactionStatus(txHash, status) {
    try {
      const tx = this.pendingTxs.get(txHash);
      if (tx) {
        tx.status = status;
        tx.updatedAt = new Date().toISOString();
        
        this.pendingTxs.set(txHash, tx);
        txCache.set(txHash, {
          ...tx,
          callbackFn: undefined
        });
      }
    } catch (error) {
      logger.error(`更新交易状态失败: ${error.message}`, { txHash });
    }
  }

  /**
   * 清理资源
   * @private
   */
  _cleanup() {
    if (this.checker) {
      clearInterval(this.checker);
      this.checker = null;
    }
    logger.info('交易队列管理器已关闭');
  }
}

// 创建单例实例
const transactionQueue = new TransactionQueue();

module.exports = {
  transactionQueue,
  TX_STATUS,
  TX_PRIORITY
}; 