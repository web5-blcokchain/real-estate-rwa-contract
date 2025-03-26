const TokenFactoryService = require('./tokenFactoryService');
const PropertyRegistryService = require('./propertyRegistryService');
const RealEstateTokenService = require('./realEstateTokenService');
const { logger } = require('../utils/logger');

/**
 * 合约服务工厂类
 * 管理所有合约服务实例
 */
class ContractServiceFactory {
  constructor() {
    this._instances = new Map();
  }

  /**
   * 获取或创建服务实例
   * @param {string} serviceName 服务名称
   * @param {Function} ServiceClass 服务类
   * @returns {BaseContractService} 服务实例
   */
  _getOrCreateInstance(serviceName, ServiceClass) {
    if (!this._instances.has(serviceName)) {
      logger.info(`Creating new instance of ${serviceName}`);
      this._instances.set(serviceName, new ServiceClass());
    }
    return this._instances.get(serviceName);
  }

  /**
   * 获取TokenFactory服务实例
   * @returns {TokenFactoryService} TokenFactory服务实例
   */
  getTokenFactoryService() {
    return this._getOrCreateInstance('TokenFactory', TokenFactoryService);
  }

  /**
   * 获取PropertyRegistry服务实例
   * @returns {PropertyRegistryService} PropertyRegistry服务实例
   */
  getPropertyRegistryService() {
    return this._getOrCreateInstance('PropertyRegistry', PropertyRegistryService);
  }

  /**
   * 获取RealEstateToken服务实例
   * @param {string} tokenAddress 代币合约地址
   * @returns {RealEstateTokenService} RealEstateToken服务实例
   */
  getRealEstateTokenService(tokenAddress) {
    const key = `RealEstateToken_${tokenAddress}`;
    if (!this._instances.has(key)) {
      logger.info(`Creating new RealEstateToken service instance for ${tokenAddress}`);
      this._instances.set(key, new RealEstateTokenService(tokenAddress));
    }
    return this._instances.get(key);
  }

  /**
   * 清除所有服务实例
   */
  clearInstances() {
    logger.info('Clearing all service instances');
    this._instances.clear();
  }
}

// 创建单例实例
const contractServiceFactory = new ContractServiceFactory();

module.exports = contractServiceFactory; 