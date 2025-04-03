/**
 * 配置错误基类
 * 用于配置模块中的所有错误
 */
class ConfigError extends Error {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   */
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * 环境变量错误
 * 用于环境变量配置相关的错误
 */
class EnvError extends ConfigError {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   */
  constructor(message) {
    super(message);
    this.name = 'EnvError';
  }
}

/**
 * 网络配置错误
 * 用于网络配置相关的错误
 */
class NetworkConfigError extends ConfigError {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   */
  constructor(message) {
    super(message);
    this.name = 'NetworkConfigError';
  }
}

/**
 * ABI配置错误
 * 用于ABI配置相关的错误
 */
class AbiConfigError extends ConfigError {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   */
  constructor(message) {
    super(message);
    this.name = 'AbiConfigError';
  }
}

/**
 * 合约配置错误
 * 用于合约配置相关的错误
 */
class ContractConfigError extends ConfigError {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   */
  constructor(message) {
    super(message);
    this.name = 'ContractConfigError';
  }
}

module.exports = {
  ConfigError,
  EnvError,
  NetworkConfigError,
  AbiConfigError,
  ContractConfigError
}; 