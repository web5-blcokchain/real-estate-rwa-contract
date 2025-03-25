const ethers = require('ethers');
const logger = require('./logger');
const config = require('../config');

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
        
        // 为每个事件定义设置特定监听器，这比通配符'*'更可靠
        const contractABI = contract.interface.fragments.filter(f => f.type === 'event');
        
        if (contractABI.length === 0) {
          logger.warn(`No event definitions found for contract: ${name}. Skipping.`);
          continue;
        }
        
        // 为每个事件类型创建监听器
        for (const eventFragment of contractABI) {
          const eventName = eventFragment.name;
          
          // 创建事件特定的监听器
          const listener = (...args) => {
            // 最后一个参数是事件对象
            const event = args[args.length - 1];
            this.handleEvent(name, contract.address, event);
          };
          
          // 添加监听器
          contract.on(eventName, listener);
          
          // 保存监听器引用以便later移除
          this.listeners.push({
            contractName: name,
            contract: contract,
            eventName: eventName,
            listener: listener
          });
          
          logger.info(`Listener established for ${name}.${eventName}`);
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
    }, 30000);
  }
  
  // 检查WebSocket连接状态
  async checkConnection() {
    try {
      // 尝试获取块号来验证连接
      await this.provider.getBlockNumber();
    } catch (error) {
      logger.error(`WebSocket connection error: ${error.message}`);
      logger.info('Attempting to reconnect event listeners...');
      
      // 重新启动监听器
      this.stopListening();
      setTimeout(() => {
        this.startListening();
      }, 5000);
    }
  }

  // 停止所有事件监听
  stopListening() {
    if (!this.isListening) {
      logger.warn('No active listeners to stop');
      return;
    }

    logger.info('Stopping all event listeners');
    
    // 停止连接检查
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    // 遍历并移除所有监听器
    for (const item of this.listeners) {
      try {
        // 移除特定事件的监听器
        if (item.eventName) {
          item.contract.removeListener(item.eventName, item.listener);
          logger.info(`Removed listener for ${item.contractName}.${item.eventName}`);
        } else {
          // 移除所有监听器 (后备)
          item.contract.removeAllListeners();
          logger.info(`Removed all listeners for contract: ${item.contractName}`);
        }
      } catch (error) {
        logger.error(`Error removing listeners for ${item.contractName}: ${error.message}`);
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
        contract: `${formattedEvent.contractName}(${formattedEvent.contractAddress})`,
        block: formattedEvent.blockNumber,
        tx: formattedEvent.transactionHash,
        args: formattedEvent.args
      });
    } catch (error) {
      logger.error(`Error handling event: ${error.message}`, { event });
    }
  }

  // 打印事件到控制台
  printEvent(event) {
    const contractInfo = `${event.contractName}(${event.contractAddress})`;
    const eventInfo = `${event.eventName}`;
    const blockInfo = `Block: ${event.blockNumber}`;
    const txInfo = `Tx: ${event.transactionHash}`;
    
    console.log(`\n[${event.timestamp}] 🔔 REAL-TIME EVENT DETECTED:`);
    console.log(`- Contract: ${contractInfo}`);
    console.log(`- Event: ${eventInfo}`);
    console.log(`- ${blockInfo} | ${txInfo}`);
    console.log(`- Args: ${JSON.stringify(event.args, null, 2)}`);
    console.log('===========================================');
  }
}

module.exports = EventListener; 