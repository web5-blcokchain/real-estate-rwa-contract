/**
 * 核心模块入口文件
 * 提供区块链交互的核心功能类
 * @module core
 */

const Provider = require('./provider');
const Wallet = require('./wallet');
const Contract = require('./contract');

/**
 * 核心模块
 * @exports core
 */
module.exports = {
  /**
   * Provider类 - 管理区块链网络连接
   * 负责创建和维护与区块链节点的连接
   */
  Provider,
  
  /**
   * Wallet类 - 管理区块链钱包和账户
   * 负责创建钱包、签名交易和消息等功能
   */
  Wallet,
  
  /**
   * Contract类 - 管理智能合约交互
   * 负责创建合约实例、调用合约方法、监听事件等
   */
  Contract
}; 