/**
 * @fileoverview 工具函数模块
 * @module utils
 */

const Validation = require('./validation');
const Logger = require('./logger');
const PerformanceMonitor = require('./performance');
const SecurityAuditor = require('./security');
const ContractUtils = require('./contract');
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

  // 合约工具
  ContractUtils,
  
  // 错误处理
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