const BaseContractService = require('./baseContractService');
const { ethers } = require('ethers');
const { ApiError } = require('../utils/errors');

/**
 * 赎回管理服务类
 * 处理与RedemptionManager合约的交互
 */
class RedemptionManagerService extends BaseContractService {
  constructor() {
    super('RedemptionManager');
  }

  /**
   * 创建赎回请求
   * @param {Object} redemptionData 赎回数据
   * @param {string} redemptionData.tokenAddress 代币地址
   * @param {number} redemptionData.amount 赎回金额
   * @param {string} redemptionData.reason 赎回原因
   * @returns {Promise<Object>} 交易收据
   */
  async createRedemption(redemptionData) {
    this.validateArgs(
      [redemptionData.tokenAddress, redemptionData.amount, redemptionData.reason],
      [
        addr => ethers.utils.isAddress(addr),
        amt => typeof amt === 'number' && amt > 0,
        reason => typeof reason === 'string' && reason.length > 0
      ]
    );

    return this.executeWrite('createRedemption', [
      redemptionData.tokenAddress,
      ethers.utils.parseUnits(redemptionData.amount.toString(), 18),
      redemptionData.reason
    ], { operationName: 'createRedemption' });
  }

  /**
   * 批准赎回请求
   * @param {string} redemptionId 赎回ID
   * @returns {Promise<Object>} 交易收据
   */
  async approveRedemption(redemptionId) {
    this.validateArgs([redemptionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeWrite('approveRedemption', [redemptionId], { operationName: 'approveRedemption' });
  }

  /**
   * 拒绝赎回请求
   * @param {string} redemptionId 赎回ID
   * @param {string} reason 拒绝原因
   * @returns {Promise<Object>} 交易收据
   */
  async rejectRedemption(redemptionId, reason) {
    this.validateArgs(
      [redemptionId, reason],
      [id => typeof id === 'string' && id.length > 0, r => typeof r === 'string' && r.length > 0]
    );
    return this.executeWrite('rejectRedemption', [redemptionId, reason], { operationName: 'rejectRedemption' });
  }

  /**
   * 执行赎回
   * @param {string} redemptionId 赎回ID
   * @returns {Promise<Object>} 交易收据
   */
  async executeRedemption(redemptionId) {
    this.validateArgs([redemptionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeWrite('executeRedemption', [redemptionId], { operationName: 'executeRedemption' });
  }

  /**
   * 取消赎回请求
   * @param {string} redemptionId 赎回ID
   * @returns {Promise<Object>} 交易收据
   */
  async cancelRedemption(redemptionId) {
    this.validateArgs([redemptionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeWrite('cancelRedemption', [redemptionId], { operationName: 'cancelRedemption' });
  }

  /**
   * 获取赎回详情
   * @param {string} redemptionId 赎回ID
   * @returns {Promise<Object>} 赎回详情
   */
  async getRedemption(redemptionId) {
    this.validateArgs([redemptionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeRead('getRedemption', [redemptionId]);
  }

  /**
   * 获取赎回列表
   * @returns {Promise<Array>} 赎回列表
   */
  async getRedemptionList() {
    return this.executeRead('getRedemptionList');
  }

  /**
   * 获取用户的赎回列表
   * @param {string} account 账户地址
   * @returns {Promise<Array>} 赎回列表
   */
  async getUserRedemptions(account) {
    this.validateArgs([account], [addr => ethers.utils.isAddress(addr)]);
    return this.executeRead('getUserRedemptions', [account]);
  }

  /**
   * 获取赎回状态
   * @param {string} redemptionId 赎回ID
   * @returns {Promise<number>} 状态码
   */
  async getRedemptionStatus(redemptionId) {
    this.validateArgs([redemptionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeRead('getRedemptionStatus', [redemptionId]);
  }

  /**
   * 检查赎回是否可执行
   * @param {string} redemptionId 赎回ID
   * @returns {Promise<boolean>} 是否可执行
   */
  async canExecuteRedemption(redemptionId) {
    this.validateArgs([redemptionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeRead('canExecuteRedemption', [redemptionId]);
  }
}

module.exports = RedemptionManagerService; 