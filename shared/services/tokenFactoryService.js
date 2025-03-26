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
   * @param {string} tokenData.name 代币名称
   * @param {string} tokenData.symbol 代币符号
   * @param {number} tokenData.totalSupply 总供应量
   * @param {string} tokenData.propertyName 关联房产名称
   * @returns {Promise<Object>} 交易收据
   */
  async createToken(tokenData) {
    this.validateArgs(
      [tokenData.name, tokenData.symbol, tokenData.totalSupply, tokenData.propertyName],
      [
        name => typeof name === 'string' && name.length > 0,
        symbol => typeof symbol === 'string' && symbol.length > 0,
        supply => typeof supply === 'number' && supply > 0,
        propertyName => typeof propertyName === 'string' && propertyName.length > 0
      ]
    );

    return this.executeWrite('createToken', [
      tokenData.name,
      tokenData.symbol,
      ethers.utils.parseUnits(tokenData.totalSupply.toString(), 18),
      tokenData.propertyName
    ], { operationName: 'createToken' });
  }

  /**
   * 获取代币合约地址
   * @param {string} tokenName 代币名称
   * @returns {Promise<string>} 代币合约地址
   */
  async getTokenAddress(tokenName) {
    this.validateArgs([tokenName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeRead('getTokenAddress', [tokenName]);
  }

  /**
   * 检查代币是否存在
   * @param {string} tokenName 代币名称
   * @returns {Promise<boolean>} 是否存在
   */
  async tokenExists(tokenName) {
    this.validateArgs([tokenName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeRead('tokenExists', [tokenName]);
  }

  /**
   * 获取代币列表
   * @returns {Promise<Array>} 代币列表
   */
  async getTokenList() {
    return this.executeRead('getTokenList');
  }

  /**
   * 获取代币详情
   * @param {string} tokenName 代币名称
   * @returns {Promise<Object>} 代币详情
   */
  async getTokenDetails(tokenName) {
    this.validateArgs([tokenName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeRead('getTokenDetails', [tokenName]);
  }

  /**
   * 暂停代币
   * @param {string} tokenName 代币名称
   * @returns {Promise<Object>} 交易收据
   */
  async pauseToken(tokenName) {
    this.validateArgs([tokenName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeWrite('pauseToken', [tokenName], { operationName: 'pauseToken' });
  }

  /**
   * 恢复代币
   * @param {string} tokenName 代币名称
   * @returns {Promise<Object>} 交易收据
   */
  async unpauseToken(tokenName) {
    this.validateArgs([tokenName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeWrite('unpauseToken', [tokenName], { operationName: 'unpauseToken' });
  }
}

module.exports = TokenFactoryService; 