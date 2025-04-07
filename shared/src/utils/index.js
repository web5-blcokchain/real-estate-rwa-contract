/**
 * 工具模块入口文件
 * 导出所有工具类和函数
 * @module utils
 */

const Validation = require('./validation');
const Logger = require('./logger');
const PerformanceMonitor = require('./performance');
const SecurityAuditor = require('./security');
const ContractAddress = require('./address');
const { formatContractArgs } = require('./formatter');
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

  // 地址管理
  ContractAddress,
  
  // 格式化工具
  formatContractArgs,
  
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