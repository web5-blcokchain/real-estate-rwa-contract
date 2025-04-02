/**
 * 区块链工具函数
 */

const { ethers } = require('ethers');
const config = require('../config');
const { createLogger } = require('./logger');

const logger = createLogger('blockchain');

// 从shared配置获取provider
const provider = new ethers.JsonRpcProvider(config.blockchain.provider);

/**
 * 获取当前区块号
 * @returns {Promise<number>} 当前区块号
 */
async function getCurrentBlockNumber() {
  try {
    return await provider.getBlockNumber();
  } catch (error) {
    logger.error('获取当前区块号失败', { error: error.message });
    throw error;
  }
}

/**
 * 获取区块信息
 * @param {number|string} blockNumber 区块号或"latest"
 * @returns {Promise<Object>} 区块信息
 */
async function getBlock(blockNumber) {
  try {
    return await provider.getBlock(blockNumber, true);
  } catch (error) {
    logger.error('获取区块信息失败', { blockNumber, error: error.message });
    throw error;
  }
}

/**
 * 获取交易信息
 * @param {string} txHash 交易哈希
 * @returns {Promise<Object>} 交易信息
 */
async function getTransaction(txHash) {
  try {
    return await provider.getTransaction(txHash);
  } catch (error) {
    logger.error('获取交易信息失败', { txHash, error: error.message });
    throw error;
  }
}

/**
 * 获取交易收据
 * @param {string} txHash 交易哈希
 * @returns {Promise<Object>} 交易收据
 */
async function getTransactionReceipt(txHash) {
  try {
    return await provider.getTransactionReceipt(txHash);
  } catch (error) {
    logger.error('获取交易收据失败', { txHash, error: error.message });
    throw error;
  }
}

/**
 * 获取地址的交易历史
 * @param {string} address 地址
 * @param {number} fromBlock 起始区块
 * @param {number} toBlock 结束区块
 * @returns {Promise<Array>} 交易列表
 */
async function getAddressHistory(address, fromBlock, toBlock) {
  try {
    // 获取指定区块范围内的交易
    const transactions = [];
    
    // 查找作为发送方的交易
    const sentLogs = await provider.getLogs({
      fromBlock,
      toBlock,
      address: null,
      topics: [null, ethers.zeroPadValue(address.toLowerCase(), 32)]
    });

    // 查找作为接收方的交易
    const receivedLogs = await provider.getLogs({
      fromBlock,
      toBlock,
      address: null,
      topics: [null, null, ethers.zeroPadValue(address.toLowerCase(), 32)]
    });

    // 合并并去重
    const txHashes = new Set();
    [...sentLogs, ...receivedLogs].forEach(log => {
      if (!txHashes.has(log.transactionHash)) {
        txHashes.add(log.transactionHash);
        transactions.push(log.transactionHash);
      }
    });

    // 获取完整的交易信息
    const results = await Promise.all(
      transactions.map(async txHash => {
        const tx = await getTransaction(txHash);
        const receipt = await getTransactionReceipt(txHash);
        return { ...tx, ...receipt };
      })
    );

    return results;
  } catch (error) {
    logger.error('获取地址交易历史失败', { address, fromBlock, toBlock, error: error.message });
    throw error;
  }
}

/**
 * 获取合约事件
 * @param {string} address 合约地址
 * @param {Array} abi 合约ABI
 * @param {number} fromBlock 起始区块
 * @param {number} toBlock 结束区块
 * @returns {Promise<Array>} 事件列表
 */
async function getContractEvents(address, abi, fromBlock, toBlock) {
  try {
    const contract = new ethers.Contract(address, abi, provider);
    const filter = {
      address,
      fromBlock,
      toBlock
    };

    // 获取所有事件
    const logs = await provider.getLogs(filter);
    
    // 解析事件数据
    const events = [];
    for (const log of logs) {
      try {
        // 尝试根据ABI解析事件
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog) {
          events.push({
            ...log,
            name: parsedLog.name,
            signature: parsedLog.signature,
            args: parsedLog.args
          });
        }
      } catch (parseError) {
        logger.warn('无法解析事件日志', { 
          address, 
          transactionHash: log.transactionHash, 
          logIndex: log.logIndex, 
          error: parseError.message 
        });
      }
    }

    return events;
  } catch (error) {
    logger.error('获取合约事件失败', { address, fromBlock, toBlock, error: error.message });
    throw error;
  }
}

/**
 * 检查地址是否为合约
 * @param {string} address 地址
 * @returns {Promise<boolean>} 是否为合约
 */
async function isContract(address) {
  try {
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch (error) {
    logger.error('检查地址类型失败', { address, error: error.message });
    throw error;
  }
}

module.exports = {
  provider,
  getCurrentBlockNumber,
  getBlock,
  getTransaction,
  getTransactionReceipt,
  getAddressHistory,
  getContractEvents,
  isContract
}; 