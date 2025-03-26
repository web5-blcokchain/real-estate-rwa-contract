const ethers = require('ethers');
const logger = require('./logger');
const config = require('../config');
const { createEventListener, removeEventListener, clearAllEventListeners } = require('../../../shared/utils/eventListener');

class EventListener {
  constructor(provider, contracts) {
    this.provider = provider;
    this.contracts = contracts;
    this.listeners = [];
    this.isListening = false;
    this.connectionCheckInterval = null;
  }

  // 启动所有合约的事件监听
  startListening() {
    if (this.isListening) {
      logger.warn('Event listener is already running');
      return false;
    }

    try {
      logger.info('Starting real-time event listeners for all contracts');
      
      // 检查是否是WebSocket提供者
      if (!(this.provider instanceof ethers.providers.WebSocketProvider) && 
          !(this.provider._websocket)) {
        logger.warn('Provider is not a WebSocket provider. Real-time events may not work properly.');
        logger.warn('Consider using a WebSocket URL (starting with "wss://") for better real-time event support.');
      }
      
      // 遍历所有合约
      for (const [name, contract] of Object.entries(this.contracts)) {
        logger.info(`Setting up listeners for contract: ${name}`);
        
        // 获取合约的所有事件定义
        const contractABI = contract.interface.fragments.filter(f => f.type === 'event');
        
        if (contractABI.length === 0) {
          logger.warn(`No event definitions found for contract: ${name}. Skipping.`);
          continue;
        }
        
        // 为每个事件类型创建监听器
        for (const eventFragment of contractABI) {
          const eventName = eventFragment.name;
          
          try {
            // 创建事件处理回调
            const eventCallback = (eventData, ...args) => {
              this.handleEvent(name, contract.address, args[args.length - 1]);
            };
            
            // 使用共享事件监听器创建监听
            const listenerId = createEventListener(contract, eventName, eventCallback);
            
            // 保存监听器引用以便later移除
            this.listeners.push(listenerId);
            
            logger.info(`Listener established for ${name}.${eventName}`);
          } catch (error) {
            logger.error(`Failed to create listener for ${name}.${eventName}: ${error.message}`);
          }
        }
      }
      
      this.isListening = true;
      logger.info(`Successfully started ${this.listeners.length} event listeners`);
      
      // 设置连接检查计时器
      this.setupConnectionCheck();
      
      return true;
    } catch (error) {
      logger.error(`Failed to start event listeners: ${error.message}`);
      this.stopListening(); // 清理任何可能已创建的监听器
      return false;
    }
  }

  // 设置连接检查
  setupConnectionCheck() {
    // 清除之前的检查
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    // 每30秒检查一次连接
    this.connectionCheckInterval = setInterval(() => {
      this.checkConnection();
    }, config.connection.connectionCheckInterval || 30000);
  }
  
  // 检查WebSocket连接状态
  async checkConnection() {
    try {
      // 尝试获取块号来验证连接
      await this.provider.getBlockNumber();
    } catch (error) {
      logger.error(`WebSocket connection error: ${error.message}`);
      logger.info('Attempting to reconnect event listeners...');
      
      // 通知父服务需要重连
      this.emit('connectionError', error);
    }
  }

  // 触发事件
  emit(eventName, data) {
    if (eventName === 'connectionError' && this.onConnectionError) {
      this.onConnectionError(data);
    }
  }
  
  // 设置连接错误处理函数
  setConnectionErrorHandler(handler) {
    this.onConnectionError = handler;
  }

  // 停止所有事件监听
  stopListening() {
    if (!this.isListening) {
      logger.warn('No active listeners to stop');
      return;
    }

    logger.info(`Stopping ${this.listeners.length} event listeners`);
    
    // 停止连接检查
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    // 移除所有监听器
    for (const listenerId of this.listeners) {
      try {
        removeEventListener(listenerId);
        logger.debug(`Removed listener: ${listenerId}`);
      } catch (error) {
        logger.error(`Error removing listener ${listenerId}: ${error.message}`);
      }
    }
    
    // 清空监听器列表
    this.listeners = [];
    this.isListening = false;
    logger.info('All event listeners stopped');
  }

  // 处理接收到的事件
  handleEvent(contractName, contractAddress, event) {
    try {
      // 添加时间戳
      const timestamp = new Date().toISOString();
      
      // 格式化事件数据
      const formattedEvent = {
        timestamp: timestamp,
        contractName: contractName,
        contractAddress: contractAddress,
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        transactionHash: event.transactionHash,
        transactionIndex: event.transactionIndex,
        logIndex: event.logIndex,
        eventName: event.event,
        args: {}
      };
      
      // 添加事件参数，将BigNumber转换为字符串
      if (event.args) {
        // 处理参数数组
        for (let i = 0; i < event.args.length; i++) {
          const arg = event.args[i];
          if (ethers.BigNumber.isBigNumber(arg)) {
            formattedEvent.args[i] = arg.toString();
          } else {
            formattedEvent.args[i] = arg;
          }
        }
        
        // 处理命名参数
        for (const key in event.args) {
          if (isNaN(parseInt(key))) { // 跳过数字索引
            const arg = event.args[key];
            if (ethers.BigNumber.isBigNumber(arg)) {
              formattedEvent.args[key] = arg.toString();
            } else {
              formattedEvent.args[key] = arg;
            }
          }
        }
      }
      
      // 打印事件详情到控制台
      this.printEvent(formattedEvent);
      
      // 记录到日志
      logger.info(`Real-time event detected: ${formattedEvent.eventName}`, {
        contract: contractName,
        address: contractAddress,
        tx: formattedEvent.transactionHash,
        block: formattedEvent.blockNumber
      });
    } catch (error) {
      logger.error(`Error handling event: ${error.message}`);
    }
  }

  // 打印事件详情到控制台
  printEvent(event) {
    if (!config.logging.consoleDetailedEvents) {
      return;
    }
    
    console.log(`\n[${event.timestamp}] 🔴 REAL-TIME EVENT:`);
    console.log(`- Contract: ${event.contractName}(${event.contractAddress})`);
    console.log(`- Event: ${event.eventName}`);
    console.log(`- Block: ${event.blockNumber} | Tx: ${event.transactionHash}`);
    console.log(`- Args:`, JSON.stringify(event.args, null, 2));
    console.log('-------------------------------------------');
  }
}

module.exports = EventListener; 