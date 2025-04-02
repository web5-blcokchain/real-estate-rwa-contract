const { ErrorHandler } = require('./errors');

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
   * 验证区块号格式
   * @param {number|string} blockNumber - 区块号
   * @returns {boolean} 是否有效
   */
  static isValidBlockNumber(blockNumber) {
    return typeof blockNumber === 'number' && blockNumber >= 0;
  }

  /**
   * 验证金额格式
   * @param {string|number} amount - 金额
   * @returns {boolean} 是否有效
   */
  static isValidAmount(amount) {
    if (typeof amount === 'number') {
      return amount >= 0;
    }
    if (typeof amount === 'string') {
      return /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) >= 0;
    }
    return false;
  }

  /**
   * 验证 Gas 价格格式
   * @param {string|number} gasPrice - Gas 价格
   * @returns {boolean} 是否有效
   */
  static isValidGasPrice(gasPrice) {
    if (typeof gasPrice === 'number') {
      return gasPrice > 0;
    }
    if (typeof gasPrice === 'string') {
      return /^\d+(\.\d+)?$/.test(gasPrice) && parseFloat(gasPrice) > 0;
    }
    return false;
  }

  /**
   * 验证 Gas 限制格式
   * @param {string|number} gasLimit - Gas 限制
   * @returns {boolean} 是否有效
   */
  static isValidGasLimit(gasLimit) {
    if (typeof gasLimit === 'number') {
      return gasLimit > 0;
    }
    if (typeof gasLimit === 'string') {
      return /^\d+$/.test(gasLimit) && parseInt(gasLimit) > 0;
    }
    return false;
  }

  /**
   * 验证网络类型
   * @param {string} networkType - 网络类型
   * @returns {boolean} 是否有效
   */
  static isValidNetworkType(networkType) {
    return ['mainnet', 'testnet', 'local'].includes(networkType);
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

    const requiredFields = ['to', 'value', 'gasLimit', 'gasPrice'];
    return requiredFields.every(field => field in transaction);
  }

  /**
   * 验证条件并抛出错误
   * @param {boolean} condition - 验证条件
   * @param {string} message - 错误信息
   * @throws {ValidationError} 验证错误
   */
  static validate(condition, message) {
    if (!condition) {
      throw ErrorHandler.handle(new Error(message), { type: 'validation' });
    }
  }
}

module.exports = Validation; 