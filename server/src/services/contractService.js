const TokenFactoryService = require('../../../shared/services/tokenFactoryService');
const PropertyRegistryService = require('../../../shared/services/propertyRegistryService');
const RealEstateTokenService = require('../../../shared/services/realEstateTokenService');
const logger = require('../utils/logger');

// 创建服务实例
const tokenFactoryService = new TokenFactoryService();
const propertyRegistryService = new PropertyRegistryService();

// 导出服务实例
module.exports = {
  tokenFactory: tokenFactoryService,
  propertyRegistry: propertyRegistryService,
  getToken: (tokenAddress) => new RealEstateTokenService(tokenAddress)
}; 