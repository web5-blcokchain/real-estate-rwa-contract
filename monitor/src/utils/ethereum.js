const ethers = require('ethers');
const config = require('../config');
const logger = require('./logger');
const EventListener = require('./eventListener');
const contractABIs = require('../contracts'); // 导入合约ABI定义

class EthereumService {
  constructor() {
    this.httpProvider = null;
    this.wsProvider = null;
    this.activeProvider = null;
    this.contracts = {};
    this.lastProcessedBlock = 0;
    this.eventListener = null;
    this.reconnectAttempts = 0;
  }

  // 初始化以太坊提供者和合约实例
  async initialize() {
    try {
      // 创建HTTP提供者
      this.httpProvider = new ethers.providers.JsonRpcProvider(config.ethRpcUrl);
      
      // 检查HTTP连接
      const network = await this.httpProvider.getNetwork();
      logger.info(`Connected to Ethereum network via HTTP: ${network.name} (chainId: ${network.chainId})`);
      
      // 默认使用HTTP提供者
      this.activeProvider = this.httpProvider;
      
      // 如果配置了WebSocket URL且不同于HTTP URL，则创建WebSocket提供者
      if (config.ethWsUrl && config.ethWsUrl.startsWith('ws')) {
        try {
          this.wsProvider = new ethers.providers.WebSocketProvider(config.ethWsUrl);
          logger.info('WebSocket provider initialized. Will use for real-time events.');
          
          // 为WebSocket提供者添加错误处理
          if (this.wsProvider._websocket) {
            this.wsProvider._websocket.on('error', (error) => {
              logger.error(`WebSocket Error: ${error.message}`);
            });
            
            this.wsProvider._websocket.on('close', (code) => {
              logger.error(`WebSocket Connection Closed. Code: ${code}`);
              this.reconnectWebSocket();
            });
          }
          
          // 确认WebSocket连接
          await this.wsProvider.getNetwork();
          logger.info(`Connected to Ethereum network via WebSocket: ${network.name}`);
          
          // 对于实时事件，使用WebSocket提供者
          if (config.monitor.enableRealTimeEvents) {
            this.activeProvider = this.wsProvider;
          }
        } catch (wsError) {
          logger.error(`Failed to initialize WebSocket provider: ${wsError.message}`);
          logger.info('Falling back to HTTP provider for all operations');
        }
      } else {
        logger.warn('No WebSocket URL provided. Using HTTP for all operations.');
        logger.warn('Real-time event monitoring may be limited with HTTP provider.');
      }
      
      // 获取当前块高
      const currentBlock = await this.activeProvider.getBlockNumber();
      logger.info(`Current block height: ${currentBlock}`);
      
      // 计算起始块
      this.lastProcessedBlock = Math.max(0, currentBlock - config.monitor.blocksToFetch);
      logger.info(`Setting initial block to: ${this.lastProcessedBlock}`);
      
      // 初始化合约实例
      await this.initializeContracts();
      
      // 初始化事件监听器
      this.eventListener = new EventListener(this.activeProvider, this.contracts);
      
      return true;
    } catch (error) {
      logger.error(`Failed to initialize Ethereum service: ${error.message}`);
      return false;
    }
  }

  // 尝试重新连接WebSocket
  async reconnectWebSocket() {
    if (this.reconnectAttempts >= config.connection.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts (${config.connection.maxReconnectAttempts}) reached. Falling back to HTTP provider.`);
      
      // 停止事件监听
      this.stopEventListener();
      
      // 将所有操作切换到HTTP提供者
      this.activeProvider = this.httpProvider;
      
      // 重新初始化合约
      await this.initializeContracts();
      
      // 重新开始事件监听
      this.eventListener = new EventListener(this.activeProvider, this.contracts);
      this.startEventListener();
      
      return;
    }
    
    this.reconnectAttempts++;
    
    logger.info(`Attempting to reconnect WebSocket (attempt ${this.reconnectAttempts}/${config.connection.maxReconnectAttempts})...`);
    
    setTimeout(async () => {
      try {
        // 停止当前的事件监听
        this.stopEventListener();
        
        // 创建新的WebSocket提供者
        this.wsProvider = new ethers.providers.WebSocketProvider(config.ethWsUrl);
        
        // 添加错误处理
        if (this.wsProvider._websocket) {
          this.wsProvider._websocket.on('error', (error) => {
            logger.error(`WebSocket Error: ${error.message}`);
          });
          
          this.wsProvider._websocket.on('close', (code) => {
            logger.error(`WebSocket Connection Closed. Code: ${code}`);
            this.reconnectWebSocket();
          });
        }
        
        // 检查连接
        await this.wsProvider.getNetwork();
        
        // 重置尝试计数
        this.reconnectAttempts = 0;
        
        // 更新活动提供者
        this.activeProvider = this.wsProvider;
        
        // 重新初始化合约
        await this.initializeContracts();
        
        // 重新创建事件监听器
        this.eventListener = new EventListener(this.activeProvider, this.contracts);
        this.startEventListener();
        
        logger.info('WebSocket reconnection successful');
      } catch (error) {
        logger.error(`WebSocket reconnection failed: ${error.message}`);
        this.reconnectWebSocket();
      }
    }, config.connection.reconnectDelay);
  }

  // 初始化合约实例
  async initializeContracts() {
    // 清除现有合约
    this.contracts = {};
    
    // 遍历配置中的合约地址
    for (const [name, address] of Object.entries(config.contracts)) {
      if (address && address !== '0x...') {
        // 如果有ABI定义，则创建合约实例
        if (contractABIs[name]) {
          this.contracts[name] = new ethers.Contract(address, contractABIs[name], this.activeProvider);
          logger.info(`Initialized contract: ${name} at ${address}`);
        } else {
          logger.warn(`No ABI found for contract: ${name}`);
        }
      }
    }
    
    logger.info(`Initialized ${Object.keys(this.contracts).length} contracts`);
  }

  // 获取历史事件
  async getEvents() {
    if (!this.activeProvider) {
      throw new Error('Ethereum service not initialized');
    }
    
    // 如果历史事件被禁用，则跳过
    if (!config.monitor.enableHistoricalEvents) {
      return [];
    }
    
    try {
      // 获取当前块高
      const currentBlock = await this.activeProvider.getBlockNumber();
      
      // 如果没有新块，则跳过
      if (currentBlock <= this.lastProcessedBlock) {
        logger.debug(`No new blocks to process. Current: ${currentBlock}, Last processed: ${this.lastProcessedBlock}`);
        return [];
      }
      
      logger.info(`Fetching historical events from block ${this.lastProcessedBlock + 1} to ${currentBlock}`);
      
      // 存储所有事件
      const allEvents = [];
      
      // 从每个合约获取事件
      for (const [name, contract] of Object.entries(this.contracts)) {
        try {
          // 获取该合约的所有事件
          const events = await contract.queryFilter('*', this.lastProcessedBlock + 1, currentBlock);
          
          if (events.length > 0) {
            logger.info(`Found ${events.length} events for contract ${name}`);
            
            // 处理每个事件
            for (const event of events) {
              try {
                // 添加时间戳
                const timestamp = new Date().toISOString();
                
                // 格式化事件数据
                const formattedEvent = {
                  timestamp: timestamp,
                  contractName: name,
                  contractAddress: contract.address,
                  blockNumber: event.blockNumber,
                  blockHash: event.blockHash,
                  transactionHash: event.transactionHash,
                  transactionIndex: event.transactionIndex,
                  logIndex: event.logIndex,
                  eventName: event.event,
                  args: {}
                };
                
                // 添加事件参数
                if (event.args) {
                  // 将BigNumber转换为字符串
                  for (let i = 0; i < event.args.length; i++) {
                    const arg = event.args[i];
                    if (ethers.BigNumber.isBigNumber(arg)) {
                      formattedEvent.args[i] = arg.toString();
                    } else {
                      formattedEvent.args[i] = arg;
                    }
                  }
                  
                  // 如果事件有命名参数，也添加到args对象中
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
                
                // 添加到事件列表
                allEvents.push(formattedEvent);
              } catch (error) {
                logger.error(`Error processing event: ${error.message}`, { event });
              }
            }
          }
        } catch (error) {
          logger.error(`Error fetching events for contract ${name}: ${error.message}`);
        }
      }
      
      // 更新最后处理的块
      this.lastProcessedBlock = currentBlock;
      logger.info(`Updated last processed block to ${currentBlock}`);
      
      return allEvents;
    } catch (error) {
      logger.error(`Error fetching events: ${error.message}`);
      return [];
    }
  }

  // 启动实时事件监听
  startEventListener() {
    // 如果实时事件被禁用，则跳过
    if (!config.monitor.enableRealTimeEvents) {
      logger.info('Real-time event monitoring is disabled in config');
      return false;
    }
    
    if (!this.eventListener) {
      logger.error('Event listener not initialized');
      return false;
    }
    
    return this.eventListener.startListening();
  }

  // 停止实时事件监听
  stopEventListener() {
    if (!this.eventListener) {
      logger.warn('Event listener not initialized');
      return;
    }
    
    this.eventListener.stopListening();
  }
}

module.exports = new EthereumService(); 