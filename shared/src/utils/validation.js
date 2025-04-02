const { ValidationError } = require('./errors');

/**
 * 验证工具类
 */
class Validation {
  /**
   * 验证地址格式
   * @param {string} address - 以太坊地址
   * @returns {boolean} 是否有效
   */
  static isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * 验证私钥格式
   * @param {string} privateKey - 私钥
   * @returns {boolean} 是否有效
   */
  static isValidPrivateKey(privateKey) {
    return /^0x[a-fA-F0-9]{64}$/.test(privateKey);
  }

  /**
   * 验证交易哈希格式
   * @param {string} hash - 交易哈希
   * @returns {boolean} 是否有效
   */
  static isValidTransactionHash(hash) {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * 验证区块号
   * @param {number|string} blockNumber - 区块号
   * @returns {boolean} 是否有效
   */
  static isValidBlockNumber(blockNumber) {
    const num = Number(blockNumber);
    return !isNaN(num) && num >= 0 && Number.isInteger(num);
  }

  /**
   * 验证金额格式
   * @param {string|number|bigint} amount - 金额
   * @returns {boolean} 是否有效
   */
  static isValidAmount(amount) {
    try {
      const value = BigInt(amount);
      return value >= 0n;
    } catch {
      return false;
    }
  }

  /**
   * 验证gas价格
   * @param {string|number|bigint} gasPrice - gas价格
   * @returns {boolean} 是否有效
   */
  static isValidGasPrice(gasPrice) {
    try {
      const value = BigInt(gasPrice);
      return value > 0n;
    } catch {
      return false;
    }
  }

  /**
   * 验证gas限制
   * @param {string|number|bigint} gasLimit - gas限制
   * @returns {boolean} 是否有效
   */
  static isValidGasLimit(gasLimit) {
    try {
      const value = BigInt(gasLimit);
      return value > 0n;
    } catch {
      return false;
    }
  }

  /**
   * 验证网络类型
   * @param {string} networkType - 网络类型
   * @returns {boolean} 是否有效
   */
  static isValidNetworkType(networkType) {
    return ['local', 'testnet', 'mainnet'].includes(networkType?.toLowerCase());
  }

  /**
   * 验证合约名称
   * @param {string} contractName - 合约名称
   * @returns {boolean} 是否有效
   */
  static isValidContractName(contractName) {
    return typeof contractName === 'string' && contractName.length > 0;
  }

  /**
   * 验证事件名称
   * @param {string} eventName - 事件名称
   * @returns {boolean} 是否有效
   */
  static isValidEventName(eventName) {
    return typeof eventName === 'string' && eventName.length > 0;
  }

  /**
   * 验证交易对象
   * @param {Object} transaction - 交易对象
   * @returns {boolean} 是否有效
   */
  static isValidTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object') {
      return false;
    }

    if (transaction.to && !this.isValidAddress(transaction.to)) {
      return false;
    }

    if (transaction.value && !this.isValidAmount(transaction.value)) {
      return false;
    }

    if (transaction.gasLimit && !this.isValidGasLimit(transaction.gasLimit)) {
      return false;
    }

    if (transaction.gasPrice && !this.isValidGasPrice(transaction.gasPrice)) {
      return false;
    }

    if (transaction.maxFeePerGas && !this.isValidGasPrice(transaction.maxFeePerGas)) {
      return false;
    }

    if (transaction.maxPriorityFeePerGas && !this.isValidGasPrice(transaction.maxPriorityFeePerGas)) {
      return false;
    }

    return true;
  }

  /**
   * 验证并抛出错误
   * @param {boolean} condition - 验证条件
   * @param {string} message - 错误消息
   * @throws {ValidationError} 验证错误
   */
  static validate(condition, message) {
    if (!condition) {
      throw new ValidationError(message);
    }
  }
}

module.exports = Validation; 