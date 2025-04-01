import { Request, Response } from 'express';
import { ethers } from 'ethers';

// 导入环境配置和合约工具
const envConfig = require('../../../shared/src/config/env');
const env = new envConfig();

// 获取合约实例
const getContract = async (contractName:) => {
  const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
  const contractAddress = env.get(`${contractName.toUpperCase()}_ADDRESS`);
  const contractABI = require(`../../../config/abi/${contractName}.json`);
  return new ethers.Contract(contractAddress, contractABI, provider);
};

// 获取钱包实例
const getWallet = (role:) => {
  const privateKey = env.get(`${role.toUpperCase()}_PRIVATE_KEY`);
  if (!privateKey) {
    throw new Error(`未找到角色 ${role} 的私钥配置`);
  }
  const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
  return new ethers.Wallet(privateKey, provider);
};

/**
 * 分发奖励
 */
export const distributeRewards = async (req:, res:) => {
  try {
    const { token, recipients, amounts, managerRole = 'manager' } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token) || !recipients || !amounts) {
      return res.status(400).json({
        success:,
        error:'参数不完整',
        message:'请提供所有必要的参数'
      });
    }
    
    if (recipients.length !== amounts.length) {
      return res.status(400).json({
        success:,
        error:'参数错误',
        message:'接收者数组和金额数组长度必须相同'
      });
    }
    
    // 从环境变量获取管理员钱包
    const wallet = getWallet(managerRole);
    const rewardManager = await getContract('RewardManager');
    const connectedRewardManager = rewardManager.connect(wallet);
    
    // 获取代币合约
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(token).connect(wallet);
    const decimals = await connectedToken.decimals();
    
    // 将金额转换为BigInt
    const amountsBigInt = amounts.map((amount: | number) => 
      ethers.parseUnits(amount.toString(), decimals)
    );
    
    // 检查代币授权
    const managerAddress = wallet.address;
    const totalAmount = amountsBigInt.reduce((a:, b:) => a + b, 0n);
    const allowance = await connectedToken.allowance(managerAddress, rewardManager.target);
    
    // 如果授权不足，先进行授权
    if (allowance < totalAmount) {
      const approveTx = await connectedToken.approve(rewardManager.target, totalAmount);
      await approveTx.wait();
    }
    
    // 分发奖励
    const tx = await connectedRewardManager.distributeRewards(token, recipients, amountsBigInt);
    await tx.wait();
    
    // 获取代币信息
    const symbol = await connectedToken.symbol();
    
    res.status(200).json({
      success:,
      data:{
        token,
        symbol,
        recipients,
        amounts:.map(String),
        transaction:.hash,
        message:`已成功分发 ${symbol} 代币奖励给 ${recipients.length} 个接收者`
      }
    });
  } catch (error:) {
    console.error('分发奖励失败:', error);
    res.status(500).json({
      success:,
      error:'分发奖励失败',
      message:.message
    });
  }
};

/**
 * 领取奖励
 */
export const claimRewards = async (req:, res:) => {
  try {
    const { token, userRole = 'user' } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token)) {
      return res.status(400).json({
        success:,
        error:'参数不完整',
        message:'请提供所有必要的参数'
      });
    }
    
    // 从环境变量获取用户钱包
    const wallet = getWallet(userRole);
    const rewardManager = await getContract('RewardManager');
    const connectedRewardManager = rewardManager.connect(wallet);
    
    // 获取可领取的奖励金额
    const userAddress = wallet.address;
    const claimableAmount = await rewardManager.getClaimableRewards(userAddress, token);
    
    // 获取代币合约
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(token);
    const decimals = await connectedToken.decimals();
    
    // 如果没有可领取的奖励
    if (claimableAmount === 0n) {
      return res.status(400).json({
        success:,
        error:'没有可领取的奖励',
        message:'该用户没有可领取的奖励'
      });
    }
    
    // 领取奖励
    const tx = await connectedRewardManager.claimRewards(token);
    await tx.wait();
    
    // 获取代币信息
    const symbol = await connectedToken.symbol();
    
    res.status(200).json({
      success:,
      data:{
        user:,
        token,
        symbol,
        amount:.formatUnits(claimableAmount, decimals),
        transaction:.hash,
        message:`已成功领取 ${ethers.formatUnits(claimableAmount, decimals)} ${symbol} 代币奖励`
      }
    });
  } catch (error:) {
    console.error('领取奖励失败:', error);
    res.status(500).json({
      success:,
      error:'领取奖励失败',
      message:.message
    });
  }
};

/**
 * 获取可领取的奖励
 */
export const getClaimableRewards = async (req:, res:) => {
  try {
    const { address, token } = req.params;
    
    // 参数验证
    if (!address || !ethers.isAddress(address) || !token || !ethers.isAddress(token)) {
      return res.status(400).json({
        success:,
        error:'参数错误',
        message:'请提供有效的地址和代币地址'
      });
    }
    
    // 获取合约实例
    const rewardManager = await getContract('RewardManager');
    
    // 获取可领取的奖励金额
    const claimableAmount = await rewardManager.getClaimableRewards(address, token);
    
    // 获取代币合约
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(token);
    const decimals = await connectedToken.decimals();
    const symbol = await connectedToken.symbol();
    
    res.status(200).json({
      success:,
      data:{
        user:,
        token,
        symbol,
        amount:.formatUnits(claimableAmount, decimals),
        message:`用户 ${address} 可领取 ${ethers.formatUnits(claimableAmount, decimals)} ${symbol} 代币奖励`
      }
    });
  } catch (error:) {
    console.error('获取可领取奖励失败:', error);
    res.status(500).json({
      success:,
      error:'获取可领取奖励失败',
      message:.message
    });
  }
};

/**
 * 添加奖励代币
 */
export const addRewardToken = async (req:, res:) => {
  try {
    const { token, managerRole = 'manager' } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token)) {
      return res.status(400).json({
        success:,
        error:'参数不完整',
        message:'请提供所有必要的参数'
      });
    }
    
    // 从环境变量获取管理员钱包
    const wallet = getWallet(managerRole);
    const rewardManager = await getContract('RewardManager');
    const connectedRewardManager = rewardManager.connect(wallet);
    
    // 检查代币是否已经是奖励代币
    const isRewardToken = await rewardManager.isRewardToken(token);
    if (isRewardToken) {
      return res.status(400).json({
        success:,
        error:'代币已存在',
        message:'该代币已经是奖励代币'
      });
    }
    
    // 添加奖励代币
    const tx = await connectedRewardManager.addRewardToken(token);
    await tx.wait();
    
    // 获取代币信息
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(token);
    const symbol = await connectedToken.symbol();
    
    res.status(200).json({
      success:,
      data:{
        token,
        symbol,
        transaction:.hash,
        message:`已成功添加 ${symbol} 作为奖励代币`
      }
    });
  } catch (error:) {
    console.error('添加奖励代币失败:', error);
    res.status(500).json({
      success:,
      error:'添加奖励代币失败',
      message:.message
    });
  }
};

/**
 * 移除奖励代币
 */
export const removeRewardToken = async (req:, res:) => {
  try {
    const { token, managerRole = 'manager' } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token)) {
      return res.status(400).json({
        success:,
        error:'参数不完整',
        message:'请提供所有必要的参数'
      });
    }
    
    // 从环境变量获取管理员钱包
    const wallet = getWallet(managerRole);
    const rewardManager = await getContract('RewardManager');
    const connectedRewardManager = rewardManager.connect(wallet);
    
    // 检查代币是否是奖励代币
    const isRewardToken = await rewardManager.isRewardToken(token);
    if (!isRewardToken) {
      return res.status(400).json({
        success:,
        error:'代币不存在',
        message:'该代币不是奖励代币'
      });
    }
    
    // 移除奖励代币
    const tx = await connectedRewardManager.removeRewardToken(token);
    await tx.wait();
    
    // 获取代币信息
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(token);
    const symbol = await connectedToken.symbol();
    
    res.status(200).json({
      success:,
      data:{
        token,
        symbol,
        transaction:.hash,
        message:`已成功移除 ${symbol} 作为奖励代币`
      }
    });
  } catch (error:) {
    console.error('移除奖励代币失败:', error);
    res.status(500).json({
      success:,
      error:'移除奖励代币失败',
      message:.message
    });
  }
};
