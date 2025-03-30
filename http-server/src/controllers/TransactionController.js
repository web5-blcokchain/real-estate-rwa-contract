/**
 * Transaction控制器
 * 处理区块链交易查询的API请求
 */

const { ethers } = require('ethers');
const blockchainService = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { createSuccessResponse } = require('../utils/responseHelper');

// Transaction控制器
const TransactionController = {
  /**
   * 获取交易状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getTransactionStatus(req, res, next) {
    try {
      const { txHash } = req.params;
      
      // 验证交易哈希格式
      if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
        throw new ApiError('无效的交易哈希', 400, 'INVALID_TX_HASH');
      }
      
      // 获取交易状态
      const status = await blockchainService.getTransactionStatus(txHash);
      
      res.json(createSuccessResponse(status, '获取交易状态成功'));
    } catch (error) {
      logger.error('获取交易状态失败', error);
      next(error);
    }
  },

  /**
   * 获取交易收据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getTransactionReceipt(req, res, next) {
    try {
      const { txHash } = req.params;
      
      // 验证交易哈希格式
      if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
        throw new ApiError('无效的交易哈希', 400, 'INVALID_TX_HASH');
      }
      
      // 获取Provider
      const provider = blockchainService.getProvider();
      
      // 获取交易收据
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new ApiError('交易收据未找到，可能交易尚未被确认', 404, 'RECEIPT_NOT_FOUND');
      }
      
      // 格式化收据数据
      const formattedReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        from: receipt.from,
        to: receipt.to,
        contractAddress: receipt.contractAddress || null,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failure',
        confirmations: receipt.confirmations,
        logs: receipt.logs.map(log => ({
          address: log.address,
          topics: log.topics,
          data: log.data
        }))
      };
      
      res.json(createSuccessResponse(formattedReceipt, '获取交易收据成功'));
    } catch (error) {
      logger.error('获取交易收据失败', error);
      next(error);
    }
  },

  /**
   * 获取交易详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getTransactionDetails(req, res, next) {
    try {
      const { txHash } = req.params;
      
      // 验证交易哈希格式
      if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
        throw new ApiError('无效的交易哈希', 400, 'INVALID_TX_HASH');
      }
      
      // 获取Provider
      const provider = blockchainService.getProvider();
      
      // 获取交易
      const tx = await provider.getTransaction(txHash);
      
      if (!tx) {
        throw new ApiError('交易未找到', 404, 'TRANSACTION_NOT_FOUND');
      }
      
      // 获取交易收据
      const receipt = await provider.getTransactionReceipt(txHash);
      
      // 格式化交易数据
      const formattedTx = {
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        nonce: tx.nonce,
        gasLimit: tx.gasLimit.toString(),
        gasPrice: ethers.formatUnits(tx.gasPrice || 0, 'gwei'),
        data: tx.data,
        chainId: tx.chainId,
        confirmations: tx.confirmations,
        wait: receipt ? {
          status: receipt.status === 1 ? 'success' : 'failure',
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPrice: ethers.formatUnits(receipt.effectiveGasPrice || 0, 'gwei'),
          logs: receipt.logs.length
        } : null
      };
      
      res.json(createSuccessResponse(formattedTx, '获取交易详情成功'));
    } catch (error) {
      logger.error('获取交易详情失败', error);
      next(error);
    }
  },

  /**
   * 获取区块信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getBlock(req, res, next) {
    try {
      const { blockNumber } = req.params;
      
      // 验证区块号
      if (isNaN(blockNumber) && blockNumber !== 'latest') {
        throw new ApiError('无效的区块号', 400, 'INVALID_BLOCK_NUMBER');
      }
      
      // 获取Provider
      const provider = blockchainService.getProvider();
      
      // 获取区块信息
      const block = await provider.getBlock(
        blockNumber === 'latest' ? 'latest' : parseInt(blockNumber)
      );
      
      if (!block) {
        throw new ApiError('区块未找到', 404, 'BLOCK_NOT_FOUND');
      }
      
      // 格式化区块数据
      const formattedBlock = {
        hash: block.hash,
        number: block.number,
        timestamp: new Date(block.timestamp * 1000).toISOString(),
        parentHash: block.parentHash,
        nonce: block.nonce,
        miner: block.miner,
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        transactions: block.transactions.length
      };
      
      res.json(createSuccessResponse(formattedBlock, '获取区块信息成功'));
    } catch (error) {
      logger.error('获取区块信息失败', error);
      next(error);
    }
  },

  /**
   * 获取账户余额
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getBalance(req, res, next) {
    try {
      const { address } = req.params;
      
      // 验证地址格式
      if (!address || !ethers.isAddress(address)) {
        throw new ApiError('无效的地址', 400, 'INVALID_ADDRESS');
      }
      
      // 获取Provider
      const provider = blockchainService.getProvider();
      
      // 获取余额
      const balance = await provider.getBalance(address);
      
      res.json(createSuccessResponse({
        address,
        balance: balance.toString(),
        formattedBalance: ethers.formatEther(balance),
        unit: 'ETH'
      }, '获取账户余额成功'));
    } catch (error) {
      logger.error('获取账户余额失败', error);
      next(error);
    }
  }
};

module.exports = TransactionController; 