/**
 * RewardManager控制器
 * 提供奖励管理相关API
 */
const { ethers } = require('ethers');
const { Logger } = require('../../../shared/src');
const validateParams = require('../utils/validateParams');
const { isEthAddress, isNonEmptyString, isPositiveInteger, isPrivateKey } = require('../utils/validators');
const { callContractMethod, sendContractTransaction } = require('../utils/contract');

/**
 * 创建奖励规则
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function createRewardRule(req, res, next) {
  try {
    const { 
      ruleName, 
      rewardType, 
      rewardAmount, 
      rewardCondition, 
      privateKey 
    } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { ruleName, rewardType, rewardAmount, rewardCondition, privateKey },
      [
        ['ruleName', isNonEmptyString],
        ['rewardType', isNonEmptyString],
        ['rewardAmount', isPositiveInteger],
        ['rewardCondition', isNonEmptyString],
        ['privateKey', isPrivateKey]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    
    // 记录日志（敏感信息已隐藏）
    Logger.info('创建奖励规则', {
      ruleName,
      rewardType,
      rewardAmount,
      from: wallet.address
    });
    
    // 调用合约创建奖励规则
    const receipt = await sendContractTransaction(
      'RewardManager',
      'createRewardRule',
      [ruleName, rewardType, rewardAmount, rewardCondition],
      { wallet }
    );
    
    // 从收据事件中获取规则ID
    let ruleId = 'unknown';
    if (receipt.events && receipt.events.length > 0) {
      // 假设第一个事件是RewardRuleCreated事件，包含ruleId
      // 实际情况可能需要更精确的事件解析
      ruleId = receipt.events[0].args.ruleId;
    }
    
    // 返回结果
    return res.status(201).json({
      success: true,
      data: {
        ruleId,
        ruleName,
        rewardType,
        rewardAmount,
        rewardCondition,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取奖励规则信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getRewardRuleInfo(req, res, next) {
  try {
    const { ruleId } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { ruleId },
      [
        ['ruleId', isNonEmptyString]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('获取奖励规则信息', { ruleId });
    
    // 调用合约获取奖励规则信息
    const ruleInfo = await callContractMethod(
      'RewardManager',
      'getRewardRule',
      [ruleId]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        ruleId,
        ruleInfo
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 发放奖励
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function distributeReward(req, res, next) {
  try {
    const { recipient, ruleId, privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { recipient, ruleId, privateKey },
      [
        ['recipient', isEthAddress],
        ['ruleId', isNonEmptyString],
        ['privateKey', isPrivateKey]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    
    // 记录日志（敏感信息已隐藏）
    Logger.info('发放奖励', {
      recipient,
      ruleId,
      from: wallet.address
    });
    
    // 调用合约发放奖励
    const receipt = await sendContractTransaction(
      'RewardManager',
      'distributeReward',
      [recipient, ruleId],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        recipient,
        ruleId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取用户奖励历史
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getUserRewardHistory(req, res, next) {
  try {
    const { address } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { address },
      [
        ['address', isEthAddress]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('获取用户奖励历史', { address });
    
    // 调用合约获取用户奖励历史
    const history = await callContractMethod(
      'RewardManager',
      'getUserRewardHistory',
      [address]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        address,
        history
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取所有奖励规则
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getAllRewardRules(req, res, next) {
  try {
    // 记录日志
    Logger.info('获取所有奖励规则');
    
    // 调用合约获取所有奖励规则
    const rules = await callContractMethod(
      'RewardManager',
      'getAllRewardRules',
      []
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        rules
      }
    });
    
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRewardRule,
  getRewardRuleInfo,
  distributeReward,
  getUserRewardHistory,
  getAllRewardRules
}; 