/**
 * 合约事件管理类
 * 负责合约事件的监听和查询
 */
const { ethers } = require('ethers');
const { ContractError, ErrorHandler } = require('../../utils/errors');
const Logger = require('../../utils/logger');
const Validation = require('../../utils/validation');

/**
 * 监听器状态枚举
 */
const ListenerStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  ERROR: 'error'
};

/**
 * 合约事件管理类
 */
class ContractEvent {
  /**
   * 活跃的监听器集合
   * @private
   */
  static _activeListeners = new Map();

  /**
   * 监听合约事件
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} options - 选项
   * @param {boolean} [options.includeTimestamp=true] - 是否在事件对象中包含时间戳
   * @param {boolean} [options.formatValues=true] - 是否格式化大数值
   * @param {boolean} [options.includeTransactionData=true] - 是否包含交易数据
   * @param {boolean} [options.includeSender=true] - 是否包含交易发起者地址
   * @returns {Promise<Object>} 监听器信息
   */
  static async listen(contract, event, callback, options = {}) {
    try {
      Validation.validate(
        contract && typeof contract.on === 'function',
        '无效的合约实例'
      );

      Validation.validate(
        typeof event === 'string' && event.length > 0,
        '无效的事件名称'
      );

      Validation.validate(
        typeof callback === 'function',
        '无效的回调函数'
      );

      // 生成唯一的监听器ID
      const listenerId = `${contract.address}_${event}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // 默认选项
      const mergedOptions = {
        includeTimestamp: true,
        formatValues: true,
        includeTransactionData: true,
        includeSender: true,
        ...options
      };
      
      // 创建包装回调函数以提供额外功能
      const wrappedCallback = async (...args) => {
        try {
          // 获取事件对象(最后一个参数)
          const eventObj = args[args.length - 1];
          
          // 准备事件数据
          const eventData = {
            name: event,
            address: contract.address,
            blockNumber: eventObj.blockNumber,
            transactionHash: eventObj.transactionHash,
            logIndex: eventObj.logIndex
          };
          
          // 添加时间戳
          if (mergedOptions.includeTimestamp) {
            eventData.timestamp = Date.now();
          }
          
          // 获取交易详情
          let tx = null;
          let txReceipt = null;
          
          if (mergedOptions.includeTransactionData || mergedOptions.includeSender) {
            try {
              tx = await eventObj.getTransaction();
              
              if (mergedOptions.includeTransactionData && tx) {
                eventData.transaction = {
                  from: tx.from,
                  to: tx.to,
                  nonce: tx.nonce,
                  gasLimit: tx.gasLimit.toString(),
                  gasPrice: tx.gasPrice ? tx.gasPrice.toString() : null,
                  maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toString() : null,
                  maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? tx.maxPriorityFeePerGas.toString() : null
                };
              }
              
              // 获取交易收据以获取更多信息
              if (mergedOptions.includeSender && tx) {
                // 如果交易对象有from字段，直接使用
                if (tx.from) {
                  eventData.sender = tx.from;
                } else {
                  // 否则尝试从收据获取
                  txReceipt = await eventObj.getTransactionReceipt();
                  if (txReceipt && txReceipt.from) {
                    eventData.sender = txReceipt.from;
                  }
                }
              }
            } catch (txError) {
              Logger.warn(`无法获取事件的交易详情: ${txError.message}`);
            }
          }
          
          // 处理事件参数
          const eventParams = {};
          const eventFragment = contract.interface.getEvent(event);
          
          if (eventFragment && eventFragment.inputs) {
            // 获取已命名的参数
            const parsedLog = contract.interface.parseLog(eventObj);
            if (parsedLog && parsedLog.args) {
              for (const key in parsedLog.args) {
                if (!isNaN(parseInt(key))) continue; // 跳过数字索引
                
                const value = parsedLog.args[key];
                // 格式化大数值
                if (mergedOptions.formatValues && ethers.BigNumber.isBigNumber(value)) {
                  eventParams[key] = value.toString();
                } else {
                  eventParams[key] = value;
                }
              }
            }
          }
          
          // 添加参数到事件数据
          eventData.params = eventParams;
          
          // 更新监听器状态
          const listenerInfo = this._activeListeners.get(listenerId);
          if (listenerInfo) {
            listenerInfo.lastEvent = {
              timestamp: Date.now(),
              data: eventData
            };
            listenerInfo.eventCount++;
          }
          
          // 调用原始回调
          await callback(eventData, ...args);
          
          Logger.debug(`合约事件触发: ${event}`, {
            contract: contract.address,
            listenerId,
            sender: eventData.sender,
            eventData
          });
        } catch (error) {
          // 更新监听器状态为错误
          const listenerInfo = this._activeListeners.get(listenerId);
          if (listenerInfo) {
            listenerInfo.status = ListenerStatus.ERROR;
            listenerInfo.lastError = {
              timestamp: Date.now(),
              message: error.message
            };
          }
          
          Logger.error(`处理合约事件回调失败: ${error.message}`, {
            error,
            event,
            contract: contract.address,
            listenerId
          });
          
          // 不将错误抛给调用者，避免中断事件监听
        }
      };
      
      // 创建监听器
      contract.on(event, wrappedCallback);
      
      // 记录监听器信息
      const listenerInfo = {
        contract,
        event,
        originalCallback: callback,
        wrappedCallback,
        listenerId,
        status: ListenerStatus.ACTIVE,
        startTime: Date.now(),
        eventCount: 0,
        options: mergedOptions
      };
      
      // 存储监听器信息
      this._activeListeners.set(listenerId, listenerInfo);
      
      Logger.info(`开始监听合约事件: ${event}`, {
        contract: contract.address,
        event,
        listenerId
      });
      
      // 返回监听器信息用于之后管理
      return {
        listenerId,
        event,
        contract: contract.address,
        status: ListenerStatus.ACTIVE
      };
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'listen' }
      });
      Logger.error(`监听合约事件失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 查询合约事件
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} event - 事件名称
   * @param {Object} options - 查询选项
   * @param {number|string} [options.fromBlock='0'] - 起始区块
   * @param {number|string} [options.toBlock='latest'] - 结束区块
   * @param {Object} [options.filter={}] - 事件过滤条件
   * @param {boolean} [options.formatValues=true] - 是否格式化大数值
   * @param {boolean} [options.includeSender=false] - 是否包含交易发起者地址
   * @returns {Promise<Array>} 事件数组
   */
  static async query(contract, event, options = {}) {
    try {
      Validation.validate(
        contract && typeof contract.queryFilter === 'function',
        '无效的合约实例'
      );

      Validation.validate(
        typeof event === 'string' && event.length > 0,
        '无效的事件名称'
      );

      // 默认选项
      const mergedOptions = {
        fromBlock: 0,
        toBlock: 'latest',
        filter: {},
        formatValues: true,
        includeSender: false,
        ...options
      };

      // 构建过滤器
      let eventFilter;
      if (Object.keys(mergedOptions.filter).length > 0) {
        // 如果提供了过滤条件，使用contract.filters来创建过滤器
        eventFilter = contract.filters[event](...Object.values(mergedOptions.filter));
      } else {
        // 否则直接使用事件名称
        eventFilter = event;
      }

      // 查询事件
      const logs = await contract.queryFilter(eventFilter, mergedOptions.fromBlock, mergedOptions.toBlock);
      
      // 解析事件日志
      const parsedEvents = [];
      
      for (const log of logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (!parsedLog) continue;
          
          // 基本事件信息
          const eventData = {
            name: parsedLog.name,
            signature: parsedLog.signature,
            topic: log.topics[0],
            address: log.address,
            blockNumber: log.blockNumber,
            blockHash: log.blockHash,
            transactionHash: log.transactionHash,
            transactionIndex: log.transactionIndex,
            logIndex: log.logIndex
          };
          
          // 处理事件参数
          const params = {};
          for (const key in parsedLog.args) {
            if (!isNaN(parseInt(key))) continue; // 跳过数字索引
            
            const value = parsedLog.args[key];
            // 格式化大数值
            if (mergedOptions.formatValues && ethers.BigNumber.isBigNumber(value)) {
              params[key] = value.toString();
            } else {
              params[key] = value;
            }
          }
          
          // 添加参数到事件数据
          eventData.params = params;
          
          // 如果需要获取发送者信息
          if (mergedOptions.includeSender) {
            try {
              // 获取交易信息
              const tx = await contract.provider.getTransaction(log.transactionHash);
              if (tx && tx.from) {
                eventData.sender = tx.from;
              }
            } catch (txError) {
              Logger.warn(`无法获取事件的交易发起者: ${txError.message}`, { 
                transactionHash: log.transactionHash 
              });
            }
          }
          
          parsedEvents.push(eventData);
        } catch (error) {
          Logger.warn(`解析事件日志失败: ${error.message}`, { error });
        }
      }
      
      Logger.debug(`查询合约事件成功: ${event}`, {
        contract: contract.address,
        event,
        count: parsedEvents.length,
        fromBlock: mergedOptions.fromBlock,
        toBlock: mergedOptions.toBlock
      });
      
      return parsedEvents;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { 
          method: 'query',
          event,
          options
        }
      });
      Logger.error(`查询合约事件失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 移除事件监听器
   * @param {string} listenerId - 监听器ID
   * @returns {Promise<boolean>} 是否成功移除
   */
  static async removeListener(listenerId) {
    try {
      if (!listenerId || !this._activeListeners.has(listenerId)) {
        throw new ContractError(`未找到监听器: ${listenerId}`);
      }
      
      const listenerInfo = this._activeListeners.get(listenerId);
      
      // 移除监听器
      listenerInfo.contract.off(listenerInfo.event, listenerInfo.wrappedCallback);
      
      // 从集合中删除
      this._activeListeners.delete(listenerId);
      
      Logger.info(`已停止监听合约事件: ${listenerInfo.event}`, {
        contract: listenerInfo.contract.address,
        listenerId: listenerId,
        eventCount: listenerInfo.eventCount
      });
      
      return true;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'removeListener' }
      });
      Logger.error(`移除事件监听器失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 暂停事件监听器
   * @param {string} listenerId - 监听器ID
   * @returns {Promise<boolean>} 是否成功暂停
   */
  static async pauseListener(listenerId) {
    try {
      if (!listenerId || !this._activeListeners.has(listenerId)) {
        throw new ContractError(`未找到监听器: ${listenerId}`);
      }
      
      const listenerInfo = this._activeListeners.get(listenerId);
      
      // 如果已经暂停则直接返回
      if (listenerInfo.status === ListenerStatus.PAUSED) {
        return true;
      }
      
      // 移除监听但保留在集合中
      listenerInfo.contract.off(listenerInfo.event, listenerInfo.wrappedCallback);
      listenerInfo.status = ListenerStatus.PAUSED;
      listenerInfo.pauseTime = Date.now();
      
      Logger.info(`已暂停监听合约事件: ${listenerInfo.event}`, {
        contract: listenerInfo.contract.address,
        listenerId: listenerId
      });
      
      return true;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'pauseListener' }
      });
      Logger.error(`暂停事件监听器失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 恢复事件监听器
   * @param {string} listenerId - 监听器ID
   * @returns {Promise<boolean>} 是否成功恢复
   */
  static async resumeListener(listenerId) {
    try {
      if (!listenerId || !this._activeListeners.has(listenerId)) {
        throw new ContractError(`未找到监听器: ${listenerId}`);
      }
      
      const listenerInfo = this._activeListeners.get(listenerId);
      
      // 如果已经活跃则直接返回
      if (listenerInfo.status === ListenerStatus.ACTIVE) {
        return true;
      }
      
      // 重新添加监听
      listenerInfo.contract.on(listenerInfo.event, listenerInfo.wrappedCallback);
      listenerInfo.status = ListenerStatus.ACTIVE;
      listenerInfo.resumeTime = Date.now();
      
      Logger.info(`已恢复监听合约事件: ${listenerInfo.event}`, {
        contract: listenerInfo.contract.address,
        listenerId: listenerId
      });
      
      return true;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'resumeListener' }
      });
      Logger.error(`恢复事件监听器失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取当前所有活跃的监听器
   * @returns {Array} 监听器信息数组
   */
  static getActiveListeners() {
    const listeners = [];
    for (const [listenerId, info] of this._activeListeners.entries()) {
      listeners.push({
        listenerId,
        event: info.event,
        contract: info.contract.address,
        status: info.status,
        startTime: info.startTime,
        eventCount: info.eventCount,
        lastEvent: info.lastEvent,
        lastError: info.lastError
      });
    }
    return listeners;
  }

  /**
   * 解析交易收据中的事件
   * @param {ethers.TransactionReceipt} receipt - 交易收据
   * @param {ethers.Contract} contract - 合约实例
   * @param {Object} options - 选项
   * @param {boolean} [options.formatValues=true] - 是否格式化大数值
   * @returns {Array} 解析后的事件数组
   */
  static parseReceiptEvents(receipt, contract, options = {}) {
    try {
      const mergedOptions = {
        formatValues: true,
        ...options
      };

      if (!receipt.logs || !contract.interface) {
        return [];
      }

      const events = [];
      
      // 遍历日志并解析事件
      for (const log of receipt.logs) {
        try {
          // 检查日志地址是否与合约地址匹配
          if (log.address.toLowerCase() !== contract.address.toLowerCase()) {
            continue;
          }
          
          // 尝试解析事件
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog) {
            // 基本事件信息
            const eventData = {
              name: parsedLog.name,
              signature: parsedLog.signature,
              topic: log.topics[0],
              address: log.address,
              blockNumber: log.blockNumber,
              blockHash: log.blockHash,
              transactionHash: log.transactionHash,
              transactionIndex: log.transactionIndex,
              logIndex: log.logIndex,
              // 添加发送者信息
              sender: receipt.from
            };
            
            // 转换事件参数为可读格式
            const params = {};
            for (const key in parsedLog.args) {
              if (!isNaN(parseInt(key))) continue; // 跳过数字索引
              const value = parsedLog.args[key];
              params[key] = mergedOptions.formatValues && ethers.BigNumber.isBigNumber(value) 
                ? value.toString() 
                : value;
            }
            
            // 添加参数到事件数据
            eventData.params = params;
            
            events.push(eventData);
          }
        } catch (err) {
          // 忽略无法解析的日志
          Logger.warn(`解析日志失败: ${err.message}`, { logIndex: log.logIndex });
          continue;
        }
      }
      
      return events;
    } catch (error) {
      Logger.warn(`解析交易事件失败: ${error.message}`);
      return [];
    }
  }
}

// 导出事件管理类和状态枚举
module.exports = {
  ListenerStatus,
  ContractEvent
}; 