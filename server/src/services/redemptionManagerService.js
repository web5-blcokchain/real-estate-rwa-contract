const { getSystemContract, sendTransaction, callContractMethod } = require('../utils/blockchain');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 赎回管理服务
 * 封装RedemptionManager合约的操作
 */
class RedemptionManagerService {
  /**
   * 获取RedemptionManager合约实例
   * @param {boolean} [withSigner=true] 是否使用签名者
   * @returns {ethers.Contract} 合约实例
   */
  static getContract(withSigner = true) {
    return getSystemContract('RedemptionManager', withSigner);
  }

  /**
   * 批准赎回请求
   * @param {number} requestId 请求ID
   * @param {string} stablecoinAmount 稳定币金额
   * @returns {Promise<object>} 交易收据
   */
  static async approveRedemption(requestId, stablecoinAmount) {
    try {
      logger.info(`Approving redemption request ${requestId} with stablecoin amount ${stablecoinAmount}`);
      const contract = this.getContract();
      const amount = ethers.BigNumber.from(stablecoinAmount).toString();
      return await sendTransaction(contract, 'approveRedemption', [requestId, amount]);
    } catch (error) {
      logger.error(`Failed to approve redemption: ${error.message}`);
      throw ApiError.contractError(`Failed to approve redemption: ${error.message}`);
    }
  }

  /**
   * 拒绝赎回请求
   * @param {number} requestId 请求ID
   * @returns {Promise<object>} 交易收据
   */
  static async rejectRedemption(requestId) {
    try {
      logger.info(`Rejecting redemption request ${requestId}`);
      const contract = this.getContract();
      return await sendTransaction(contract, 'rejectRedemption', [requestId]);
    } catch (error) {
      logger.error(`Failed to reject redemption: ${error.message}`);
      throw ApiError.contractError(`Failed to reject redemption: ${error.message}`);
    }
  }

  /**
   * 完成赎回
   * @param {number} requestId 请求ID
   * @returns {Promise<object>} 交易收据
   */
  static async completeRedemption(requestId) {
    try {
      logger.info(`Completing redemption request ${requestId}`);
      const contract = this.getContract();
      return await sendTransaction(contract, 'completeRedemption', [requestId]);
    } catch (error) {
      logger.error(`Failed to complete redemption: ${error.message}`);
      throw ApiError.contractError(`Failed to complete redemption: ${error.message}`);
    }
  }

  /**
   * 添加支持的稳定币
   * @param {string} stablecoinAddress 稳定币地址
   * @returns {Promise<object>} 交易收据
   */
  static async addSupportedStablecoin(stablecoinAddress) {
    try {
      logger.info(`Adding supported stablecoin ${stablecoinAddress}`);
      const contract = this.getContract();
      return await sendTransaction(contract, 'addSupportedStablecoin', [stablecoinAddress]);
    } catch (error) {
      logger.error(`Failed to add supported stablecoin: ${error.message}`);
      throw ApiError.contractError(`Failed to add supported stablecoin: ${error.message}`);
    }
  }

  /**
   * 移除支持的稳定币
   * @param {string} stablecoinAddress 稳定币地址
   * @returns {Promise<object>} 交易收据
   */
  static async removeSupportedStablecoin(stablecoinAddress) {
    try {
      logger.info(`Removing supported stablecoin ${stablecoinAddress}`);
      const contract = this.getContract();
      return await sendTransaction(contract, 'removeSupportedStablecoin', [stablecoinAddress]);
    } catch (error) {
      logger.error(`Failed to remove supported stablecoin: ${error.message}`);
      throw ApiError.contractError(`Failed to remove supported stablecoin: ${error.message}`);
    }
  }

  /**
   * 紧急提款
   * @param {string} token 代币地址
   * @param {string} to 接收地址
   * @param {string} amount 金额
   * @returns {Promise<object>} 交易收据
   */
  static async emergencyWithdraw(token, to, amount) {
    try {
      logger.info(`Emergency withdraw ${amount} of ${token} to ${to}`);
      const contract = this.getContract();
      const amountBN = ethers.BigNumber.from(amount).toString();
      return await sendTransaction(contract, 'emergencyWithdraw', [token, to, amountBN]);
    } catch (error) {
      logger.error(`Emergency withdraw failed: ${error.message}`);
      throw ApiError.contractError(`Emergency withdraw failed: ${error.message}`);
    }
  }

  /**
   * 获取赎回请求
   * @param {number} requestId 请求ID
   * @returns {Promise<object>} 赎回请求详情
   */
  static async getRedemptionRequest(requestId) {
    try {
      const contract = this.getContract(false);
      const request = await callContractMethod(contract, 'redemptionRequests', [requestId]);
      
      // 转换结果为更友好的格式
      return {
        id: requestId,
        propertyId: request.propertyId,
        tokenAddress: request.tokenAddress,
        requester: request.requester,
        tokenAmount: request.tokenAmount.toString(),
        stablecoinAddress: request.stablecoinAddress,
        stablecoinAmount: request.stablecoinAmount.toString(),
        status: Number(request.status),
        requestTime: new Date(Number(request.requestTime) * 1000).toISOString(),
        lastUpdateTime: new Date(Number(request.lastUpdateTime) * 1000).toISOString()
      };
    } catch (error) {
      logger.error(`Failed to get redemption request: ${error.message}`);
      throw ApiError.contractError(`Failed to get redemption request: ${error.message}`);
    }
  }

  /**
   * 获取当前赎回请求计数
   * @returns {Promise<number>} 请求计数
   */
  static async getRedemptionRequestCount() {
    try {
      const contract = this.getContract(false);
      const count = await callContractMethod(contract, 'redemptionRequestCount', []);
      return Number(count);
    } catch (error) {
      logger.error(`Failed to get redemption request count: ${error.message}`);
      throw ApiError.contractError(`Failed to get redemption request count: ${error.message}`);
    }
  }

  /**
   * 获取所有赎回请求
   * @returns {Promise<Array<object>>} 赎回请求列表
   */
  static async getAllRedemptionRequests() {
    try {
      const count = await this.getRedemptionRequestCount();
      
      // 并行获取所有赎回请求
      const requests = [];
      for (let i = 1; i <= count; i++) {
        requests.push(this.getRedemptionRequest(i));
      }
      
      return await Promise.all(requests);
    } catch (error) {
      logger.error(`Failed to get all redemption requests: ${error.message}`);
      throw ApiError.contractError(`Failed to get all redemption requests: ${error.message}`);
    }
  }

  /**
   * 检查是否为支持的稳定币
   * @param {string} stablecoinAddress 稳定币地址
   * @returns {Promise<boolean>} 是否支持
   */
  static async isSupportedStablecoin(stablecoinAddress) {
    try {
      const contract = this.getContract(false);
      return await callContractMethod(contract, 'supportedStablecoins', [stablecoinAddress]);
    } catch (error) {
      logger.error(`Failed to check supported stablecoin: ${error.message}`);
      throw ApiError.contractError(`Failed to check supported stablecoin: ${error.message}`);
    }
  }

  /**
   * 获取合约当前版本
   * @returns {Promise<number>} 版本号
   */
  static async getVersion() {
    try {
      const contract = this.getContract(false);
      const version = await callContractMethod(contract, 'version', []);
      return Number(version);
    } catch (error) {
      logger.error(`Failed to get version: ${error.message}`);
      throw ApiError.contractError(`Failed to get version: ${error.message}`);
    }
  }
}

module.exports = RedemptionManagerService; 