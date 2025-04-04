/**
 * Shared模块入口文件
 * 提供与区块链交互的统一接口
 * @module shared
 */

// 配置相关模块
const EnvConfig = require('./config/env');
const NetworkConfig = require('./config/network');
const AbiConfig = require('./config/abi');
const ContractConfig = require('./config/contract');
const AddressConfig = require('./config/address');
const ValidationConfig = require('./config/validation');
const Constants = require('./config/constants');

// 工具模块
const utils = require('./utils');
const Wallet = require('./core/wallet');
const Provider = require('./core/provider');
const Contract = require('./core/contract');

// 初始化Logger
utils.Logger.configure({
  level: process.env.LOG_LEVEL || 'info',
  dir: process.env.LOG_DIR || './logs',
  maxSize: Number(process.env.MAX_LOG_SIZE) || 10 * 1024 * 1024,  // 10MB
  maxFiles: Number(process.env.MAX_LOG_FILES) || 5,
  console: process.env.LOG_CONSOLE !== 'false'
});

/**
 * 模块层次结构:
 * 
 * 1. config - 底层配置模块
 *    - 管理环境变量、网络配置、ABI和合约配置
 *    - 纯粹的数据获取与配置管理，不包含业务逻辑
 * 
 * 2. utils - 通用工具模块
 *    - 提供验证、日志、错误处理等基础工具
 *    - 独立于业务逻辑的纯函数
 * 
 * 3. core - 核心功能模块
 *    - 基于config和utils构建高级功能
 *    - 包含Provider、Wallet、Contract等核心类
 *    - 提供与区块链交互的完整功能
 */

/**
 * 导出所有模块
 * @exports shared
 */
module.exports = {
  /**
   * 配置模块
   * 包含环境变量、网络、ABI和合约配置
   */
  config: {
    EnvConfig,
    NetworkConfig,
    AbiConfig,
    ContractConfig,
    AddressConfig,
    ValidationConfig
  },
  
  /**
   * 工具模块
   * 包含验证、日志、错误处理等通用工具
   */
  Logger: utils.Logger,
  ErrorHandler: utils.ErrorHandler,
  Validation: utils.Validation,
  
  /**
   * 核心功能模块
   * 包含Provider、Wallet、Contract等核心类
   */
  Wallet,
  Provider,
  Contract,
  
  /**
   * 常量定义
   */
  Constants
}; 