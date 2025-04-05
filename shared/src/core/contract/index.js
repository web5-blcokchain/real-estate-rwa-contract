/**
 * 合约模块索引
 * 统一导出所有合约相关类和工具
 */

const ContractFactory = require('./factory');
const ContractCaller = require('./caller');
const ContractSender = require('./sender');
const { TransactionStatus, ContractTransaction } = require('./transaction');
const { ListenerStatus, ContractEvent } = require('./event');

/**
 * 合约模块
 * 提供合约相关功能的统一入口
 */
const Contract = {
  // 工厂方法，用于创建合约实例
  create: ContractFactory.create,
  createReadOnly: ContractFactory.createReadOnly,
  createFromName: ContractFactory.createFromName,
  loadContractAbi: ContractFactory.loadContractAbi,
  
  // 合约调用功能
  call: ContractCaller.call,
  multiCall: ContractCaller.multiCall,
  
  // 合约交易功能
  send: ContractSender.send,
  waitForTransaction: ContractSender.waitForTransaction,
  
  // 高级交易管理
  execute: ContractTransaction.execute,
  batchExecute: ContractTransaction.batchExecute,
  
  // 事件管理
  listenToEvent: ContractEvent.listen,
  removeEventListener: ContractEvent.removeListener,
  pauseEventListener: ContractEvent.pauseListener,
  resumeEventListener: ContractEvent.resumeListener,
  queryEvents: ContractEvent.query,
  getActiveListeners: ContractEvent.getActiveListeners,
  parseReceiptEvents: ContractEvent.parseReceiptEvents,
  
  // 导出枚举
  TransactionStatus,
  ListenerStatus
};

module.exports = Contract; 