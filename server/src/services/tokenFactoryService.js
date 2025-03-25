const { contractService } = require('../../../shared/utils/contractService');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 代币工厂服务
 * 封装TokenFactory合约的操作
 */
class TokenFactoryService {
  /**
   * 获取TokenFactory合约实例
   * @param {boolean} [withSigner=true] 是否使用签名者
   * @returns {ethers.Contract} 合约实例
   */
  static getContract(withSigner = true) {
    return contractService.getContract('TokenFactory', withSigner);
  }

  /**
   * 创建房产代币
   * @param {string} propertyId 房产ID
   * @param {string} name 代币名称
   * @param {string} symbol 代币符号
   * @param {number} decimals 小数位数
   * @param {string} maxSupply 最大供应量
   * @param {string} initialSupply 初始供应量
   * @param {string} initialHolder 初始持有者地址
   * @returns {Promise<object>} 交易收据和代币地址
   */
  static async createToken(propertyId, name, symbol, decimals, maxSupply, initialSupply, initialHolder) {
    try {
      logger.info(`Creating token for property ${propertyId} with name ${name} and symbol ${symbol}`);
      
      // 确保金额为字符串形式的BigNumber
      const maxSupplyBN = ethers.BigNumber.from(maxSupply).toString();
      const initialSupplyBN = ethers.BigNumber.from(initialSupply).toString();
      
      const contract = this.getContract();
      const receipt = await contractService.sendTransaction(contract, 'createToken', [
        propertyId,
        name,
        symbol,
        decimals,
        maxSupplyBN,
        initialSupplyBN,
        initialHolder
      ]);
      
      // 从事件中提取代币地址
      const tokenCreatedEvent = receipt.events.find(e => e.event === 'TokenCreated');
      if (!tokenCreatedEvent) {
        throw new Error('TokenCreated event not found in transaction receipt');
      }
      
      const tokenAddress = tokenCreatedEvent.args.tokenAddress;
      
      return {
        receipt,
        tokenAddress
      };
    } catch (error) {
      logger.error(`Failed to create token: ${error.message}`);
      throw ApiError.contractError(`Failed to create token: ${error.message}`);
    }
  }

  /**
   * 获取房产对应的代币地址
   * @param {string} propertyId 房产ID
   * @returns {Promise<string>} 代币地址
   */
  static async getRealEstateToken(propertyId) {
    try {
      const contract = this.getContract(false);
      return await contractService.callContractMethod(contract, 'RealEstateTokens', [propertyId]);
    } catch (error) {
      logger.error(`Failed to get property token: ${error.message}`);
      throw ApiError.contractError(`Failed to get property token: ${error.message}`);
    }
  }

  /**
   * 获取所有已创建的代币
   * @returns {Promise<Array<{propertyId: string, tokenAddress: string}>>} 代币列表
   */
  static async getAllTokens() {
    try {
      const contract = this.getContract(false);
      
      // 获取所有房产ID
      const propertyRegistry = contractService.getContract('PropertyRegistry', false);
      const propertyIds = await contractService.callContractMethod(propertyRegistry, 'getAllPropertyIds', []);
      
      // 并行获取所有代币地址
      const tokensPromises = propertyIds.map(async propertyId => {
        const tokenAddress = await this.getRealEstateToken(propertyId);
        return {
          propertyId,
          tokenAddress
        };
      });
      
      return await Promise.all(tokensPromises);
    } catch (error) {
      logger.error(`Failed to get all tokens: ${error.message}`);
      throw ApiError.contractError(`Failed to get all tokens: ${error.message}`);
    }
  }

  /**
   * 获取代币实现合约地址
   * @returns {Promise<string>} 实现合约地址
   */
  static async getTokenImplementation() {
    try {
      const contract = this.getContract(false);
      return await contractService.callContractMethod(contract, 'tokenImplementation', []);
    } catch (error) {
      logger.error(`Failed to get token implementation: ${error.message}`);
      throw ApiError.contractError(`Failed to get token implementation: ${error.message}`);
    }
  }

  /**
   * 更新代币实现合约地址
   * @param {string} newImplementation 新实现合约地址
   * @returns {Promise<object>} 交易收据
   */
  static async updateTokenImplementation(newImplementation) {
    try {
      logger.info(`Updating token implementation to ${newImplementation}`);
      const contract = this.getContract();
      return await contractService.sendTransaction(contract, 'updateTokenImplementation', [newImplementation]);
    } catch (error) {
      logger.error(`Failed to update token implementation: ${error.message}`);
      throw ApiError.contractError(`Failed to update token implementation: ${error.message}`);
    }
  }

  /**
   * 获取合约当前版本
   * @returns {Promise<number>} 版本号
   */
  static async getVersion() {
    try {
      const contract = this.getContract(false);
      const version = await contractService.callContractMethod(contract, 'version', []);
      return Number(version);
    } catch (error) {
      logger.error(`Failed to get version: ${error.message}`);
      throw ApiError.contractError(`Failed to get version: ${error.message}`);
    }
  }
}

module.exports = TokenFactoryService; 