/**
 * 配置模块
 * 集中管理所有配置项，从环境变量中获取配置或使用默认值
 */
const path = require('path');

module.exports = {
  /**
   * 日志配置
   */
  logger: {
    // 日志级别: error, warn, info, http, verbose, debug, silly
    level: process.env.LOG_LEVEL || 'info',
    
    // 日志目录，相对于项目根目录
    directory: process.env.LOG_DIR || path.join(__dirname, '../../logs'),
    
    // 单个日志文件最大大小
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    
    // 保留的日志文件数量
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
    
    // 是否同时输出到控制台
    console: process.env.LOG_CONSOLE !== 'false'
  },
  
  /**
   * 区块链网络配置
   */
  blockchain: {
    // 默认网络类型: localhost, testnet, mainnet
    defaultNetwork: process.env.BLOCKCHAIN_NETWORK || 'localhost',
    
    // 各网络RPC配置
    networks: {
      localhost: {
        rpcUrl: process.env.LOCALHOST_RPC_URL || 'http://localhost:8545'
      },
      testnet: {
        rpcUrl: process.env.TESTNET_RPC_URL
      },
      mainnet: {
        rpcUrl: process.env.MAINNET_RPC_URL
      }
    }
  },
  
  /**
   * 钱包配置
   */
  wallet: {
    // 默认钱包类型
    defaultKeyType: process.env.DEFAULT_KEY_TYPE || 'DEPLOYER'
  }
}; 