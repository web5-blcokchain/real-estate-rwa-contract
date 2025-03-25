/**
 * 脚本工具索引
 * 导出所有脚本模块和共享工具
 */

// 导入各个工具模块
const { main: deploySystem } = require('./deploy-unified');
const { main: verifyContracts } = require('./verify-contracts');
const { main: updateAbis, extractAndSaveAbi } = require('./update-abis');
const contractService = require('./utils/contractService');

// 从共享模块导入常用工具
const { 
  logger, 
  getLogger, 
  web3Provider, 
  transaction, 
  eventListener, 
  deployUtils, 
  contracts
} = require('../shared/utils');

// 导出所有模块
module.exports = {
  // 部署相关
  deploySystem,
  verifyContracts,
  updateAbis,
  extractAndSaveAbi,
  
  // 工具函数
  contractService,
  
  // 共享工具
  logger,
  getLogger,
  web3Provider,
  transaction,
  eventListener,
  deployUtils,
  contracts
}; 