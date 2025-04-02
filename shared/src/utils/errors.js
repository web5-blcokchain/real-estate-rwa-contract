/**
 * 错误码定义
 */
const ErrorCodes = {
  NETWORK_ERROR: 1000,
  WALLET_ERROR: 2000,
  CONTRACT_ERROR: 3000,
  TRANSACTION_ERROR: 4000,
  GAS_ERROR: 5000,
  CONFIG_ERROR: 6000,
  VALIDATION_ERROR: 7000
};

/**
 * 区块链基础错误类
 */
class BlockchainError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'BlockchainError';
    this.code = code || ErrorCodes.NETWORK_ERROR;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 获取错误信息
   * @returns {string} 错误信息
   */
  toString() {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  /**
   * 获取错误详情
   * @returns {Object} 错误详情
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      stack: this.stack
    };
  }
}

/**
 * 网络错误类
 */
class NetworkError extends BlockchainError {
  constructor(message) {
    super(message, ErrorCodes.NETWORK_ERROR);
    this.name = 'NetworkError';
  }
}

/**
 * 钱包错误类
 */
class WalletError extends BlockchainError {
  constructor(message) {
    super(message, ErrorCodes.WALLET_ERROR);
    this.name = 'WalletError';
  }
}

/**
 * 合约错误类
 */
class ContractError extends BlockchainError {
  constructor(message) {
    super(message, ErrorCodes.CONTRACT_ERROR);
    this.name = 'ContractError';
  }
}

/**
 * 交易错误类
 */
class TransactionError extends BlockchainError {
  constructor(message) {
    super(message, ErrorCodes.TRANSACTION_ERROR);
    this.name = 'TransactionError';
  }
}

/**
 * Gas错误类
 */
class GasError extends BlockchainError {
  constructor(message) {
    super(message, ErrorCodes.GAS_ERROR);
    this.name = 'GasError';
  }
}

/**
 * 配置错误类
 */
class ConfigError extends BlockchainError {
  constructor(message) {
    super(message, ErrorCodes.CONFIG_ERROR);
    this.name = 'ConfigError';
  }
}

/**
 * 验证错误类
 */
class ValidationError extends BlockchainError {
  constructor(message) {
    super(message, ErrorCodes.VALIDATION_ERROR);
    this.name = 'ValidationError';
  }
}

module.exports = {
  ErrorCodes,
  BlockchainError,
  NetworkError,
  WalletError,
  ContractError,
  TransactionError,
  GasError,
  ConfigError,
  ValidationError
}; 