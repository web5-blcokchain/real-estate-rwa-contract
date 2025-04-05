const { ethers } = require('ethers');
const { GasError } = require('../utils/errors');
const Logger = require('../utils/logger');
const { Validation } = require('../utils/validation');
const Provider = require('./provider');
const path = require('path');
const dotenv = require('dotenv');

// 确保环境变量已加载
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * GasManager 管理器类
 */
class GasManager {
  /**
   * 创建 gas 管理器实例
   * @param {Object} options - 配置选项
   * @param {Object} [options.provider] - Provider 实例
   * @param {number} [options.maxPriorityFeePerGas=1.5] - 最大优先费用倍数
   * @param {number} [options.maxFeePerGas=2] - 最大费用倍数
   * @param {number} [options.gasLimitBuffer=1.1] - Gas 限制缓冲倍数
   * @returns {Promise<GasManager>} gas 管理器实例
   */
  static async create(options = {}) {
    try {
      const provider = options.provider || Provider.create();
      const maxPriorityFeePerGas = options.maxPriorityFeePerGas || 1.5;
      const maxFeePerGas = options.maxFeePerGas || 2;
      const gasLimitBuffer = options.gasLimitBuffer || 1.1;
      const manager = new GasManager(provider, maxPriorityFeePerGas, maxFeePerGas, gasLimitBuffer);
      Logger.info('Gas 管理器创建成功');
      return manager;
    } catch (error) {
      throw new GasError(`创建 Gas 管理器失败: ${error.message}`);
    }
  }

  /**
   * 构造函数
   * @param {ethers.Provider} provider - Provider 实例
   * @param {number} maxPriorityFeePerGas - 最大优先费用倍数
   * @param {number} maxFeePerGas - 最大费用倍数
   * @param {number} gasLimitBuffer - Gas 限制缓冲倍数
   */
  constructor(provider, maxPriorityFeePerGas, maxFeePerGas, gasLimitBuffer) {
    this.provider = provider;
    this.maxPriorityFeePerGas = maxPriorityFeePerGas;
    this.maxFeePerGas = maxFeePerGas;
    this.gasLimitBuffer = gasLimitBuffer;
  }

  /**
   * 获取当前 gas 价格
   * @returns {Promise<Object>} gas 价格信息
   */
  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = {
        maxFeePerGas: feeData.maxFeePerGas?.toString() || '0',
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
        gasPrice: feeData.gasPrice?.toString() || '0'
      };
      Logger.debug(`当前 gas 价格: ${JSON.stringify(gasPrice)}`);
      return gasPrice;
    } catch (error) {
      throw new GasError(`获取 gas 价格失败: ${error.message}`);
    }
  }

  /**
   * 获取推荐的 gas 价格
   * @returns {Promise<Object>} 推荐的 gas 价格
   */
  async getRecommendedGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      const baseFee = feeData.maxFeePerGas || feeData.gasPrice;

      // 计算推荐的优先费用
      const priorityFee = await this._calculatePriorityFee();
      
      // 计算最大费用
      const maxFee = baseFee.mul(Math.floor(this.maxFeePerGas * 100)).div(100);
      const maxPriorityFee = priorityFee.mul(Math.floor(this.maxPriorityFeePerGas * 100)).div(100);

      return {
        maxFeePerGas: maxFee,
        maxPriorityFeePerGas: maxPriorityFee,
        gasPrice: feeData.gasPrice
      };
    } catch (error) {
      throw new GasError(`获取推荐的 gas 价格失败: ${error.message}`);
    }
  }

  /**
   * 估算交易 gas 用量
   * @param {Object} transaction - 交易参数
   * @returns {Promise<string>} 估算的 gas 用量
   */
  async estimateGas(transaction) {
    try {
      Validation.validate(
        Validation.isValidAddress(transaction.to),
        '无效的接收地址'
      );

      if (transaction.data) {
        Validation.validate(
          Validation.isValidHexString(transaction.data),
          '无效的交易数据'
        );
      }

      const gasLimit = await this.provider.estimateGas(transaction);
      const estimatedGas = gasLimit.mul(Math.floor(this.gasLimitBuffer * 100)).div(100);
      Logger.debug(`估算的 gas 用量: ${estimatedGas.toString()}`);
      return estimatedGas.toString();
    } catch (error) {
      throw new GasError(`估算 gas 用量失败: ${error.message}`);
    }
  }

  /**
   * 计算交易费用
   * @param {Object} transaction - 交易参数
   * @returns {Promise<string>} 交易费用（以 wei 为单位）
   */
  async calculateFee(transaction) {
    try {
      Validation.validate(
        Validation.isValidTransaction(transaction),
        '无效的交易对象'
      );

      const gasLimit = await this.estimateGas(transaction);
      const feeData = await this.getRecommendedGasPrice();

      if (transaction.type === 2) {
        // EIP-1559 交易
        const maxFee = feeData.maxFeePerGas.mul(gasLimit);
        const maxPriorityFee = feeData.maxPriorityFeePerGas.mul(gasLimit);
        return {
          maxFee,
          maxPriorityFee,
          gasLimit
        };
      } else {
        // 传统交易
        const fee = feeData.gasPrice.mul(gasLimit);
        return {
          fee,
          gasPrice: feeData.gasPrice,
          gasLimit
        };
      }
    } catch (error) {
      throw new GasError(`计算交易费用失败: ${error.message}`);
    }
  }

  /**
   * 设置交易 gas 参数
   * @param {Object} transaction - 交易参数
   * @returns {Promise<Object>} 更新后的交易参数
   */
  async setGasParameters(transaction) {
    try {
      Validation.validate(
        Validation.isValidTransaction(transaction),
        '无效的交易对象'
      );

      const feeData = await this.getRecommendedGasPrice();
      const gasLimit = await this.estimateGas(transaction);

      if (transaction.type === 2) {
        // EIP-1559 交易
        return {
          ...transaction,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          gasLimit
        };
      } else {
        // 传统交易
        return {
          ...transaction,
          gasPrice: feeData.gasPrice,
          gasLimit
        };
      }
    } catch (error) {
      throw new GasError(`设置 gas 参数失败: ${error.message}`);
    }
  }

  /**
   * 计算推荐的优先费用
   * @returns {Promise<ethers.BigNumber>} 推荐的优先费用
   */
  async _calculatePriorityFee() {
    try {
      // 获取最近区块的优先费用
      const block = await this.provider.getBlock('latest');
      const transactions = await Promise.all(
        block.transactions.slice(0, 10).map(hash => 
          this.provider.getTransaction(hash)
        )
      );

      // 计算平均优先费用
      const priorityFees = transactions
        .filter(tx => tx.type === 2)
        .map(tx => tx.maxPriorityFeePerGas);

      if (priorityFees.length === 0) {
        return ethers.parseUnits('1.5', 'gwei');
      }

      const sum = priorityFees.reduce((a, b) => a.add(b));
      return sum.div(priorityFees.length);
    } catch (error) {
      Logger.warn(`计算优先费用失败: ${error.message}`);
      return ethers.parseUnits('1.5', 'gwei');
    }
  }

  /**
   * 获取 gas 价格历史
   * @param {number} [blocks=100] - 查询的区块数量
   * @returns {Promise<Array>} gas 价格历史
   */
  async getGasPriceHistory(blocks = 100) {
    try {
      Validation.validate(
        Validation.isValidNumber(blocks) && blocks > 0,
        '无效的区块数量'
      );

      const currentBlock = await this.provider.getBlockNumber();
      const history = [];

      for (let i = 0; i < blocks; i++) {
        const block = await this.provider.getBlock(currentBlock - i);
        if (block) {
          history.push({
            blockNumber: block.number,
            gasPrice: block.baseFeePerGas?.toString() || '0',
            timestamp: block.timestamp
          });
        }
      }

      Logger.debug(`获取 gas 价格历史成功: ${blocks} 个区块`);
      return history;
    } catch (error) {
      throw new GasError(`获取 gas 价格历史失败: ${error.message}`);
    }
  }
}

module.exports = GasManager; 