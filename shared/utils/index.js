/**
 * 工具模块索引
 * 统一导出所有工具模块
 */

// 导入所有工具模块
const logger = require('./logger');
const getAbis = require('./getAbis');
const web3Provider = require('./web3Provider');
const contractService = require('./contractService');
const transaction = require('./transaction');
const eventListener = require('./eventListener');
const deployUtils = require('./deployUtils');

// 导出所有工具模块
module.exports = {
  logger,
  getAbis,
  web3Provider,
  contractService,
  transaction,
  eventListener,
  deployUtils,
  
  // 导出常用函数以便直接使用
  getLogger: logger.getLogger,
  getAbi: getAbis.getAbi,
  getProvider: web3Provider.getProvider,
  getSigner: web3Provider.getSigner,
  executeTransaction: transaction.executeTransaction,
  createEventListener: eventListener.createEventListener,
  deployContract: deployUtils.deployContract,
  createContractService: contractService.createContractService
}; 