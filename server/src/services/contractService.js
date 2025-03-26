/**
 * 导出shared目录下的合约服务
 * 这个文件作为兼容性层，以便在不破坏现有代码的情况下过渡到共享服务
 */

const { contractService, ContractService } = require('@shared/utils/contractService');
const { logger } = require('@shared/utils/logger');

// 导出单例实例
module.exports = {
  tokenFactory: contractService.getTokenFactory(),
  propertyRegistry: contractService.getPropertyRegistry(),
  getToken: (tokenAddress) => contractService.getToken(tokenAddress),
  
  // 为向后兼容性暴露整个contractService实例
  contractService,
  ContractService
}; 