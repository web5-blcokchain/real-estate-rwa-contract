/**
 * 部署配置管理器
 * 设置系统部署参数
 */
const { getEnvVar } = require('./environment');
const logger = require('../utils/logger').getLogger('deployConfig');

/**
 * 部署配置
 */
const deployConfig = {
  // 是否强制重新部署合约（即使已经存在）
  forceRedeploy: process.env.FORCE_REDEPLOY === 'true' || false,
  
  // 是否在部署后验证合约
  verifyContracts: process.env.VERIFY_CONTRACTS === 'true' || false,
  
  // 默认gas限制
  defaultGasLimit: parseInt(process.env.DEFAULT_GAS_LIMIT || '6000000'),
  
  // 每次部署尝试的最大次数
  maxRetryCount: parseInt(process.env.MAX_RETRY_COUNT || '3'),
  
  // 重试间隔（毫秒）
  retryInterval: parseInt(process.env.RETRY_INTERVAL || '5000'),
  
  // 部署状态保存路径
  deployStatePath: process.env.DEPLOY_STATE_PATH || './deploy-state.json',
  
  // 部署超时（毫秒）
  deployTimeout: parseInt(process.env.DEPLOY_TIMEOUT || '300000'),
  
  // 默认钱包私钥环境变量名称
  defaultPrivateKeyEnvName: 'PRIVATE_KEY',
  
  // 初始化RoleManager时的默认管理员地址
  defaultAdmin: process.env.DEFAULT_ADMIN_ADDRESS,
  
  // 系统部署配置
  system: {
    // 系统部署步骤超时（毫秒）
    stepTimeout: parseInt(process.env.SYSTEM_STEP_TIMEOUT || '180000'),
    
    // 系统验证步骤超时（毫秒）
    validationTimeout: parseInt(process.env.SYSTEM_VALIDATION_TIMEOUT || '60000'),
    
    // 系统部署批次大小
    batchSize: parseInt(process.env.SYSTEM_BATCH_SIZE || '3')
  },
  
  // 网络特定配置
  networks: {
    hardhat: {
      gasMultiplier: 1.2,
      confirmations: 1
    },
    bsc_testnet: {
      gasMultiplier: 1.5,
      confirmations: 3
    },
    bsc_mainnet: {
      gasMultiplier: 1.2,
      confirmations: 5
    }
  },
  
  /**
   * 获取特定网络的配置
   * @param {string} networkName 网络名称
   * @returns {Object} 网络配置
   */
  getNetworkConfig(networkName) {
    return this.networks[networkName] || this.networks.hardhat;
  }
};

// 如果没有设置默认管理员，使用部署者地址
if (!deployConfig.defaultAdmin) {
  logger.warn('未设置默认管理员地址 (DEFAULT_ADMIN_ADDRESS)，将使用部署者地址作为系统管理员');
}

// 导出配置
module.exports = deployConfig; 