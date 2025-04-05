const { ethers } = require('ethers');
const { TransactionError } = require('../utils/errors');
const Logger = require('../utils/logger');
const { Validation } = require('../utils/validation');
const Provider = require('./provider');
const Wallet = require('./wallet');
const GasManager = require('./gas-manager');
const path = require('path');
const dotenv = require('dotenv');

// 确保环境变量已加载
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * TransactionManager 管理器类
 */
class TransactionManager {
  /**
   * 创建交易管理器实例
   * @param {Object} options - 配置选项
   * @param {ethers.Signer} [options.signer] - 签名者实例
   * @param {number} [options.maxRetries=3] - 最大重试次数
   * @param {number} [options.retryDelay=1000] - 重试延迟（毫秒）
   * @param {number} [options.timeout=30000] - 超时时间（毫秒）
   * @returns {Promise<TransactionManager>} 交易管理器实例
   */
  static async create(options = {}) {
    try {
      const signer = options.signer;
      const maxRetries = options.maxRetries || 3;
      const retryDelay = options.retryDelay || 1000;
      const timeout = options.timeout || 30000;

      const manager = new TransactionManager(signer, maxRetries, retryDelay, timeout);
      Logger.info('交易管理器创建成功');
      return manager;
    } catch (error) {
      throw new TransactionError(`创建交易管理器失败: ${error.message}`);
    }
  }

  /**
   * 构造函数
   * @param {ethers.Signer} signer - 签名者实例
   * @param {number} maxRetries - 最大重试次数
   * @param {number} retryDelay - 重试延迟（毫秒）
   * @param {number} timeout - 超时时间（毫秒）
   */
  constructor(signer, maxRetries, retryDelay, timeout) {
    this.signer = signer;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.timeout = timeout;
  }

  /**
   * 发送交易
   * @param {Object} transaction - 交易对象
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async send(transaction) {
    try {
      Validation.validate(
        Validation.isValidTransaction(transaction),
        '无效的交易对象'
      );

      let retryCount = 0;
      let lastError;

      while (retryCount < this.maxRetries) {
        try {
          const tx = await this.signer.sendTransaction(transaction);
          Logger.info(`交易发送成功: ${tx.hash}`);
          return tx;
        } catch (error) {
          lastError = error;
          retryCount++;

          if (this._isRetryableError(error)) {
            Logger.warn(`交易发送失败，准备重试 (${retryCount}/${this.maxRetries}): ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          } else {
            throw error;
          }
        }
      }

      throw new TransactionError(`交易发送失败，已达到最大重试次数: ${lastError.message}`);
    } catch (error) {
      throw new TransactionError(`发送交易失败: ${error.message}`);
    }
  }

  /**
   * 等待交易确认
   * @param {string} hash - 交易哈希
   * @returns {Promise<ethers.TransactionReceipt>}
   */
  async wait(hash) {
    try {
      Validation.validate(
        Validation.isValidTransactionHash(hash),
        '无效的交易哈希'
      );

      let retryCount = 0;
      let lastError;

      while (retryCount < this.maxRetries) {
        try {
          const receipt = await this.signer.provider.waitForTransaction(hash, 1, this.timeout);
          Logger.info(`交易已确认: ${hash}`);
          return receipt;
        } catch (error) {
          lastError = error;
          retryCount++;

          if (this._isRetryableError(error)) {
            Logger.warn(`等待交易确认失败，准备重试 (${retryCount}/${this.maxRetries}): ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          } else {
            throw error;
          }
        }
      }

      throw new TransactionError(`等待交易确认失败，已达到最大重试次数: ${lastError.message}`);
    } catch (error) {
      throw new TransactionError(`等待交易确认失败: ${error.message}`);
    }
  }

  /**
   * 判断错误是否可重试
   * @param {Error} error - 错误对象
   * @returns {boolean}
   */
  _isRetryableError(error) {
    const retryableErrors = [
      'timeout',
      'network error',
      'connection error',
      'nonce too low',
      'replacement transaction underpriced'
    ];

    return retryableErrors.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  /**
   * 获取交易状态
   * @param {string} txHash - 交易哈希
   * @returns {Promise<string>} 交易状态
   */
  async getStatus(txHash) {
    try {
      Validation.validate(
        Validation.isValidTransactionHash(txHash),
        '无效的交易哈希'
      );

      const receipt = await this.signer.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return 'pending';
      }

      const status = receipt.status === 1 ? 'success' : 'failed';
      Logger.debug(`交易状态: ${txHash} = ${status}`);
      return status;
    } catch (error) {
      throw new TransactionError(`获取交易状态失败: ${error.message}`);
    }
  }

  /**
   * 获取交易详情
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易详情
   */
  async getDetails(txHash) {
    try {
      Validation.validate(
        Validation.isValidTransactionHash(txHash),
        '无效的交易哈希'
      );

      const tx = await this.signer.provider.getTransaction(txHash);
      if (!tx) {
        throw new TransactionError(`交易 ${txHash} 不存在`);
      }

      const receipt = await this.signer.provider.getTransactionReceipt(txHash);
      const status = await this.getStatus(txHash);

      const details = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        gasPrice: tx.gasPrice.toString(),
        gasLimit: tx.gasLimit.toString(),
        nonce: tx.nonce,
        data: tx.data,
        status,
        blockNumber: receipt?.blockNumber,
        confirmations: receipt?.confirmations || 0
      };

      Logger.debug(`获取交易详情成功: ${txHash}`);
      return details;
    } catch (error) {
      throw new TransactionError(`获取交易详情失败: ${error.message}`);
    }
  }

  /**
   * 取消交易
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 取消交易结果
   */
  async cancel(txHash) {
    try {
      Validation.validate(
        Validation.isValidTransactionHash(txHash),
        '无效的交易哈希'
      );

      const tx = await this.signer.provider.getTransaction(txHash);
      if (!tx) {
        throw new TransactionError(`交易 ${txHash} 不存在`);
      }

      if (tx.from.toLowerCase() !== this.signer.address.toLowerCase()) {
        throw new TransactionError(`无权取消此交易`);
      }

      // 发送一个零金额交易到自己的地址，使用相同的 nonce
      const cancelTx = {
        to: this.signer.address,
        value: 0,
        nonce: tx.nonce,
        gasPrice: (await GasManager.getRecommendedGasPrice(this.signer.provider)).fast
      };

      const response = await this.signer.sendTransaction(cancelTx);
      Logger.info(`取消交易已发送: ${response.hash}`);
      return response;
    } catch (error) {
      throw new TransactionError(`取消交易失败: ${error.message}`);
    }
  }

  /**
   * 加速交易
   * @param {string} txHash - 交易哈希
   * @param {number} [gasPriceMultiplier=1.1] - Gas 价格倍数
   * @returns {Promise<Object>} 加速交易结果
   */
  async speedUp(txHash, gasPriceMultiplier = 1.1) {
    try {
      Validation.validate(
        Validation.isValidTransactionHash(txHash),
        '无效的交易哈希'
      );

      Validation.validate(
        Validation.isValidNumber(gasPriceMultiplier) && gasPriceMultiplier > 1,
        '无效的 Gas 价格倍数'
      );

      const tx = await this.signer.provider.getTransaction(txHash);
      if (!tx) {
        throw new TransactionError(`交易 ${txHash} 不存在`);
      }

      if (tx.from.toLowerCase() !== this.signer.address.toLowerCase()) {
        throw new TransactionError(`无权加速此交易`);
      }

      // 使用更高的 gas 价格重新发送交易
      const speedUpTx = {
        ...tx,
        gasPrice: Math.floor(Number(tx.gasPrice) * gasPriceMultiplier)
      };

      const response = await this.signer.sendTransaction(speedUpTx);
      Logger.info(`加速交易已发送: ${response.hash}`);
      return response;
    } catch (error) {
      throw new TransactionError(`加速交易失败: ${error.message}`);
    }
  }
}

module.exports = TransactionManager; 