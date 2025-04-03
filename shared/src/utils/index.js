/**
 * 工具模块入口文件
 * 导出所有工具类和函数
 * @module utils
 */

const Validation = require('./validation');
const Logger = require('./logger');
const PerformanceMonitor = require('./performance');
const SecurityAuditor = require('./security');
const { 
  callContractMethod,
  sendContractTransaction,
  createContractInstance,
  processContractResult,
  parseTokenAmount,
  formatTokenAmount
} = require('./contract');
const { 
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
} = require('./errors');

/**
 * 导出工具函数
 * @exports utils
 */
module.exports = {
  // 验证工具
  Validation,
  
  // 日志工具
  Logger,
  
  // 性能监控
  PerformanceMonitor,
  
  // 安全审计
  SecurityAuditor,

  // 合约工具函数
  callContractMethod,
  sendContractTransaction,
  createContractInstance,
  processContractResult,
  parseTokenAmount,
  formatTokenAmount,
  
  // 错误类和工具
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