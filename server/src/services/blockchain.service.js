/**
 * 区块链服务模块
 * 实现与区块链交互的业务逻辑
 */
const { ethers } = require('ethers');
const { Logger } = require('../../../shared/src/utils');
const blockchainService = require('./BlockchainService');
const serverConfig = require('../config');

/**
 * 获取区块链网络信息
 * @returns {Promise<Object>} 网络信息
 */
async function getNetworkInfo() {
  try {
    // 检查区块链服务是否已初始化
    if (!await blockchainService.isConnected()) {
      throw new Error('区块链服务未连接');
    }

    // 获取网络基本信息
    const chainId = await blockchainService.getNetworkId();
    const blockNumber = await blockchainService.getBlockNumber();
    const gasPrice = await blockchainService.getGasPrice();

    // 获取网络类型
    const networkType = blockchainService.getNetworkType();

    return {
      chainId,
      blockNumber,
      gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
      networkType,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.error(`获取区块链网络信息失败: ${error.message}`, { error });
    throw new Error(`获取区块链网络信息失败: ${error.message}`);
  }
}

/**
 * 获取交易信息
 * @param {string} txHash - 交易哈希
 * @returns {Promise<Object>} 交易信息
 */
async function getTransaction(txHash) {
  try {
    // 检查区块链服务是否已初始化
    if (!await blockchainService.isConnected()) {
      throw new Error('区块链服务未连接');
    }

    // 获取交易详情
    const tx = await blockchainService.getTransaction(txHash);
    if (!tx) {
      return null;
    }

    // 获取交易收据
    const receipt = await blockchainService.getTransactionReceipt(txHash);

    // 构建交易信息对象
    const transaction = {
      hash: tx.hash,
      blockNumber: tx.blockNumber,
      blockHash: tx.blockHash,
      from: tx.from,
      to: tx.to,
      value: ethers.utils.formatEther(tx.value),
      gasLimit: tx.gasLimit.toString(),
      gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei'),
      nonce: tx.nonce,
      data: tx.data,
      timestamp: new Date().toISOString()
    };

    // 如果有收据，添加收据信息
    if (receipt) {
      transaction.receipt = {
        status: receipt.status === 1 ? '成功' : '失败',
        gasUsed: receipt.gasUsed.toString(),
        cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
        effectiveGasPrice: ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei'),
        logs: receipt.logs.map(log => ({
          address: log.address,
          topics: log.topics,
          data: log.data
        }))
      };
    }

    return transaction;
  } catch (error) {
    Logger.error(`获取交易信息失败: ${error.message}`, { error, txHash });
    throw new Error(`获取交易信息失败: ${error.message}`);
  }
}

/**
 * 获取当前Gas价格
 * @returns {Promise<Object>} Gas价格信息
 */
async function getGasPrice() {
  try {
    // 检查区块链服务是否已初始化
    if (!await blockchainService.isConnected()) {
      throw new Error('区块链服务未连接');
    }

    // 获取当前Gas价格
    const gasPrice = await blockchainService.getGasPrice();

    return {
      wei: gasPrice.toString(),
      gwei: ethers.utils.formatUnits(gasPrice, 'gwei'),
      eth: ethers.utils.formatEther(gasPrice),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.error(`获取Gas价格失败: ${error.message}`, { error });
    throw new Error(`获取Gas价格失败: ${error.message}`);
  }
}

module.exports = {
  getNetworkInfo,
  getTransaction,
  getGasPrice
}; 