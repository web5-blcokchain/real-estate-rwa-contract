/**
 * HTTP服务器配置文件
 * 从环境变量加载配置信息
 */
const { EnvUtils } = require('../common');

// 获取当前网络配置
const networkConfig = EnvUtils.getNetworkConfig();


// 导出配置对象
module.exports = {
  // 服务器配置
  server: {
    port: EnvUtils.getNumber('PORT', 3000),
    host: EnvUtils.getString('HOST', 'localhost')
  },
  
  // 认证配置
  auth: {
    apiKey: EnvUtils.getString('API_KEY', '123456')
  },
  
  // 区块链配置
  blockchain: {
    network: EnvUtils.getCurrentNetwork(),
    rpcUrl: networkConfig.rpcUrl,
    
    // 不同角色的私钥
    privateKeys: networkConfig.privateKeys || {
      admin: '',
      manager: '',
      operator: '',
      user: ''
    },
    
    // 合约地址 - 使用EnvUtils直接获取
    contracts: {
      RealEstateFacade: EnvUtils.getContractAddress('RealEstateFacade'),
      PropertyManager: EnvUtils.getContractAddress('PropertyManager'),
      PropertyToken: EnvUtils.getContractAddress('PropertyToken'),
      TradingManager: EnvUtils.getContractAddress('TradingManager'),
      RewardManager: EnvUtils.getContractAddress('RewardManager')
    }
  },
  
  // 日志配置
  logger: {
    level: EnvUtils.getString('LOG_LEVEL', 'info'),
    format: EnvUtils.getString('LOG_FORMAT', 'json')
  },
  
  // Swagger API文档配置
  swagger: {
    title: '区块链房地产代币化系统 API',
    version: '1.0.0',
    description: '区块链房地产代币化系统的后端API文档，提供合约交互接口'
  }
}; 