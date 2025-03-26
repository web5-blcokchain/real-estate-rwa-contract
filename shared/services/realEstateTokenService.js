const BaseContractService = require('./baseContractService');
const { ethers } = require('ethers');
const { ApiError } = require('../utils/errors');

/**
 * 房地产代币服务类
 * 处理与RealEstateToken合约的交互
 */
class RealEstateTokenService extends BaseContractService {
  /**
   * 创建房地产代币服务实例
   * @param {string} tokenAddress 代币合约地址
   */
  constructor(tokenAddress) {
    super('RealEstateToken', 'realEstateToken');
    this.tokenAddress = tokenAddress;
  }

  /**
   * 获取代币名称
   * @returns {Promise<string>} 代币名称
   */
  async getName() {
    return this.executeRead('name');
  }

  /**
   * 获取代币符号
   * @returns {Promise<string>} 代币符号
   */
  async getSymbol() {
    return this.executeRead('symbol');
  }

  /**
   * 获取代币精度
   * @returns {Promise<number>} 代币精度
   */
  async getDecimals() {
    return this.executeRead('decimals');
  }

  /**
   * 获取代币总供应量
   * @returns {Promise<string>} 总供应量
   */
  async getTotalSupply() {
    return this.executeRead('totalSupply');
  }

  /**
   * 获取账户余额
   * @param {string} account 账户地址
   * @returns {Promise<string>} 账户余额
   */
  async getBalance(account) {
    this.validateArgs([account], [addr => ethers.utils.isAddress(addr)]);
    return this.executeRead('balanceOf', [account]);
  }

  /**
   * 获取授权额度
   * @param {string} owner 所有者地址
   * @param {string} spender 授权者地址
   * @returns {Promise<string>} 授权额度
   */
  async getAllowance(owner, spender) {
    this.validateArgs(
      [owner, spender],
      [addr => ethers.utils.isAddress(addr), addr => ethers.utils.isAddress(addr)]
    );
    return this.executeRead('allowance', [owner, spender]);
  }

  /**
   * 转账
   * @param {string} to 接收地址
   * @param {number} amount 转账金额
   * @returns {Promise<Object>} 交易收据
   */
  async transfer(to, amount) {
    this.validateArgs(
      [to, amount],
      [addr => ethers.utils.isAddress(addr), amt => typeof amt === 'number' && amt > 0]
    );
    return this.executeWrite('transfer', [
      to,
      ethers.utils.parseUnits(amount.toString(), 18)
    ], { operationName: 'transfer' });
  }

  /**
   * 授权转账
   * @param {string} spender 授权地址
   * @param {number} amount 授权金额
   * @returns {Promise<Object>} 交易收据
   */
  async approve(spender, amount) {
    this.validateArgs(
      [spender, amount],
      [addr => ethers.utils.isAddress(addr), amt => typeof amt === 'number' && amt > 0]
    );
    return this.executeWrite('approve', [
      spender,
      ethers.utils.parseUnits(amount.toString(), 18)
    ], { operationName: 'approve' });
  }

  /**
   * 授权转账
   * @param {string} from 发送地址
   * @param {string} to 接收地址
   * @param {number} amount 转账金额
   * @returns {Promise<Object>} 交易收据
   */
  async transferFrom(from, to, amount) {
    this.validateArgs(
      [from, to, amount],
      [
        addr => ethers.utils.isAddress(addr),
        addr => ethers.utils.isAddress(addr),
        amt => typeof amt === 'number' && amt > 0
      ]
    );
    return this.executeWrite('transferFrom', [
      from,
      to,
      ethers.utils.parseUnits(amount.toString(), 18)
    ], { operationName: 'transferFrom' });
  }

  /**
   * 增加授权额度
   * @param {string} spender 授权地址
   * @param {number} addedValue 增加的金额
   * @returns {Promise<Object>} 交易收据
   */
  async increaseAllowance(spender, addedValue) {
    this.validateArgs(
      [spender, addedValue],
      [addr => ethers.utils.isAddress(addr), val => typeof val === 'number' && val > 0]
    );
    return this.executeWrite('increaseAllowance', [
      spender,
      ethers.utils.parseUnits(addedValue.toString(), 18)
    ], { operationName: 'increaseAllowance' });
  }

  /**
   * 减少授权额度
   * @param {string} spender 授权地址
   * @param {number} subtractedValue 减少的金额
   * @returns {Promise<Object>} 交易收据
   */
  async decreaseAllowance(spender, subtractedValue) {
    this.validateArgs(
      [spender, subtractedValue],
      [addr => ethers.utils.isAddress(addr), val => typeof val === 'number' && val > 0]
    );
    return this.executeWrite('decreaseAllowance', [
      spender,
      ethers.utils.parseUnits(subtractedValue.toString(), 18)
    ], { operationName: 'decreaseAllowance' });
  }

  /**
   * 获取代币暂停状态
   * @returns {Promise<boolean>} 是否暂停
   */
  async isPaused() {
    return this.executeRead('paused');
  }

  /**
   * 暂停代币
   * @returns {Promise<Object>} 交易收据
   */
  async pause() {
    return this.executeWrite('pause', [], { operationName: 'pause' });
  }

  /**
   * 恢复代币
   * @returns {Promise<Object>} 交易收据
   */
  async unpause() {
    return this.executeWrite('unpause', [], { operationName: 'unpause' });
  }
}

module.exports = RealEstateTokenService; 