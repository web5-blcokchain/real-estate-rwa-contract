/**
 * 事件监听工具模块
 * 提供智能合约事件监听和处理功能
 */
const { ethers } = require('ethers');
const { logger } = require('./logger');
const { getProvider } = require('./web3Provider');

// 活跃的事件监听器
const activeListeners = new Map();

/**
 * 创建事件监听器
 * @param {ethers.Contract} contract 合约实例
 * @param {string} eventName 事件名称
 * @param {Function} callback 回调函数
 * @param {Object} options 监听选项
 * @returns {string} 监听器ID
 */
function createEventListener(contract, eventName, callback, options = {}) {
  try {
    // 检查contract是否为合约实例
    if (!contract || !contract.address || !contract.interface) {
      throw new Error('无效的合约实例');
    }
    
    // 创建事件过滤器
    const filter = contract.filters[eventName](...(options.filterArgs || []));
    
    // 处理事件的函数
    const eventHandler = (...args) => {
      try {
        // 最后一个参数是事件对象
        const event = args[args.length - 1];
        
        // 构造事件数据
        const eventData = {
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          logIndex: event.logIndex,
          contract: contract.address,
          event: eventName,
          args: {}
        };
        
        // 解析参数名称和值
        const params = [];
        for (let i = 0; i < args.length - 1; i++) {
          // 如果事件碎片中有参数名，则使用参数名
          const paramName = event.event && event.args && event.args.length > i
            ? (event.args[i]?.name || `param${i}`)
            : `param${i}`;
          
          eventData.args[paramName] = args[i];
          params.push(`${paramName}: ${args[i]}`);
        }
        
        logger.info(`捕获到事件 ${eventName} (${event.transactionHash}): ${params.join(', ')}`);
        
        // 调用回调函数
        callback(eventData, ...args);
      } catch (error) {
        logger.error(`处理事件 ${eventName} 失败: ${error.message}`);
      }
    };
    
    // 注册事件监听器
    contract.on(filter, eventHandler);
    
    // 生成唯一ID
    const listenerId = `${contract.address}-${eventName}-${Date.now()}`;
    
    // 存储监听器信息
    activeListeners.set(listenerId, {
      contract,
      eventName,
      handler: eventHandler,
      filter,
      timestamp: Date.now()
    });
    
    logger.info(`已创建事件监听器 ${listenerId} 用于 ${contract.address} 的 ${eventName} 事件`);
    return listenerId;
  } catch (error) {
    logger.error(`创建事件监听器失败: ${error.message}`);
    throw error;
  }
}

/**
 * 移除事件监听器
 * @param {string} listenerId 监听器ID
 * @returns {boolean} 是否成功移除
 */
function removeEventListener(listenerId) {
  try {
    if (!activeListeners.has(listenerId)) {
      logger.warn(`未找到监听器 ${listenerId}`);
      return false;
    }
    
    const { contract, eventName, handler } = activeListeners.get(listenerId);
    
    // 移除监听器
    contract.off(eventName, handler);
    
    // 从活跃监听器中移除
    activeListeners.delete(listenerId);
    
    logger.info(`已移除事件监听器 ${listenerId}`);
    return true;
  } catch (error) {
    logger.error(`移除事件监听器失败: ${error.message}`);
    return false;
  }
}

/**
 * 检索历史事件
 * @param {ethers.Contract} contract 合约实例
 * @param {string} eventName 事件名称
 * @param {Object} options 查询选项
 * @returns {Promise<Array>} 事件列表
 */
async function queryEvents(contract, eventName, options = {}) {
  try {
    const provider = contract.provider || getProvider();
    
    // 创建过滤器
    const filter = contract.filters[eventName](...(options.filterArgs || []));
    
    // 设置查询范围
    const fromBlock = options.fromBlock || 0;
    const toBlock = options.toBlock || 'latest';
    
    logger.info(`查询 ${contract.address} 的 ${eventName} 事件，从区块 ${fromBlock} 到 ${toBlock}`);
    
    // 查询事件日志
    const logs = await provider.getLogs({
      ...filter,
      fromBlock,
      toBlock
    });
    
    // 解析事件日志
    const events = logs.map(log => {
      try {
        // 解析日志
        const parsedLog = contract.interface.parseLog(log);
        
        // 构造事件数据
        const eventData = {
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          contract: contract.address,
          event: eventName,
          args: {}
        };
        
        // 解析参数
        if (parsedLog && parsedLog.args) {
          // 转换args为对象格式
          for (let i = 0; i < parsedLog.args.length; i++) {
            // 确保有参数名
            const paramName = parsedLog.args[i]?.name || `param${i}`;
            eventData.args[paramName] = parsedLog.args[i];
          }
        }
        
        return eventData;
      } catch (parseError) {
        logger.warn(`解析事件日志失败: ${parseError.message}`);
        return null;
      }
    }).filter(event => event !== null);
    
    logger.info(`找到 ${events.length} 个 ${eventName} 事件`);
    return events;
  } catch (error) {
    logger.error(`查询事件失败: ${error.message}`);
    throw error;
  }
}

/**
 * 等待特定事件
 * @param {ethers.Contract} contract 合约实例
 * @param {string} eventName 事件名称
 * @param {Object} options 等待选项
 * @returns {Promise<Object>} 事件数据
 */
function waitForEvent(contract, eventName, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      // 超时处理
      const timeout = options.timeout || 60000; // 默认60秒
      let timeoutId = null;
      
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          // 移除监听器
          if (listenerId) {
            removeEventListener(listenerId);
          }
          reject(new Error(`等待事件 ${eventName} 超时`));
        }, timeout);
      }
      
      // 过滤条件检查函数
      const filterFn = options.filter || (() => true);
      
      // 创建事件回调
      const callback = (eventData, ...args) => {
        // 检查是否符合过滤条件
        if (filterFn(eventData, ...args)) {
          // 清除超时
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          // 如果不需要保持监听，则移除监听器
          if (!options.keepListening) {
            removeEventListener(listenerId);
          }
          
          resolve(eventData);
        }
      };
      
      // 创建监听器
      const listenerId = createEventListener(contract, eventName, callback, options);
      
      logger.info(`等待 ${contract.address} 的 ${eventName} 事件...`);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 清除所有事件监听器
 */
function clearAllEventListeners() {
  try {
    // 遍历所有活跃的监听器
    for (const [listenerId, { contract, eventName, handler }] of activeListeners.entries()) {
      // 移除监听器
      contract.off(eventName, handler);
      logger.info(`已移除事件监听器 ${listenerId}`);
    }
    
    // 清空活跃监听器集合
    activeListeners.clear();
    
    logger.info('已清除所有事件监听器');
    return true;
  } catch (error) {
    logger.error(`清除所有事件监听器失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取活跃的监听器列表
 * @returns {Array} 监听器列表
 */
function getActiveListeners() {
  const listeners = [];
  
  for (const [id, { contract, eventName, timestamp }] of activeListeners.entries()) {
    listeners.push({
      id,
      contract: contract.address,
      eventName,
      createdAt: new Date(timestamp).toISOString(),
      age: Math.floor((Date.now() - timestamp) / 1000) // 秒
    });
  }
  
  return listeners;
}

module.exports = {
  createEventListener,
  removeEventListener,
  queryEvents,
  waitForEvent,
  clearAllEventListeners,
  getActiveListeners
}; 