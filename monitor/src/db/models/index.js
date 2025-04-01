/**
 * 数据模型索引
 */

const address = require('./address');
const contractAbi = require('./contract-abi');
const transaction = require('./transaction');
const event = require('./event');
const syncStatus = require('./sync-status');

module.exports = {
  address,
  contractAbi,
  transaction,
  event,
  syncStatus
}; 