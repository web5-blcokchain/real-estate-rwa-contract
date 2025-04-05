/**
 * shared模块管理
 * 集中导入和使用shared模块的组件
 */

const path = require('path');
const shared = require('../../../shared/src');

// 确保项目路径设置正确
const projectRootPath = process.env.PROJECT_PATH || path.resolve(__dirname, '../../..');
if (!process.env.PROJECT_PATH) {
  process.env.PROJECT_PATH = projectRootPath;
  if (!process.env.PROJECT_PATH.endsWith('/')) {
    process.env.PROJECT_PATH += '/';
  }
}

// 导出shared模块组件，提供集中访问点
module.exports = {
  // 核心组件
  Provider: shared.Provider,
  Wallet: shared.Wallet,
  Contract: shared.Contract,
  EventManager: shared.EventManager,
  TransactionManager: shared.TransactionManager,
  
  // 实用工具
  Logger: shared.Logger,
  ErrorHandler: shared.ErrorHandler,
  PerformanceMonitor: shared.PerformanceMonitor,
  Validation: shared.Validation,
  ValidationError: shared.ValidationError,
  
  // 配置shared模块日志
  configureLogger: (config) => {
    if (shared.Logger && typeof shared.Logger.configure === 'function') {
      return shared.Logger.configure(config);
    }
    throw new Error('Logger.configure不是一个有效的函数');
  },
  
  // 初始化shared模块，确保所有子模块正确加载
  initialize: () => {
    console.log('初始化shared模块...');
    
    // 验证关键组件是否可用
    const requiredComponents = [
      'Provider', 'Wallet', 'Contract', 
      'EventManager', 'TransactionManager', 
      'Logger', 'ErrorHandler', 'Validation'
    ];
    
    const missingComponents = requiredComponents.filter(
      component => !shared[component]
    );
    
    if (missingComponents.length > 0) {
      throw new Error(`缺少关键组件: ${missingComponents.join(', ')}`);
    }
    
    console.log('shared模块初始化完成');
    return true;
  }
}; 