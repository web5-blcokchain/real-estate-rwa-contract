import { ethers } from 'ethers';
import utils from '../utils/index.js';

const { 
  getContract, 
  getContractWithSigner, 
  getContractWithPrivateKey
} = utils;
const EnvConfig = utils.EnvConfig;

// 创建环境配置实例
const env = new EnvConfig();

/**
 * 分发奖励
 */
export const distributeRewards = async (req, res) => {
  try {
    const { propertyId, amount, toAddresses, managerRole = 'manager' } = req.body;
    
    // 参数验证
    if (!propertyId || !amount || !toAddresses || !Array.isArray(toAddresses) || toAddresses.length === 0) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的奖励信息'
      });
    }
    
    // 获取合约实例
    const rewardManager = await getContractWithSigner('RewardManager', managerRole);
    
    // 分发奖励
    const tx = await rewardManager.distributeRewards(propertyId, ethers.parseUnits(amount.toString(), 18), toAddresses);
    const receipt = await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        amount,
        recipients: toAddresses,
        transaction: tx.hash,
        message: `已成功分发奖励给 ${toAddresses.length} 个地址`
      }
    });
  } catch (error) {
    console.error('分发奖励失败:', error);
    res.status(500).json({
      success: false,
      error: '分发奖励失败',
      message: error.message
    });
  }
};

/**
 * 领取奖励
 */
export const claimRewards = async (req, res) => {
  try {
    const { propertyId, traderRole = 'trader' } = req.body;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供房产ID'
      });
    }
    
    // 获取合约实例
    const rewardManager = await getContractWithSigner('RewardManager', traderRole);
    
    // 领取奖励
    const tx = await rewardManager.claimRewards(propertyId);
    const receipt = await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        claimer: await rewardManager.signer.getAddress(),
        transaction: tx.hash,
        message: `已成功领取房产 ${propertyId} 的奖励`
      }
    });
  } catch (error) {
    console.error('领取奖励失败:', error);
    res.status(500).json({
      success: false,
      error: '领取奖励失败',
      message: error.message
    });
  }
};

/**
 * 获取可领取的奖励
 */
export const getClaimableRewards = async (req, res) => {
  try {
    const { propertyId, address } = req.params;
    
    if (!propertyId || !address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: '参数无效',
        message: '请提供有效的房产ID和以太坊地址'
      });
    }
    
    // 获取合约实例
    const rewardManager = await getContract('RewardManager');
    
    // 获取可领取奖励
    const claimableAmount = await rewardManager.getClaimableRewards(propertyId, address);
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        address,
        claimableAmount: ethers.formatUnits(claimableAmount, 18)
      }
    });
  } catch (error) {
    console.error('获取可领取奖励失败:', error);
    res.status(500).json({
      success: false,
      error: '获取可领取奖励失败',
      message: error.message
    });
  }
};

/**
 * 获取奖励历史
 */
export const getRewardHistory = async (req, res) => {
  try {
    const { propertyId, address } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: '参数无效',
        message: '请提供有效的房产ID'
      });
    }
    
    // 获取合约实例
    const rewardManager = await getContract('RewardManager');
    
    // 此处应该查询事件日志来获取奖励历史
    // 简化示例，实际实现需要根据合约设计调整
    const rewardEvents = []; // 应该通过查询事件获取
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        address: address || 'all',
        rewardEvents
      }
    });
  } catch (error) {
    console.error('获取奖励历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取奖励历史失败',
      message: error.message
    });
  }
}; 