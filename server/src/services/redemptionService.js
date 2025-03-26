const BaseContractService = require('./baseContractService');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 赎回服务
 * 负责与Redemption合约交互
 */
class RedemptionService extends BaseContractService {
  constructor() {
    super('Redemption', 'redemption');
  }
  
  /**
   * 获取赎回信息
   * @param {string} redemptionId 赎回ID
   * @returns {Promise<object>} 赎回信息
   */
  async getRedemption(redemptionId) {
    try {
      if (!redemptionId) {
        throw new ApiError(400, '赎回ID不能为空');
      }
      
      const redemptionData = await this.executeRead('redemptions', [redemptionId]);
      const { exists, propertyId, tokenId, amount, status, createdAt, updatedAt } = redemptionData;
      
      // 如果赎回不存在，返回null
      if (!exists) {
        return null;
      }
      
      return {
        redemptionId,
        propertyId,
        tokenId,
        amount: ethers.utils.formatEther(amount),
        status,
        createdAt: new Date(Number(createdAt) * 1000),
        updatedAt: new Date(Number(updatedAt) * 1000),
        exists
      };
    } catch (error) {
      logger.error(`获取赎回信息失败 - redemptionId: ${redemptionId}, error: ${error.message}`);
      throw new ApiError(500, '获取赎回信息失败', error.message);
    }
  }
  
  /**
   * 创建赎回
   * @param {string} propertyId 房产ID
   * @param {string} tokenId 代币ID
   * @param {string} amount 赎回金额
   * @returns {Promise<object>} 交易收据
   */
  async createRedemption(propertyId, tokenId, amount) {
    try {
      if (!propertyId || !tokenId || !amount) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 检查金额是否有效
      const amountWei = ethers.utils.parseEther(amount);
      if (amountWei.lte(0)) {
        throw new ApiError(400, '赎回金额必须大于0');
      }
      
      const receipt = await this.executeWrite(
        'createRedemption',
        [propertyId, tokenId, amountWei],
        { operationName: 'createRedemption' }
      );
      
      logger.info(`赎回创建成功 - propertyId: ${propertyId}, tokenId: ${tokenId}, amount: ${amount}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`赎回创建失败 - propertyId: ${propertyId}, tokenId: ${tokenId}, amount: ${amount}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '赎回创建失败', error.message);
    }
  }
  
  /**
   * 处理赎回
   * @param {string} redemptionId 赎回ID
   * @param {boolean} approved 是否批准
   * @returns {Promise<object>} 交易收据
   */
  async processRedemption(redemptionId, approved) {
    try {
      if (!redemptionId) {
        throw new ApiError(400, '赎回ID不能为空');
      }
      
      // 检查赎回是否存在
      const redemption = await this.getRedemption(redemptionId);
      if (!redemption) {
        throw new ApiError(404, '赎回不存在');
      }
      
      // 检查赎回状态
      if (redemption.status !== 0) {
        throw new ApiError(400, '赎回已处理');
      }
      
      const receipt = await this.executeWrite(
        'processRedemption',
        [redemptionId, approved],
        { operationName: 'processRedemption' }
      );
      
      logger.info(`赎回处理成功 - redemptionId: ${redemptionId}, approved: ${approved}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`赎回处理失败 - redemptionId: ${redemptionId}, approved: ${approved}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '赎回处理失败', error.message);
    }
  }
  
  /**
   * 获取赎回状态
   * @param {string} redemptionId 赎回ID
   * @returns {Promise<number>} 状态码 (0=Pending, 1=Approved, 2=Rejected)
   */
  async getRedemptionStatus(redemptionId) {
    try {
      if (!redemptionId) {
        throw new ApiError(400, '赎回ID不能为空');
      }
      
      const redemption = await this.executeRead('redemptions', [redemptionId]);
      
      if (!redemption.exists) {
        throw new ApiError(404, '赎回不存在');
      }
      
      return Number(redemption.status);
    } catch (error) {
      logger.error(`获取赎回状态失败 - redemptionId: ${redemptionId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '获取赎回状态失败', error.message);
    }
  }
}

module.exports = new RedemptionService(); 