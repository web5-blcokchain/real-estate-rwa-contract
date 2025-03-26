const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const ethereumService = require('./utils/ethereum');
const { closeLoggers } = require('../../shared/utils/logger');
const { initializeEnvironment } = require('../../shared/config/environment');

// 确保环境已初始化
initializeEnvironment();

// 确保日志目录存在
const setupLogDirectory = () => {
  const logDir = config.logging.directory;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    logger.info(`Created log directory: ${logDir}`);
  }
};

// 打印历史事件
const printEvents = (events) => {
  if (events.length === 0) {
    logger.info('No new historical events found');
    return;
  }
  
  logger.info(`Found ${events.length} historical events`);
  
  events.forEach((event) => {
    const timestamp = new Date().toISOString();
    const contractInfo = `${event.contractName}(${event.contractAddress})`;
    const eventInfo = `${event.eventName}`;
    const blockInfo = `Block: ${event.blockNumber}`;
    const txInfo = `Tx: ${event.transactionHash}`;
    
    console.log(`\n[${timestamp}] 📜 HISTORICAL EVENT:`);
    console.log(`- Contract: ${contractInfo}`);
    console.log(`- Event: ${eventInfo}`);
    console.log(`- ${blockInfo} | ${txInfo}`);
    console.log(`- Args: ${JSON.stringify(event.args, null, 2)}`);
    console.log('-------------------------------------------');
    
    // 同时记录到日志文件
    logger.info(`Historical event: ${eventInfo}`, {
      contract: contractInfo,
      block: event.blockNumber,
      tx: event.transactionHash,
      args: event.args
    });
  });
};

// 处理历史区块中的事件
const processHistoricalEvents = async () => {
  try {
    const events = await ethereumService.getEvents();
    printEvents(events);
  } catch (error) {
    logger.error(`Error processing historical events: ${error.message}`);
  }
};

// 主函数
const main = async () => {
  console.log("\n======================================================");
  console.log("                 🔍 BLOCKCHAIN EVENT MONITOR                 ");
  console.log("======================================================\n");
  logger.info('Starting Blockchain Events Monitor');
  
  // 设置日志目录
  setupLogDirectory();
  
  // 初始化共享配置
  try {
    await config.initializeConfig();
    logger.info('Shared configuration initialized');
  } catch (error) {
    logger.error(`Failed to initialize shared configuration: ${error.message}`);
    logger.warn('Will continue with local configuration only');
  }
  
  // 初始化以太坊服务
  const initialized = await ethereumService.initialize();
  if (!initialized) {
    logger.error('Failed to initialize Ethereum service. Exiting...');
    process.exit(1);
  }
  
  // 立即执行一次历史事件获取
  await processHistoricalEvents();
  
  // 启动实时事件监听
  const listenerStarted = ethereumService.startEventListener();
  if (listenerStarted) {
    logger.info('Real-time event listener started successfully');
    console.log("\n🎯 NOW LISTENING FOR REAL-TIME EVENTS...\n");
  } else {
    logger.warn('Failed to start real-time event listener. Will continue with historical event polling.');
  }
  
  // 设置定时获取历史事件的任务
  const interval = Math.floor(config.monitor.pollingInterval / 1000);
  logger.info(`Setting up historical event polling every ${interval} seconds`);
  
  // 使用node-cron定时执行事件获取
  cron.schedule(`*/${interval} * * * * *`, async () => {
    await processHistoricalEvents();
  });
  
  logger.info('Blockchain Events Monitor running');
  console.log("\n✅ MONITOR RUNNING - PRESS CTRL+C TO EXIT\n");
};

// 优雅关闭函数
const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  
  // 设置强制关闭定时器，防止卡住
  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
  
  try {
    // 停止事件监听
    ethereumService.stopEventListener();
    logger.info('Event listener stopped');
    
    // 关闭日志记录器
    closeLoggers();
    logger.info('Loggers closed');
    
    // 取消强制退出的定时器
    clearTimeout(forceExit);
    console.log("\n👋 GOODBYE! EVENT MONITOR STOPPED.\n");
    
    // 正常退出
    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error.message}`);
    clearTimeout(forceExit);
    process.exit(1);
  }
};

// 处理程序退出
process.on('SIGINT', () => {
  logger.info('Received SIGINT signal');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal');
  gracefulShutdown();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  gracefulShutdown();
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason });
  // 对于未处理的Promise拒绝，我们记录但不立即关闭
  // 因为这可能只是一个暂时性问题
});

// 启动程序
main().catch((error) => {
  logger.error(`Error in main function: ${error.message}`, { stack: error.stack });
  process.exit(1);
}); 