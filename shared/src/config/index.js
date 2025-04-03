/**
 * @fileoverview 配置模块
 * @module config
 */

const EnvConfig = require('./EnvConfig');
const AbiConfig = require('./abi');
const WalletConfig = require('./wallet');
const ContractConfig = require('./contract');
const NetworkConfig = require('./network');

/**
 * 导出配置
 * @exports config
 */
module.exports = {
  // 环境配置
  EnvConfig,
  
  // ABI配置
  AbiConfig,
  
  // 钱包配置
  WalletConfig,
  
  // 合约配置
  ContractConfig,
  
  // 网络配置
  NetworkConfig
}; 