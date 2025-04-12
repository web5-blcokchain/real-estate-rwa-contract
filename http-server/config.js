/**
 * HTTP服务器配置文件
 * 从环境变量加载配置信息
 */
const { EnvUtils } = require('../common');

// 导出配置对象
module.exports = {
  // 服务器配置
  server: {
    port: EnvUtils.getPort() || 3000,
    host: EnvUtils.getHost() || 'localhost'
  },
  
  // 认证配置
  auth: {
    apiKey: EnvUtils.getApiKey() || '123456'
  },
  
  // 区块链配置
  blockchain: {
    network: EnvUtils.getCurrentNetwork(),
    rpcUrl: EnvUtils.getNetworkConfig().rpcUrl,
    
    // 不同角色的私钥
    privateKeys: {
      admin: EnvUtils.getNetworkConfig().privateKeys.admin,
      manager: EnvUtils.getNetworkConfig().privateKeys.manager,
      operator: EnvUtils.getNetworkConfig().privateKeys.operator,
      user: EnvUtils.getNetworkConfig().privateKeys.operator // 普通用户使用operator角色
    },
    
    // 合约地址
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
    level: EnvUtils.getLogLevel() || 'info',
    format: EnvUtils.getLogFormat() || 'json'
  },
  
  // Swagger API文档配置
  swagger: {
    title: '区块链房地产代币化系统 API',
    version: '1.0.0',
    description: '区块链房地产代币化系统的后端API文档，提供合约交互接口'
  }
}; 