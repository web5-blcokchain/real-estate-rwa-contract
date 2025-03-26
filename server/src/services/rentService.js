const BaseContractService = require('./baseContractService');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 租金服务
 * 负责与Rent合约交互
 */
class RentService extends BaseContractService {
  constructor() {
    super('Rent', 'rent');
  }
  
  /**
   * 获取租金信息
   * @param {string} rentId 租金ID
   * @returns {Promise<object>} 租金信息
   */
  async getRent(rentId) {
    try {
      if (!rentId) {
        throw new ApiError(400, '租金ID不能为空');
      }
      
      const rentData = await this.executeRead('rents', [rentId]);
      const { exists, propertyId, tenant, amount, startTime, endTime, status, createdAt, updatedAt } = rentData;
      
      // 如果租金不存在，返回null
      if (!exists) {
        return null;
      }
      
      return {
        rentId,
        propertyId,
        tenant,
        amount: ethers.utils.formatEther(amount),
        startTime: new Date(Number(startTime) * 1000),
        endTime: new Date(Number(endTime) * 1000),
        status,
        createdAt: new Date(Number(createdAt) * 1000),
        updatedAt: new Date(Number(updatedAt) * 1000),
        exists
      };
    } catch (error) {
      logger.error(`获取租金信息失败 - rentId: ${rentId}, error: ${error.message}`);
      throw new ApiError(500, '获取租金信息失败', error.message);
    }
  }
  
  /**
   * 创建租金
   * @param {string} propertyId 房产ID
   * @param {string} tenant 租户地址
   * @param {string} amount 租金金额
   * @param {Date} startTime 开始时间
   * @param {Date} endTime 结束时间
   * @returns {Promise<object>} 交易收据
   */
  async createRent(propertyId, tenant, amount, startTime, endTime) {
    try {
      if (!propertyId || !tenant || !amount || !startTime || !endTime) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 检查租户地址是否有效
      if (!ethers.utils.isAddress(tenant)) {
        throw new ApiError(400, '无效的租户地址');
      }
      
      // 检查金额是否有效
      const amountWei = ethers.utils.parseEther(amount);
      if (amountWei.lte(0)) {
        throw new ApiError(400, '租金金额必须大于0');
      }
      
      // 检查时间是否有效
      const startTimestamp = Math.floor(startTime.getTime() / 1000);
      const endTimestamp = Math.floor(endTime.getTime() / 1000);
      
      if (startTimestamp >= endTimestamp) {
        throw new ApiError(400, '结束时间必须大于开始时间');
      }
      
      const receipt = await this.executeWrite(
        'createRent',
        [propertyId, tenant, amountWei, startTimestamp, endTimestamp],
        { operationName: 'createRent' }
      );
      
      logger.info(`租金创建成功 - propertyId: ${propertyId}, tenant: ${tenant}, amount: ${amount}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`租金创建失败 - propertyId: ${propertyId}, tenant: ${tenant}, amount: ${amount}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '租金创建失败', error.message);
    }
  }
  
  /**
   * 支付租金
   * @param {string} rentId 租金ID
   * @param {string} amount 支付金额
   * @returns {Promise<object>} 交易收据
   */
  async payRent(rentId, amount) {
    try {
      if (!rentId || !amount) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 检查金额是否有效
      const amountWei = ethers.utils.parseEther(amount);
      if (amountWei.lte(0)) {
        throw new ApiError(400, '支付金额必须大于0');
      }
      
      // 检查租金是否存在
      const rent = await this.getRent(rentId);
      if (!rent) {
        throw new ApiError(404, '租金不存在');
      }
      
      // 检查租金状态
      if (rent.status === 2) {
        throw new ApiError(400, '租金已支付');
      }
      
      const receipt = await this.executeWrite(
        'payRent',
        [rentId, amountWei],
        { operationName: 'payRent' }
      );
      
      logger.info(`租金支付成功 - rentId: ${rentId}, amount: ${amount}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`租金支付失败 - rentId: ${rentId}, amount: ${amount}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '租金支付失败', error.message);
    }
  }
  
  /**
   * 获取租金状态
   * @param {string} rentId 租金ID
   * @returns {Promise<number>} 状态码 (0=Pending, 1=Active, 2=Paid, 3=Cancelled)
   */
  async getRentStatus(rentId) {
    try {
      if (!rentId) {
        throw new ApiError(400, '租金ID不能为空');
      }
      
      const rent = await this.executeRead('rents', [rentId]);
      
      if (!rent.exists) {
        throw new ApiError(404, '租金不存在');
      }
      
      return Number(rent.status);
    } catch (error) {
      logger.error(`获取租金状态失败 - rentId: ${rentId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '获取租金状态失败', error.message);
    }
  }
  
  /**
   * 取消租金
   * @param {string} rentId 租金ID
   * @returns {Promise<object>} 交易收据
   */
  async cancelRent(rentId) {
    try {
      if (!rentId) {
        throw new ApiError(400, '租金ID不能为空');
      }
      
      // 检查租金是否存在
      const rent = await this.getRent(rentId);
      if (!rent) {
        throw new ApiError(404, '租金不存在');
      }
      
      // 检查租金状态
      if (rent.status === 3) {
        throw new ApiError(400, '租金已取消');
      }
      
      const receipt = await this.executeWrite(
        'setRentStatus',
        [rentId, 3], // status 3 = Cancelled
        { operationName: 'cancelRent' }
      );
      
      logger.info(`租金取消成功 - rentId: ${rentId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`租金取消失败 - rentId: ${rentId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '租金取消失败', error.message);
    }
  }
}

module.exports = new RentService(); 