/**
 * 服务模块索引
 * 统一导出所有服务
 */
const BlockchainService = require('./BlockchainService');
const contractService = require('./contract.service');
const blockchainServiceOld = require('./blockchain.service');

// 导出服务
module.exports = {
  // 主要服务
  blockchainService: BlockchainService,
  contractService,
  
  // 兼容旧模块（如果需要）
  blockchainServiceOld
}; 