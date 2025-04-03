/**
 * @fileoverview 配置模块
 * @module config
 */

const EnvConfig = require('./env');
const NetworkConfig = require('./network');
const AbiConfig = require('./abi');
const ContractConfig = require('./contract');
const ConfigErrors = require('./errors');
const ConfigValidation = require('./validation');

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
  ContractConfig,
  
  /**
   * 配置错误类
   * @private 仅供内部使用
   */
  ConfigErrors,
  
  /**
   * 配置验证工具
   * @private 仅供内部使用
   */
  ConfigValidation
}; 