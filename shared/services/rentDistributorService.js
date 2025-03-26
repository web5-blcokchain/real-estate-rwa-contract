const BaseContractService = require('./baseContractService');
const { ethers } = require('ethers');
const { ApiError } = require('../utils/errors');

/**
 * 租金分配服务类
 * 处理与RentDistributor合约的交互
 */
class RentDistributorService extends BaseContractService {
  constructor() {
    super('RentDistributor');
  }

  /**
   * 创建租金分配
   * @param {Object} distributionData 分配数据
   * @param {string} distributionData.tokenAddress 代币地址
   * @param {number} distributionData.amount 分配金额
   * @param {string} distributionData.description 分配描述
   * @returns {Promise<Object>} 交易收据
   */
  async createDistribution(distributionData) {
    this.validateArgs(
      [distributionData.tokenAddress, distributionData.amount, distributionData.description],
      [
        addr => ethers.utils.isAddress(addr),
        amt => typeof amt === 'number' && amt > 0,
        desc => typeof desc === 'string' && desc.length > 0
      ]
    );

    return this.executeWrite('createDistribution', [
      distributionData.tokenAddress,
      ethers.utils.parseUnits(distributionData.amount.toString(), 18),
      distributionData.description
    ], { operationName: 'createDistribution' });
  }

  /**
   * 分配租金
   * @param {string} distributionId 分配ID
   * @returns {Promise<Object>} 交易收据
   */
  async distributeRent(distributionId) {
    this.validateArgs([distributionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeWrite('distributeRent', [distributionId], { operationName: 'distributeRent' });
  }

  /**
   * 领取租金
   * @param {string} distributionId 分配ID
   * @returns {Promise<Object>} 交易收据
   */
  async claimRent(distributionId) {
    this.validateArgs([distributionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeWrite('claimRent', [distributionId], { operationName: 'claimRent' });
  }

  /**
   * 清算未领取的租金
   * @param {string} distributionId 分配ID
   * @returns {Promise<Object>} 交易收据
   */
  async liquidateUnclaimedRent(distributionId) {
    this.validateArgs([distributionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeWrite('liquidateUnclaimedRent', [distributionId], { operationName: 'liquidateUnclaimedRent' });
  }

  /**
   * 获取分配详情
   * @param {string} distributionId 分配ID
   * @returns {Promise<Object>} 分配详情
   */
  async getDistribution(distributionId) {
    this.validateArgs([distributionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeRead('getDistribution', [distributionId]);
  }

  /**
   * 获取分配列表
   * @returns {Promise<Array>} 分配列表
   */
  async getDistributionList() {
    return this.executeRead('getDistributionList');
  }

  /**
   * 获取可领取的租金金额
   * @param {string} distributionId 分配ID
   * @param {string} account 账户地址
   * @returns {Promise<string>} 可领取金额
   */
  async getClaimableAmount(distributionId, account) {
    this.validateArgs(
      [distributionId, account],
      [id => typeof id === 'string' && id.length > 0, addr => ethers.utils.isAddress(addr)]
    );
    return this.executeRead('getClaimableAmount', [distributionId, account]);
  }

  /**
   * 检查是否已领取租金
   * @param {string} distributionId 分配ID
   * @param {string} account 账户地址
   * @returns {Promise<boolean>} 是否已领取
   */
  async hasClaimed(distributionId, account) {
    this.validateArgs(
      [distributionId, account],
      [id => typeof id === 'string' && id.length > 0, addr => ethers.utils.isAddress(addr)]
    );
    return this.executeRead('hasClaimed', [distributionId, account]);
  }

  /**
   * 获取分配状态
   * @param {string} distributionId 分配ID
   * @returns {Promise<number>} 状态码
   */
  async getDistributionStatus(distributionId) {
    this.validateArgs([distributionId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeRead('getDistributionStatus', [distributionId]);
  }
}

module.exports = RentDistributorService; 