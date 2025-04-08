const { ContractUtils, AddressUtils } = require('../../../common');
const Logger = require('../../../common/logger');
const Utils = require('../../../common/utils');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');

/**
 * 奖励控制器
 */
class RewardController extends BaseController {
  /**
   * 创建奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createReward(req, res) {
    const { contractAddress, propertyId, amount, recipient, description } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, propertyId, amount, recipient })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(recipient)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RewardManager', contractAddress);
        
        // 调用合约方法
        const tx = await contract.createReward(propertyId, amount, recipient, description || '');
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          propertyId,
          amount,
          recipient,
          description
        };
      },
      '奖励创建成功',
      { propertyId, amount, recipient, description },
      '奖励创建失败'
    );
  }

  /**
   * 获取奖励信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRewardInfo(req, res) {
    const { contractAddress } = req.query;
    const { rewardId } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, rewardId })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RewardManager', contractAddress);
        
        // 调用合约方法
        const rewardInfo = await contract.getRewardInfo(rewardId);

        return {
          rewardId,
          rewardInfo
        };
      },
      '获取奖励信息成功',
      { rewardId },
      '获取奖励信息失败'
    );
  }

  /**
   * 发放奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async distributeReward(req, res) {
    const { contractAddress, rewardId } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, rewardId })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RewardManager', contractAddress);
        
        // 调用合约方法
        const tx = await contract.distributeReward(rewardId);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          rewardId
        };
      },
      '奖励发放成功',
      { rewardId },
      '奖励发放失败'
    );
  }

  /**
   * 获取账户奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getAccountRewards(req, res) {
    const { contractAddress } = req.query;
    const { account } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, account })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(account)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RewardManager', contractAddress);
        
        // 调用合约方法
        const rewards = await contract.getAccountRewards(account);

        return {
          account,
          rewards
        };
      },
      '获取账户奖励成功',
      { account },
      '获取账户奖励失败'
    );
  }

  /**
   * 获取房产奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPropertyRewards(req, res) {
    const { contractAddress } = req.query;
    const { propertyId } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, propertyId })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RewardManager', contractAddress);
        
        // 调用合约方法
        const rewards = await contract.getPropertyRewards(propertyId);

        return {
          propertyId,
          rewards
        };
      },
      '获取房产奖励成功',
      { propertyId },
      '获取房产奖励失败'
    );
  }
}

module.exports = RewardController; 