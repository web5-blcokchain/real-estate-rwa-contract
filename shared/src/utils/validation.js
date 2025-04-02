const { ethers } = require('ethers');
const { ValidationError } = require('./errors');

/**
 * 验证工具类
 */
class Validation {
  /**
   * 验证条件并抛出错误
   * @param {boolean} condition - 验证条件
   * @param {string} message - 错误消息
   * @throws {ValidationError} 当条件为 false 时抛出错误
   */
  static validate(condition, message) {
    if (!condition) {
      throw new ValidationError(message);
    }
  }

  /**
   * 验证地址格式
   * @param {string} address - 以太坊地址
   * @returns {boolean} 是否有效
   */
  static isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    if (!address.startsWith('0x')) return false;
    if (address.length !== 42) return false;
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  /**
   * 验证私钥格式
   * @param {string} privateKey - 私钥
   * @returns {boolean} 是否有效
   */
  static isValidPrivateKey(privateKey) {
    if (!privateKey || typeof privateKey !== 'string') return false;
    if (!privateKey.startsWith('0x')) return false;
    if (privateKey.length !== 66) return false;
    return /^0x[0-9a-fA-F]{64}$/.test(privateKey);
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
    if (typeof blockNumber === 'number') {
      return Number.isInteger(blockNumber) && blockNumber >= 0;
    }
    if (typeof blockNumber === 'string') {
      return /^\d+$/.test(blockNumber) && parseInt(blockNumber) >= 0;
    }
    return false;
  }

  /**
   * 验证金额格式
   * @param {string|number} amount - 金额
   * @returns {boolean} 是否有效
   */
  static isValidAmount(amount) {
    if (!amount || typeof amount !== 'string') return false;
    if (amount.startsWith('-')) return false;
    const parts = amount.split('.');
    if (parts.length > 2) return false;
    if (parts[1] && parts[1].length > 18) return false;
    return /^\d+(\.\d+)?$/.test(amount);
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
   * 验证合约实例
   * @param {Object} contract - 合约实例
   * @returns {boolean} 是否有效
   */
  static isValidContract(contract) {
    return contract && typeof contract === 'object' && typeof contract.address === 'string';
  }

  /**
   * 验证字符串
   * @param {string} str - 字符串
   * @returns {boolean} 是否有效
   */
  static isValidString(str) {
    return str && typeof str === 'string' && str.length > 0;
  }

  /**
   * 验证对象
   * @param {Object} obj - 对象
   * @returns {boolean} 是否有效
   */
  static isValidObject(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
  }

  /**
   * 验证函数
   * @param {Function} fn - 函数
   * @returns {boolean} 是否有效
   */
  static isValidFunction(fn) {
    return typeof fn === 'function';
  }

  /**
   * 验证 ABI
   * @param {Array|string} abi - 合约 ABI
   * @returns {boolean} 是否有效
   */
  static isValidAbi(abi) {
    if (Array.isArray(abi)) {
      return abi.length > 0;
    }
    if (typeof abi === 'string') {
      try {
        const parsedAbi = JSON.parse(abi);
        return Array.isArray(parsedAbi) && parsedAbi.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 验证交易对象
   * @param {Object} transaction - 交易对象
   * @returns {boolean} 是否有效
   */
  static isValidTransaction(tx) {
    if (!this.isValidObject(tx)) return false;
    if (!this.isValidAddress(tx.to)) return false;
    if (tx.from && !this.isValidAddress(tx.from)) return false;
    if (tx.value && !this.isValidAmount(tx.value)) return false;
    if (tx.data && !this.isValidHexString(tx.data)) return false;
    return true;
  }

  /**
   * 验证 URL 格式
   * @param {string} url - URL
   * @returns {boolean} 是否有效
   */
  static isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证链 ID
   * @param {number|string} chainId - 链 ID
   * @returns {boolean} 是否有效
   */
  static isValidChainId(chainId) {
    if (!chainId || typeof chainId !== 'number') return false;
    return chainId > 0;
  }

  /**
   * 验证钱包实例
   * @param {ethers.Wallet} wallet - 钱包实例
   * @returns {boolean} 是否有效
   */
  static isValidWallet(wallet) {
    return wallet && typeof wallet === 'object' && typeof wallet.getAddress === 'function';
  }

  /**
   * 验证助记词
   * @param {string} mnemonic - 助记词
   * @returns {boolean} 是否有效
   */
  static isValidMnemonic(mnemonic) {
    return mnemonic && typeof mnemonic === 'string' && ethers.Wallet.isValidMnemonic(mnemonic);
  }

  /**
   * 验证签名
   * @param {string} signature - 签名
   * @returns {boolean} 是否有效
   */
  static isValidSignature(signature) {
    if (!signature || typeof signature !== 'string') return false;
    if (!signature.startsWith('0x')) return false;
    if (signature.length !== 132) return false;
    return /^0x[0-9a-fA-F]{130}$/.test(signature);
  }

  /**
   * 验证十六进制字符串
   * @param {string} hex - 十六进制字符串
   * @returns {boolean} 是否有效
   */
  static isValidHexString(hex) {
    if (!hex || typeof hex !== 'string') return false;
    if (!hex.startsWith('0x')) return false;
    return /^0x[0-9a-fA-F]*$/.test(hex);
  }

  /**
   * 验证 Provider 实例
   * @param {Object} provider - Provider 实例
   * @returns {boolean} 是否有效
   */
  static isValidProvider(provider) {
    return provider && typeof provider === 'object' && typeof provider.getNetwork === 'function';
  }

  /**
   * 验证哈希值
   * @param {string} hash - 哈希值
   * @returns {boolean} 是否有效
   */
  static isValidHash(hash) {
    if (!hash || typeof hash !== 'string') return false;
    if (!hash.startsWith('0x')) return false;
    if (hash.length !== 66) return false;
    return /^0x[0-9a-fA-F]{64}$/.test(hash);
  }
}

module.exports = Validation; 