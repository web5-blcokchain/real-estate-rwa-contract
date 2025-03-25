const { getSystemContract, sendTransaction, callContractMethod } = require('../../../shared/utils/blockchain');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');
const BaseContractService = require('./baseContractService');

/**
 * 租金分配服务
 * 负责与RentDistributor合约交互
 */
class RentDistributorService extends BaseContractService {
  constructor() {
    super('RentDistributor', 'rentDistributor');
  }
  
  /**
   * 获取所有租金分配记录
   * @returns {Promise<Array>} 租金分配记录列表
   */
  async getAllDistributions() {
    try {
      const count = await this.executeRead('getDistributionCount');
      
      // 获取所有分配ID
      const distributions = [];
      for (let i = 0; i < count; i++) {
        const id = await this.executeRead('distributionIds', [i]);
        
        // 获取分配详情
        const distribution = await this.getDistribution(id);
        if (distribution) {
          distributions.push(distribution);
        }
      }
      
      return distributions;
    } catch (error) {
      logger.error(`获取所有租金分配记录失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取租金分配记录
   * @param {string} distributionId 分配ID
   * @returns {Promise<object>} 分配记录
   */
  async getDistribution(distributionId) {
    try {
      const data = await this.executeRead('distributions', [distributionId]);
      
      // 如果分配不存在，返回null
      if (!data.exists) {
        return null;
      }
      
      return {
        distributionId,
        tokenAddress: data.token,
        amount: ethers.utils.formatEther(data.amount),
        propertyId: data.propertyId,
        snapshotId: data.snapshotId.toString(),
        distributor: data.distributor,
        claimedAmount: ethers.utils.formatEther(data.claimedAmount),
        rentPeriodStart: new Date(Number(data.rentPeriodStart) * 1000),
        rentPeriodEnd: new Date(Number(data.rentPeriodEnd) * 1000),
        distributedAt: new Date(Number(data.distributedAt) * 1000)
      };
    } catch (error) {
      logger.error(`获取租金分配记录失败 - distributionId: ${distributionId}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取指定账户可领取的租金
   * @param {string} distributionId 分配ID
   * @param {string} account 账户地址
   * @returns {Promise<string>} 可领取的租金金额
   */
  async getClaimableRent(distributionId, account) {
    try {
      const amount = await this.executeRead('getClaimableRent', [distributionId, account]);
      return ethers.utils.formatEther(amount);
    } catch (error) {
      logger.error(`获取可领取租金失败 - distributionId: ${distributionId}, account: ${account}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 分配租金
   * @param {object} distributionData 分配数据
   * @param {string} distributionData.tokenAddress 代币地址
   * @param {string} distributionData.amount 租金金额（ETH字符串，如"1.5"）
   * @param {string} distributionData.propertyId 房产ID
   * @param {string} [distributionData.snapshotId] 快照ID
   * @param {Date} distributionData.rentPeriodStart 租期开始时间
   * @param {Date} distributionData.rentPeriodEnd 租期结束时间
   * @returns {Promise<object>} 交易收据
   */
  async distributeRent(distributionData) {
    try {
      const {
        tokenAddress,
        amount,
        propertyId,
        snapshotId = 0,
        rentPeriodStart,
        rentPeriodEnd
      } = distributionData;
      
      // 转换金额为wei
      const amountInWei = ethers.utils.parseEther(amount);
      
      // 转换日期为Unix时间戳
      const startTimestamp = Math.floor(rentPeriodStart.getTime() / 1000);
      const endTimestamp = Math.floor(rentPeriodEnd.getTime() / 1000);
      
      logger.info(`准备分配租金 - tokenAddress: ${tokenAddress}, amount: ${amount} ETH, propertyId: ${propertyId}, 使用财务角色`);
      
      const receipt = await this.executeWrite(
        'distributeRent',
        [tokenAddress, amountInWei, propertyId, snapshotId, startTimestamp, endTimestamp],
        { 
          operationName: 'distributeRent',
          value: amountInWei // 发送ETH作为租金
        }
      );
      
      logger.info(`租金分配成功 - tokenAddress: ${tokenAddress}, amount: ${amount} ETH, txHash: ${receipt.transactionHash}`);
      
      // 从事件中获取分配ID
      const events = receipt.events || [];
      const rentDistributedEvent = events.find(e => e.event === 'RentDistributed');
      const distributionId = rentDistributedEvent ? rentDistributedEvent.args.distributionId : null;
      
      return {
        receipt,
        distributionId
      };
    } catch (error) {
      logger.error(`分配租金失败 - error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 清算未领取的租金
   * @param {string} distributionId 分配ID
   * @returns {Promise<object>} 交易收据
   */
  async liquidateUnclaimedRent(distributionId) {
    try {
      logger.info(`准备清算未领取租金 - distributionId: ${distributionId}, 使用财务角色`);
      
      const receipt = await this.executeWrite(
        'liquidateUnclaimedRent',
        [distributionId],
        { operationName: 'liquidateUnclaimedRent' }
      );
      
      logger.info(`未领取租金清算成功 - distributionId: ${distributionId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`清算未领取租金失败 - distributionId: ${distributionId}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 领取租金
   * @param {string} distributionId 分配ID
   * @returns {Promise<object>} 交易收据
   */
  async claimRent(distributionId) {
    try {
      logger.info(`准备领取租金 - distributionId: ${distributionId}`);
      
      const receipt = await this.executeWrite(
        'claimRent',
        [distributionId],
        { operationName: 'claimRent' }
      );
      
      logger.info(`租金领取成功 - distributionId: ${distributionId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`租金领取失败 - distributionId: ${distributionId}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 批量领取租金
   * @param {string[]} distributionIds 分配ID数组
   * @returns {Promise<object>} 交易收据
   */
  async batchClaimRent(distributionIds) {
    try {
      logger.info(`准备批量领取租金 - distributionIds: ${distributionIds.join(', ')}`);
      
      const receipt = await this.executeWrite(
        'batchClaimRent',
        [distributionIds],
        { operationName: 'batchClaimRent' }
      );
      
      logger.info(`批量租金领取成功 - distributionIds: ${distributionIds.join(', ')}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`批量租金领取失败 - distributionIds: ${distributionIds.join(', ')}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 根据房产ID获取租金分配记录
   * @param {string} propertyId 房产ID
   * @returns {Promise<Array>} 租金分配记录列表
   */
  async getDistributionsByPropertyId(propertyId) {
    try {
      // 获取所有分配记录
      const allDistributions = await this.getAllDistributions();
      
      // 过滤指定房产的分配记录
      return allDistributions.filter(distribution => distribution.propertyId === propertyId);
    } catch (error) {
      logger.error(`根据房产ID获取租金分配记录失败 - propertyId: ${propertyId}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 根据代币地址获取租金分配记录
   * @param {string} tokenAddress 代币地址
   * @returns {Promise<Array>} 租金分配记录列表
   */
  async getDistributionsByToken(tokenAddress) {
    try {
      // 获取所有分配记录
      const allDistributions = await this.getAllDistributions();
      
      // 过滤指定代币的分配记录
      return allDistributions.filter(distribution => 
        distribution.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
      );
    } catch (error) {
      logger.error(`根据代币地址获取租金分配记录失败 - tokenAddress: ${tokenAddress}, error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new RentDistributorService(); 