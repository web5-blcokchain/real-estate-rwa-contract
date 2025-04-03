/**
 * 服务器服务模块入口
 */
const blockchainService = require('./BlockchainService');
const blockchainBusinessService = require('./blockchain.service');
const contractService = require('./contract.service');

module.exports = {
  blockchainService,
  blockchainBusinessService,
  contractService
}; 