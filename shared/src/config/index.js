/**
 * @fileoverview 配置模块
 * @module config
 */

const EnvConfig = require('./env');
const NetworkConfig = require('./network');
const AbiConfig = require('./abi');
const ContractConfig = require('./contract');

/**
 * 导出配置
 * @exports config
 */
module.exports = {
  /**
   * 环境变量配置类
   */
  EnvConfig,
  
  /**
   * 网络配置类
   */
  NetworkConfig,
  
  /**
   * ABI配置类
   */
  AbiConfig,
  
  /**
   * 合约配置类
   */
  ContractConfig
}; 