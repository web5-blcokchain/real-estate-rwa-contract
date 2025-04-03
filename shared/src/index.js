/**
 * Shared模块入口文件
 * 提供与区块链交互的统一接口
 * @module shared
 */

const utils = require('./utils');
const config = require('./config');
const core = require('./core');

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
  ...config,
  
  /**
   * 工具模块
   * 包含验证、日志、错误处理等通用工具
   */
  ...utils,
  
  /**
   * 核心功能模块
   * 包含Provider、Wallet、Contract等核心类
   */
  ...core
}; 