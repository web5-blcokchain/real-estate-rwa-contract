/**
 * 错误码定义
 */
const ErrorCodes = {
  GENERAL_ERROR: 1000,
  NETWORK_ERROR: 2000,
  NETWORK_TIMEOUT: 2001,
  NETWORK_DISCONNECTED: 2002,
  WALLET_ERROR: 3000,
  WALLET_NOT_FOUND: 3001,
  WALLET_ACCESS_DENIED: 3002,
  INSUFFICIENT_BALANCE: 3003,
  CONTRACT_ERROR: 4000,
  CONTRACT_NOT_FOUND: 4001,
  CONTRACT_CALL_ERROR: 4002,
  CONTRACT_EVENT_ERROR: 4003,
  TX_ERROR: 5000,
  TX_REJECTED: 5001,
  TX_DROPPED: 5002,
  TX_TIMEOUT: 5003,
  TX_REPLACED: 5004,
  GAS_ERROR: 6000,
  GAS_ESTIMATION_FAILED: 6001,
  GAS_LIMIT_EXCEEDED: 6002,
  CONFIG_ERROR: 7000,
  CONFIG_NOT_FOUND: 7001,
  INVALID_CONFIG: 7002,
  LOGGER_ERROR: 8000,
  VALIDATION_ERROR: 9000,
  INVALID_ADDRESS: 9001,
  INVALID_HASH: 9002,
  INVALID_AMOUNT: 9003
};

/**
 * 区块链基础错误类
 */
class BlockchainError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'BlockchainError';
    this.code = options.code || ErrorCodes.GENERAL_ERROR;
    this.context = options.context || {};
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
  constructor(message, options = {}) {
    super(message, {
      code: options.code || ErrorCodes.NETWORK_ERROR,
      context: options.context || {}
    });
    this.name = 'NetworkError';
  }
}

/**
 * 钱包错误类
 */
class WalletError extends BlockchainError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || ErrorCodes.WALLET_ERROR,
      context: options.context || {}
    });
    this.name = 'WalletError';
  }
}

/**
 * 合约错误类
 */
class ContractError extends BlockchainError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || ErrorCodes.CONTRACT_ERROR,
      context: options.context || {}
    });
    this.name = 'ContractError';
  }
}

/**
 * 交易错误类
 */
class TransactionError extends BlockchainError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || ErrorCodes.TX_ERROR,
      context: options.context || {}
    });
    this.name = 'TransactionError';
  }
}

/**
 * Gas错误类
 */
class GasError extends BlockchainError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || ErrorCodes.GAS_ERROR,
      context: options.context || {}
    });
    this.name = 'GasError';
  }
}

/**
 * 配置错误类
 */
class ConfigError extends BlockchainError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || ErrorCodes.CONFIG_ERROR,
      context: options.context || {}
    });
    this.name = 'ConfigError';
  }
}

/**
 * 验证错误类
 */
class ValidationError extends BlockchainError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || ErrorCodes.VALIDATION_ERROR,
      context: options.context || {}
    });
    this.name = 'ValidationError';
  }
}

/**
 * 日志错误类
 */
class LoggerError extends BlockchainError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || ErrorCodes.LOGGER_ERROR,
      context: options.context || {}
    });
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
   * @param {Object} [options={}] - 处理选项
   * @param {string} [options.type] - 错误类型
   * @param {Object} [options.context] - 额外上下文
   * @returns {BlockchainError} 处理后的错误
   */
  handle(error, options = {}) {
    if (error instanceof BlockchainError) {
      if (options.context) {
        error.context = { ...error.context, ...options.context };
      }
      return error;
    }

    const message = error.message || '未知错误';
    const errorContext = options.context || {};

    if (
      options.type === 'network' ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('ETIMEDOUT') ||
      message.includes('ECONNRESET')
    ) {
      return new NetworkError(message, { context: errorContext });
    } else if (
      options.type === 'wallet' ||
      message.includes('wallet') ||
      message.includes('account') ||
      message.includes('private key')
    ) {
      return new WalletError(message, { context: errorContext });
    } else if (
      options.type === 'contract' ||
      message.includes('contract') ||
      message.includes('execution reverted')
    ) {
      return new ContractError(message, { context: errorContext });
    } else if (
      options.type === 'transaction' ||
      message.includes('transaction') ||
      message.includes('tx') ||
      message.includes('underpriced')
    ) {
      return new TransactionError(message, { context: errorContext });
    } else if (
      options.type === 'gas' ||
      message.includes('gas') ||
      message.includes('fee')
    ) {
      return new GasError(message, { context: errorContext });
    } else if (
      options.type === 'config' ||
      message.includes('config') ||
      message.includes('setting')
    ) {
      return new ConfigError(message, { context: errorContext });
    } else if (
      options.type === 'validation' ||
      message.includes('invalid') ||
      message.includes('valid')
    ) {
      return new ValidationError(message, { context: errorContext });
    } else if (message.includes('logger')) {
      return new LoggerError(message, { context: errorContext });
    }

    return new BlockchainError(message, { context: errorContext });
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