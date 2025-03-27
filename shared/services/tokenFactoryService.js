const BaseContractService = require('./baseContractService');
const { ethers } = require('ethers');
const { ApiError } = require('../utils/errors');

/**
 * 代币工厂服务类
 * 处理与TokenFactory合约的交互
 */
class TokenFactoryService extends BaseContractService {
  constructor() {
    super('TokenFactory');
  }

  /**
   * 创建新代币
   * @param {Object} tokenData 代币数据
   * @param {string} tokenData.propertyId 关联房产ID
   * @param {string} tokenData.name 代币名称
   * @param {string} tokenData.symbol 代币符号
   * @param {number} tokenData.initialSupply 初始供应量
   * @returns {Promise<Object>} 交易收据
   */
  async createToken(tokenData) {
    this.validateArgs(
      [tokenData.propertyId, tokenData.name, tokenData.symbol, tokenData.initialSupply],
      [
        propertyId => typeof propertyId === 'string' && propertyId.length > 0,
        name => typeof name === 'string' && name.length > 0,
        symbol => typeof symbol === 'string' && symbol.length > 0,
        supply => typeof supply === 'number' && supply > 0
      ]
    );

    const initialSupply = ethers.parseUnits(tokenData.initialSupply.toString(), 18);

    return this.executeWrite('createSingleToken', [
      tokenData.name,
      tokenData.symbol,
      tokenData.propertyId,
      initialSupply
    ], { operationName: 'createToken' });
  }

  /**
   * 获取代币合约地址
   * @param {string} propertyId 房产ID
   * @returns {Promise<string>} 代币合约地址
   */
  async getTokenAddress(propertyId) {
    this.validateArgs([propertyId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeRead('getTokenAddress', [propertyId]);
  }

  /**
   * 检查代币是否存在
   * @param {string} propertyId 房产ID
   * @returns {Promise<boolean>} 是否存在
   */
  async tokenExists(propertyId) {
    this.validateArgs([propertyId], [id => typeof id === 'string' && id.length > 0]);
    const address = await this.getTokenAddress(propertyId);
    return address !== ethers.ZeroAddress;
  }

  /**
   * 获取代币列表
   * @returns {Promise<Array>} 代币列表
   */
  async getTokenList() {
    return this.executeRead('getAllTokens');
  }

  /**
   * 获取代币数量
   * @returns {Promise<number>} 代币数量
   */
  async getTokenCount() {
    return this.executeRead('getTokenCount');
  }

  /**
   * 获取代币信息
   * @param {string} propertyId 房产ID
   * @returns {Promise<string>} 代币合约地址
   */
  async getTokenByProperty(propertyId) {
    this.validateArgs([propertyId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeRead('getTokenAddress', [propertyId]);
  }

  /**
   * 暂停代币
   * @param {string} tokenAddress 代币合约地址
   * @returns {Promise<Object>} 交易收据
   */
  async pauseToken(tokenAddress) {
    this.validateArgs([tokenAddress], [addr => ethers.isAddress(addr)]);
    return this.executeWrite('pauseToken', [tokenAddress], { operationName: 'pauseToken' });
  }

  /**
   * 恢复代币
   * @param {string} tokenAddress 代币合约地址
   * @returns {Promise<Object>} 交易收据
   */
  async unpauseToken(tokenAddress) {
    this.validateArgs([tokenAddress], [addr => ethers.isAddress(addr)]);
    return this.executeWrite('unpauseToken', [tokenAddress], { operationName: 'unpauseToken' });
  }
}

module.exports = TokenFactoryService; 