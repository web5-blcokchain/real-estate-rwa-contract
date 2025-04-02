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
  VALIDATION_ERROR: 7000,
  LOGGER_ERROR: 8000
};

/**
 * 区块链基础错误类
 */
class BlockchainError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'BlockchainError';
    this.code = code || ErrorCodes.NETWORK_ERROR;
    this.context = context;
    this.timestamp = new Date().toISOString();
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
      context: this.context,
      stack: this.stack,
      timestamp: this.timestamp
    };
  }
}

/**
 * 网络错误类
 */
class NetworkError extends BlockchainError {
  constructor(message, context = {}) {
    super(message, ErrorCodes.NETWORK_ERROR, context);
    this.name = 'NetworkError';
  }
}

/**
 * 钱包错误类
 */
class WalletError extends BlockchainError {
  constructor(message, context = {}) {
    super(message, ErrorCodes.WALLET_ERROR, context);
    this.name = 'WalletError';
  }
}

/**
 * 合约错误类
 */
class ContractError extends BlockchainError {
  constructor(message, context = {}) {
    super(message, ErrorCodes.CONTRACT_ERROR, context);
    this.name = 'ContractError';
  }
}

/**
 * 交易错误类
 */
class TransactionError extends BlockchainError {
  constructor(message, context = {}) {
    super(message, ErrorCodes.TRANSACTION_ERROR, context);
    this.name = 'TransactionError';
  }
}

/**
 * Gas错误类
 */
class GasError extends BlockchainError {
  constructor(message, context = {}) {
    super(message, ErrorCodes.GAS_ERROR, context);
    this.name = 'GasError';
  }
}

/**
 * 配置错误类
 */
class ConfigError extends BlockchainError {
  constructor(message, context = {}) {
    super(message, ErrorCodes.CONFIG_ERROR, context);
    this.name = 'ConfigError';
  }
}

/**
 * 验证错误类
 */
class ValidationError extends BlockchainError {
  constructor(message, context = {}) {
    super(message, ErrorCodes.VALIDATION_ERROR, context);
    this.name = 'ValidationError';
  }
}

/**
 * 日志错误类
 */
class LoggerError extends BlockchainError {
  constructor(message, context = {}) {
    super(message, ErrorCodes.LOGGER_ERROR, context);
    this.name = 'LoggerError';
  }
}

/**
 * 错误处理工具
 */
const ErrorHandler = {
  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {BlockchainError} 处理后的错误
   */
  handle(error, context = {}) {
    if (error instanceof BlockchainError) {
      return error;
    }

    // 根据错误类型创建对应的错误对象
    if (error.message.includes('network')) {
      return new NetworkError(error.message, context);
    } else if (error.message.includes('wallet')) {
      return new WalletError(error.message, context);
    } else if (error.message.includes('contract')) {
      return new ContractError(error.message, context);
    } else if (error.message.includes('transaction')) {
      return new TransactionError(error.message, context);
    } else if (error.message.includes('gas')) {
      return new GasError(error.message, context);
    } else if (error.message.includes('config')) {
      return new ConfigError(error.message, context);
    } else if (error.message.includes('validation')) {
      return new ValidationError(error.message, context);
    } else if (error.message.includes('logger')) {
      return new LoggerError(error.message, context);
    }

    // 默认返回基础错误
    return new BlockchainError(error.message, ErrorCodes.NETWORK_ERROR, context);
  }
};

module.exports = {
  ErrorCodes,
  BlockchainError,
  NetworkError,
  WalletError,
  ContractError,
  TransactionError,
  GasError,
  ConfigError,
  ValidationError,
  LoggerError,
  ErrorHandler
}; 