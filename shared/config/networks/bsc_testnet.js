/**
 * BSC测试网配置
 */
const { DeploymentStrategy } = require('../deployment');

// 部署配置
const deploymentConfig = {
  // 使用UUPS代理模式
  strategy: DeploymentStrategy.UPGRADEABLE,
  
  // 事务选项
  options: {
    transaction: {
      gasLimitMultiplier: 2.0,  // BSC测试网需要更高的gas限制
      waitConfirmations: 3      // 等待更多确认
    },
    
    // 重试选项
    retry: {
      maxRetries: 5,           // 增加重试次数
      initialDelayMs: 10000    // 增加初始延迟
    },
    
    // 验证选项
    verification: {
      enabled: true,
      delay: 90000,            // 在BSCscan上验证前等待更长时间
      apiKey: process.env.BSCSCAN_API_KEY || ''
    }
  }
};

module.exports = {
  // 网络特定配置
  url: process.env.BSC_TESTNET_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
  chainId: 97,
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  
  // gas配置
  gasPrice: 20000000000,  // 20 Gwei
  
  // 区块浏览器设置
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY || ''
  },
  
  // 导出部署配置
  deploymentConfig
}; 