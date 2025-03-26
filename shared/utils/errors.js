const { getErrorLogPath, validatePath } = require('./paths');
const logger = require('./logger');

/**
 * 基础错误类
 */
class BaseError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 记录错误
   */
  log() {
    logger.error(this.message, {
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    });
  }

  /**
   * 保存错误到文件
   */
  async saveToFile() {
    try {
      if (!validatePath(getErrorLogPath())) {
        throw new Error('Invalid error log path');
      }

      const errorData = {
        name: this.name,
        message: this.message,
        code: this.code,
        details: this.details,
        timestamp: this.timestamp,
        stack: this.stack
      };

      await require('fs').promises.appendFile(
        getErrorLogPath(),
        JSON.stringify(errorData) + '\n'
      );
      logger.info('Error saved to file');
    } catch (error) {
      logger.error('Failed to save error to file:', error);
    }
  }
}

/**
 * API错误
 */
class ApiError extends BaseError {
  constructor({ message, code = 'API_ERROR', statusCode = 400, details = {} }) {
    super(message, code, details);
    this.statusCode = statusCode;
  }
}

/**
 * 配置错误
 */
class ConfigError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'CONFIG_ERROR', details);
  }
}

/**
 * 网络错误
 */
class NetworkError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
  }
}

/**
 * 合约错误
 */
class ContractError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'CONTRACT_ERROR', details);
  }
}

/**
 * 验证错误
 */
class ValidationError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * 部署错误
 */
class DeploymentError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'DEPLOYMENT_ERROR', details);
  }
}

/**
 * 测试错误
 */
class TestError extends BaseError {
  constructor(message, details = {}) {
    super(message, 'TEST_ERROR', details);
  }
}

/**
 * 处理错误
 * @param {Error} error 错误对象
 * @param {Object} [context] 上下文信息
 */
function handleError(error, context = {}) {
  if (error instanceof BaseError) {
    error.log();
    error.saveToFile();
  } else {
    const baseError = new BaseError(
      error.message,
      'UNKNOWN_ERROR',
      { ...context, originalError: error.name }
    );
    baseError.log();
    baseError.saveToFile();
  }
}

module.exports = {
  BaseError,
  ApiError,
  ConfigError,
  NetworkError,
  ContractError,
  ValidationError,
  DeploymentError,
  TestError,
  handleError
}; 