/**
 * Shared模块入口文件
 * 提供与区块链交互的统一接口
 * @module shared
 */

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
 * 1. utils - 通用工具模块
 *    - 提供验证、日志、错误处理等基础工具
 *    - 独立于业务逻辑的纯函数
 * 
 * 2. core - 核心功能模块
 *    - 基于utils构建高级功能
 *    - 包含Provider、Wallet、Contract等核心类
 *    - 提供与区块链交互的完整功能
 */

/**
 * 导出所有模块
 * @exports shared
 */
module.exports = {
  /**
   * 工具模块
   * 包含验证、日志、错误处理等通用工具
   */
  ...utils,
  
  /**
   * 核心功能模块
   * 包含Provider、Wallet、Contract等核心类
   */
  Wallet,
  Provider,
  Contract
}; 