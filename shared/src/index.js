/**
 * 区块链交互共享模块
 * 
 * 提供区块链交互的核心功能，包括：
 * - 合约交互（调用、发送交易、事件监听）
 * - 钱包管理
 * - Provider连接
 * - 工具函数
 */

// 核心功能
const Contract = require('./core/contract');
const Provider = require('./core/provider');
const Wallet = require('./core/wallet');

// 工具函数
const { 
  Logger,
  Validation,
  PerformanceMonitor,
  SecurityAuditor,
  ContractAddress,
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
} = require('./utils');

// 配置
const config = require('./config');

// 日志配置 - 不依赖配置模块
try {
  // 只有在运行时环境中才配置日志
  if (process.env.NODE_ENV !== 'test') {
    Logger.configure({
      level: process.env.LOG_LEVEL || 'info',
      directory: process.env.LOG_DIR || require('path').join(process.cwd(), 'logs'),
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
      console: process.env.LOG_CONSOLE !== 'false'
    });
  }
} catch (error) {
  console.warn('日志配置失败，使用默认配置:', error.message);
}

/**
 * 模块层次结构:
 * 
 * 1. utils - 通用工具模块
 *    - 提供验证、日志、错误处理等基础工具
 *    - 独立于业务逻辑的纯函数
 * 
 * 2. core - 核心功能模块
 *    - 基于utils构建高级功能
 *    - 包含Provider、Wallet、Contract等核心类
 *    - 提供与区块链交互的完整功能
 */

/**
 * 导出所有模块
 * @exports shared
 */
module.exports = {
  // 核心功能
  Contract,
  Provider,
  Wallet,
  
  // 配置
  config,
  
  // 工具类
  Logger,
  Validation,
  PerformanceMonitor,
  SecurityAuditor,
  ContractAddress,
  
  // 错误类型
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
  ErrorHandler,
  
  // 工具命名空间（不推荐直接使用）
  utils: {
    Logger,
    Validation,
    PerformanceMonitor,
    SecurityAuditor,
    ContractAddress,
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
  }
}; 