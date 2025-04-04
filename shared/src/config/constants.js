/**
 * 系统常量定义
 * 提供全系统统一的常量值引用
 */
const { ENV_KEYS } = require('./env');

/**
 * 合约名称常量
 * 用于统一合约名称的引用方式
 */
const CONTRACT_NAMES = {
  // 核心合约
  FACADE: 'Facade',                      // 外观合约（主入口）
  PROPERTY_TOKEN: 'PropertyToken',       // 房产通证
  PROPERTY_REGISTRY: 'PropertyRegistry', // 房产登记
  
  // 管理合约
  PROPERTY_MANAGER: 'PropertyManager',     // 房产管理
  TRADING_MANAGER: 'TradingManager',       // 交易管理
  REWARD_MANAGER: 'RewardManager',         // 奖励管理
  DISTRIBUTION_MANAGER: 'DistributionManager', // 分配管理
  ORDER_MANAGER: 'OrderManager',           // 订单管理
  
  // 代理合约
  PROXY_ADMIN: 'ProxyAdmin',               // 代理管理
  TRANSPARENT_PROXY: 'TransparentProxy',   // 透明代理
  
  // 辅助合约
  ACCESS_CONTROL: 'AccessControl',         // 访问控制
  REAL_ESTATE_FACADE: 'RealEstateFacade',  // 房地产外观
  
  // 测试合约
  SIMPLE_ERC20: 'SimpleERC20',             // 简单ERC20代币
  MOCK_TOKEN: 'MockToken'                  // 模拟代币
};

/**
 * 网络类型常量
 */
const NETWORK_TYPES = {
  LOCAL: 'localhost',
  TESTNET: 'testnet',
  MAINNET: 'mainnet'
};

/**
 * 钱包类型常量
 * 对应于EnvConfig.KEY_TYPES中的键
 */
const WALLET_TYPES = {
  ADMIN: 'ADMIN',
  DEPLOYER: 'DEPLOYER',
  SERVICE: 'SERVICE',
  OPERATOR: 'OPERATOR',
  DEFAULT: 'DEFAULT'
};

/**
 * 日志级别常量
 */
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
};

/**
 * 交易状态常量
 */
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed'
};

/**
 * 房产状态常量
 */
const PROPERTY_STATUS = {
  REGISTERED: 'registered',
  TOKENIZED: 'tokenized',
  TRADING: 'trading',
  FROZEN: 'frozen'
};

// 导出所有常量
module.exports = {
  CONTRACT_NAMES,
  NETWORK_TYPES,
  WALLET_TYPES,
  LOG_LEVELS,
  TRANSACTION_STATUS,
  PROPERTY_STATUS,
  ENV_KEYS
}; 