/**
 * @fileoverview 核心功能模块
 * @module core
 */

const Contract = require('./contract');
const Provider = require('./provider');
const GasManager = require('./gas-manager');
const TransactionManager = require('./transaction-manager');
const EventManager = require('./event-manager');
const Wallet = require('./wallet');

/**
 * 导出核心模块
 * @exports core
 */
module.exports = {
  Contract,
  Provider,
  GasManager,
  TransactionManager,
  EventManager,
  Wallet
}; 