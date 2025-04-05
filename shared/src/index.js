/**
 * 区块链交互共享模块
 * 
 * 提供区块链交互的核心功能，包括：
 * - 合约交互（调用、发送交易、事件监听）
 * - 钱包管理
 * - Provider连接
 * - 工具函数
 */

// 核心功能
const Contract = require('./core/contract');
const Provider = require('./core/provider');
const Wallet = require('./core/wallet');

// 配置
const config = require('./config');

// 工具函数
const utils = require('./utils');

// 日志配置
const Logger = utils.Logger;
try {
  // 创建默认日志目录（如果不存在）
  const fs = require('fs');
  const path = require('path');
  const logDir = process.env.LOG_DIR || './logs';
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // 只有在运行时环境中才配置日志
  if (process.env.NODE_ENV !== 'test') {
    Logger.configure(config.logger);
  }
} catch (error) {
  console.warn('日志配置失败，使用默认配置:', error.message);
}

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
  // 核心功能
  Contract,
  Provider,
  Wallet,
  
  // 配置
  config,
  
  // 导出常用工具
  ...utils,
  
  // 导出所有工具为命名空间
  utils
}; 