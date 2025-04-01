/**
 * 区块链监控服务
 */

const { CronJob } = require('cron');
const { createLogger } = require('../utils/logger');
const config = require('../config');
const blockchain = require('../utils/blockchain');
const models = require('../db/models');

const logger = createLogger('monitor-service');

// 存储正在运行的 cron 任务
let cronJob = null;

/**
 * 启动监控服务
 */
async function startMonitor() {
  try {
    if (cronJob) {
      logger.warn('监控服务已在运行中');
      return;
    }

    // 创建定时任务，默认每分钟运行一次
    const cronTime = process.env.MONITOR_CRON || '* * * * *';
    cronJob = new CronJob(
      cronTime,
      syncData,
      null,
      true,
      'Asia/Tokyo'
    );

    logger.info('监控服务已启动', { cronTime });
    
    // 立即执行一次同步
    syncData();
  } catch (error) {
    logger.error('启动监控服务失败', { error: error.message });
    throw error;
  }
}

/**
 * 停止监控服务
 */
function stopMonitor() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('监控服务已停止');
  }
}

/**
 * 同步区块链数据
 */
async function syncData() {
  try {
    logger.info('开始同步区块链数据');
    
    // 获取需要同步的地址
    const addresses = await models.syncStatus.getAddressesToSync();
    
    if (addresses.length === 0) {
      logger.info('没有需要同步的地址');
      return;
    }
    
    // 获取当前区块号
    const currentBlockNumber = await blockchain.getCurrentBlockNumber();
    logger.info('当前区块号', { currentBlockNumber });
    
    // 按地址类型分组处理
    const contractAddresses = addresses.filter(a => a.address_type === models.address.ADDRESS_TYPES.CONTRACT || a.address_type === models.address.ADDRESS_TYPES.TOKEN_CONTRACT);
    const eoaAddresses = addresses.filter(a => a.address_type === models.address.ADDRESS_TYPES.EOA);
    
    // 处理合约地址
    for (const address of contractAddresses) {
      await syncContractData(address, currentBlockNumber);
    }
    
    // 处理EOA地址
    for (const address of eoaAddresses) {
      await syncEOAData(address, currentBlockNumber);
    }
    
    logger.info('区块链数据同步完成');
  } catch (error) {
    logger.error('同步区块链数据失败', { error: error.message, stack: error.stack });
  }
}

/**
 * 同步合约数据
 * @param {Object} address 地址信息
 * @param {number} currentBlockNumber 当前区块号
 */
async function syncContractData(address, currentBlockNumber) {
  try {
    logger.info('开始同步合约数据', { address: address.address });
    
    // 标记为开始同步
    await models.syncStatus.startSync(address.address);
    
    // 确定起始区块号
    const startBlockNumber = address.last_block_number || 0;
    
    // 确定结束区块号（不超过当前确认的区块号）
    const confirmedBlockNumber = currentBlockNumber - config.blockchain.confirmations;
    const endBlockNumber = Math.min(startBlockNumber + config.blockchain.blocksPerScan, confirmedBlockNumber);
    
    // 如果没有新区块，直接返回
    if (startBlockNumber >= endBlockNumber) {
      logger.info('没有新区块需要同步', { 
        address: address.address,
        startBlockNumber,
        endBlockNumber
      });
      await models.syncStatus.endSync(address.address, startBlockNumber);
      return;
    }
    
    logger.info('同步区块范围', { 
      address: address.address,
      from: startBlockNumber,
      to: endBlockNumber
    });
    
    // 获取合约ABI
    const abi = await models.contractAbi.getContractAbi(address.address);
    
    if (!abi && address.address_type === models.address.ADDRESS_TYPES.CONTRACT) {
      logger.warn('未找到合约ABI，无法解析事件', { address: address.address });
    }
    
    // 同步交易历史
    const transactions = await blockchain.getAddressHistory(
      address.address,
      startBlockNumber,
      endBlockNumber
    );
    
    if (transactions.length > 0) {
      logger.info('找到交易记录', { 
        address: address.address,
        count: transactions.length 
      });
      
      // 保存交易信息
      await models.transaction.bulkSaveTransactions(transactions);
    }
    
    // 如果有ABI，同步合约事件
    if (abi) {
      const events = await blockchain.getContractEvents(
        address.address,
        abi,
        startBlockNumber,
        endBlockNumber
      );
      
      if (events.length > 0) {
        logger.info('找到合约事件', { 
          address: address.address,
          count: events.length 
        });
        
        // 保存事件信息
        await models.event.bulkSaveEvents(events);
      }
    }
    
    // 更新同步状态
    await models.syncStatus.endSync(address.address, endBlockNumber);
    
    logger.info('合约数据同步完成', { 
      address: address.address,
      syncedToBlock: endBlockNumber
    });
  } catch (error) {
    logger.error('同步合约数据失败', { 
      address: address.address,
      error: error.message
    });
    
    // 发生错误时，仍然结束同步状态，但不更新区块号
    await models.syncStatus.endSync(address.address, address.last_block_number || 0);
  }
}

/**
 * 同步EOA数据
 * @param {Object} address 地址信息
 * @param {number} currentBlockNumber 当前区块号
 */
async function syncEOAData(address, currentBlockNumber) {
  try {
    logger.info('开始同步EOA数据', { address: address.address });
    
    // 标记为开始同步
    await models.syncStatus.startSync(address.address);
    
    // 确定起始区块号
    const startBlockNumber = address.last_block_number || 0;
    
    // 确定结束区块号（不超过当前确认的区块号）
    const confirmedBlockNumber = currentBlockNumber - config.blockchain.confirmations;
    const endBlockNumber = Math.min(startBlockNumber + config.blockchain.blocksPerScan, confirmedBlockNumber);
    
    // 如果没有新区块，直接返回
    if (startBlockNumber >= endBlockNumber) {
      logger.info('没有新区块需要同步', { 
        address: address.address,
        startBlockNumber,
        endBlockNumber
      });
      await models.syncStatus.endSync(address.address, startBlockNumber);
      return;
    }
    
    logger.info('同步区块范围', { 
      address: address.address,
      from: startBlockNumber,
      to: endBlockNumber
    });
    
    // 同步交易历史
    const transactions = await blockchain.getAddressHistory(
      address.address,
      startBlockNumber,
      endBlockNumber
    );
    
    if (transactions.length > 0) {
      logger.info('找到交易记录', { 
        address: address.address,
        count: transactions.length 
      });
      
      // 保存交易信息
      await models.transaction.bulkSaveTransactions(transactions);
    }
    
    // 更新同步状态
    await models.syncStatus.endSync(address.address, endBlockNumber);
    
    logger.info('EOA数据同步完成', { 
      address: address.address,
      syncedToBlock: endBlockNumber
    });
  } catch (error) {
    logger.error('同步EOA数据失败', { 
      address: address.address,
      error: error.message
    });
    
    // 发生错误时，仍然结束同步状态，但不更新区块号
    await models.syncStatus.endSync(address.address, address.last_block_number || 0);
  }
}

/**
 * 手动同步指定地址
 * @param {string} address 地址
 * @returns {Promise<Object>} 同步结果
 */
async function syncAddress(address) {
  try {
    // 检查地址是否存在于监控列表
    const addressInfo = await models.address.getAddress(address);
    
    if (!addressInfo) {
      throw new Error(`地址 ${address} 不在监控列表中`);
    }
    
    // 获取同步状态
    const syncStatus = await models.syncStatus.getSyncStatus(address);
    
    // 获取当前区块号
    const currentBlockNumber = await blockchain.getCurrentBlockNumber();
    
    // 同步数据
    if (addressInfo.address_type === models.address.ADDRESS_TYPES.EOA) {
      await syncEOAData({ 
        ...addressInfo,
        last_block_number: syncStatus?.last_block_number || 0
      }, currentBlockNumber);
    } else {
      await syncContractData({ 
        ...addressInfo,
        last_block_number: syncStatus?.last_block_number || 0
      }, currentBlockNumber);
    }
    
    return {
      success: true,
      address,
      syncedToBlock: syncStatus?.last_block_number || 0
    };
  } catch (error) {
    logger.error('手动同步地址失败', { address, error: error.message });
    throw error;
  }
}

module.exports = {
  startMonitor,
  stopMonitor,
  syncData,
  syncAddress
}; 