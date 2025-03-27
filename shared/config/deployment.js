/**
 * 部署配置模块
 * 提供统一的部署配置接口，支持不同部署策略
 */
const fs = require('fs');
const path = require('path');
const { configManager } = require('./index');
const logger = require('../utils/logger');
const ethers = require('ethers');

// 部署策略枚举
const DeploymentStrategy = {
  DIRECT: 'direct',        // 直接部署（不可升级）
  UPGRADEABLE: 'upgradeable', // 可升级部署（UUPS代理）
  MINIMAL: 'minimal'      // 最小化部署（测试用）
};

// 默认部署配置
const defaultDeploymentConfig = {
  // 部署策略
  strategy: DeploymentStrategy.UPGRADEABLE,
  
  // 合约部署顺序
  deploymentOrder: [
    'RoleManager',
    'FeeManager',
    'PropertyRegistry',
    'RentDistributor',
    'TokenFactory',
    'RedemptionManager',
    'Marketplace',
    'TokenHolderQuery',
    'RealEstateSystem'
  ],
  
  // 库合约
  libraries: [
    'SystemDeployerLib1',
    'SystemDeployerLib2'
  ],
  
  // 合约初始化参数（函数）
  // 参数可以是固定值或函数，函数接收已部署合约地址的映射
  initializeParams: {
    RoleManager: () => [],
    FeeManager: (contracts) => [contracts.RoleManager],
    PropertyRegistry: (contracts) => [contracts.RoleManager],
    RentDistributor: (contracts) => [contracts.RoleManager, contracts.FeeManager],
    TokenFactory: (contracts) => [
      contracts.RoleManager,
      contracts.PropertyRegistry,
      "0x0000000000000000000000000000000000000000", // tokenImplementation 初始化为零地址，稍后会通过部署 RealEstateToken 更新
      contracts.RentDistributor
    ],
    RedemptionManager: (contracts) => [
      contracts.RoleManager,
      contracts.FeeManager,
      contracts.PropertyRegistry
    ],
    Marketplace: (contracts) => [
      contracts.RoleManager,
      contracts.FeeManager
    ],
    TokenHolderQuery: (contracts) => [contracts.RoleManager],
    RealEstateSystem: (contracts) => [
      contracts.RoleManager,
      contracts.FeeManager,
      contracts.PropertyRegistry,
      contracts.TokenFactory,
      contracts.RedemptionManager,
      contracts.RentDistributor,
      contracts.Marketplace,
      contracts.TokenHolderQuery
    ]
  },
  
  // 自动授予的角色
  autoGrantRoles: {
    DEFAULT_ADMIN_ROLE: true,
    PROPERTY_MANAGER_ROLE: true,
    TOKEN_MANAGER_ROLE: true,
    FEE_MANAGER_ROLE: true,
    RENT_MANAGER_ROLE: true
  },
  
  // 部署选项
  options: {
    // 事务选项
    transaction: {
      gasLimitMultiplier: 1.5,        // Gas限制乘数
      priorityFee: undefined,         // 优先费（wei）
      maxFeePerGas: undefined,        // 最大费用（wei）
      nonce: undefined,               // 指定nonce值
      waitConfirmations: 2            // 等待确认数
    },
    
    // 重试选项
    retry: {
      maxRetries: 3,                 // 最大重试次数
      initialDelayMs: 5000,          // 初始延迟（毫秒）
      backoffFactor: 1.5             // 退避因子
    },
    
    // 验证选项
    verification: {
      enabled: true,                 // 是否启用源码验证
      delay: 60000,                  // 验证前等待时间（毫秒）
      apiKey: undefined,             // 区块浏览器API密钥
      compilerVersion: undefined     // 编译器版本
    },
    
    // 部署记录
    records: {
      saveState: true,               // 是否保存状态
      exportAddresses: true,         // 是否导出地址
      exportAbi: true                // 是否导出ABI
    },
    
    // 安全选项
    safety: {
      dryRun: false,                 // 空运行（不实际部署）
      pauseBeforeDeployment: false,  // 部署前暂停
      confirmEachStep: false         // 每步确认
    }
  }
};

/**
 * 加载部署配置
 * @param {Object} customConfig 自定义配置（覆盖默认配置）
 * @returns {Object} 合并后的配置
 */
function loadDeploymentConfig(customConfig = {}) {
  // 确保配置管理器已初始化
  if (!configManager.isInitialized()) {
    try {
      configManager.initialize();
    } catch (error) {
      logger.error('配置管理器初始化失败:', error);
      throw error;
    }
  }
  
  // 获取当前网络环境
  const networkEnv = configManager.getNetworkEnv();
  
  // 尝试加载网络特定的部署配置
  let networkConfig = {};
  try {
    const networkConfigPath = path.join(__dirname, 'networks', `${networkEnv}.js`);
    if (fs.existsSync(networkConfigPath)) {
      networkConfig = require(networkConfigPath).deploymentConfig || {};
      logger.info(`已加载网络特定部署配置: ${networkEnv}`);
    }
  } catch (error) {
    logger.warn(`加载网络特定部署配置失败: ${error.message}`);
  }
  
  // 深度合并配置
  const mergedConfig = mergeConfigs(
    defaultDeploymentConfig, 
    networkConfig,
    customConfig
  );
  
  // 验证配置
  validateDeploymentConfig(mergedConfig);
  
  return mergedConfig;
}

/**
 * 深度合并配置对象
 * @param {...Object} configs 配置对象列表
 * @returns {Object} 合并后的配置
 */
function mergeConfigs(...configs) {
  return configs.reduce((merged, config) => {
    if (!config || typeof config !== 'object') return merged;
    
    const result = { ...merged };
    
    for (const [key, value] of Object.entries(config)) {
      // 如果值是对象且不是数组或函数，则递归合并
      if (value && typeof value === 'object' && !Array.isArray(value) && typeof value !== 'function') {
        result[key] = mergeConfigs(result[key] || {}, value);
      } else {
        // 否则直接覆盖
        result[key] = value;
      }
    }
    
    return result;
  }, {});
}

/**
 * 验证部署配置
 * @param {Object} config 部署配置
 * @throws {Error} 配置无效时抛出错误
 */
function validateDeploymentConfig(config) {
  // 检查部署策略
  if (!Object.values(DeploymentStrategy).includes(config.strategy)) {
    throw new Error(`无效的部署策略: ${config.strategy}`);
  }
  
  // 检查部署顺序
  if (!Array.isArray(config.deploymentOrder) || config.deploymentOrder.length === 0) {
    throw new Error('部署顺序必须是非空数组');
  }
  
  // 检查初始化参数
  for (const contractName of config.deploymentOrder) {
    if (!config.initializeParams[contractName]) {
      throw new Error(`缺少合约的初始化参数: ${contractName}`);
    }
  }
  
  logger.info('部署配置验证通过');
}

module.exports = {
  DeploymentStrategy,
  loadDeploymentConfig,
  validateDeploymentConfig,
  mergeConfigs
}; 