import { Request, Response } from 'express';
import { ethers } from 'ethers';

// 导入环境配置和合约工具
const envConfig = require('../../../shared/src/config/env');
const env = new envConfig();

// 获取合约实例
const getContract = async (contractName: string) => {
  const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
  const contractAddress = env.get(`${contractName.toUpperCase()}_ADDRESS`);
  const contractABI = require(`../../../config/abi/${contractName}.json`);
  return new ethers.Contract(contractAddress, contractABI, provider);
};

/**
 * 分发奖励
 */
export const distributeRewards = async (req: Request, res: Response) => {
  try {
    const { token, recipients, amounts, managerPrivateKey } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token) || !recipients || !amounts || !managerPrivateKey) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的参数'
      });
    }
    
    if (recipients.length !== amounts.length) {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: '接收者数组和金额数组长度必须相同'
      });
    }
    
    // 获取合约实例
    const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
    const wallet = new ethers.Wallet(managerPrivateKey, provider);
    const rewardManager = await getContract('RewardManager');
    const connectedRewardManager = rewardManager.connect(wallet);
    
    // 获取代币合约
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(token).connect(wallet);
    const decimals = await connectedToken.decimals();
    
    // 转换金额为BigInt
    const amountsBigInt = amounts.map((amount: string) => 
      ethers.parseUnits(amount, decimals)
    );
    
    // 检查代币授权
    const managerAddress = wallet.address;
    const totalAmount = amountsBigInt.reduce((a: bigint, b: bigint) => a + b, 0n);
    const allowance = await connectedToken.allowance(managerAddress, rewardManager.target);
    
    // 如果授权不足，先进行授权
    if (allowance < totalAmount) {
      const approveTx = await connectedToken.approve(rewardManager.target, totalAmount);
      await approveTx.wait();
    }
    
    // 分发奖励
    const tx = await connectedRewardManager.distributeRewards(token, recipients, amountsBigInt);
    await tx.wait();
    
    // 准备响应数据
    const distributionDetails = recipients.map((recipient: string, index: number) => ({
      recipient,
      amount: amounts[index]
    }));
    
    res.status(200).json({
      success: true,
      data: {
        token,
        totalAmount: ethers.formatUnits(totalAmount, decimals),
        recipientCount: recipients.length,
        distribution: distributionDetails,
        transaction: tx.hash,
        message: `已成功分发奖励给 ${recipients.length} 个接收者`
      }
    });
  } catch (error: any) {
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
export const claimRewards = async (req: Request, res: Response) => {
  try {
    const { token, userPrivateKey } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token) || !userPrivateKey) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的参数'
      });
    }
    
    // 获取合约实例
    const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
    const wallet = new ethers.Wallet(userPrivateKey, provider);
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
        success: false,
        error: '没有可领取的奖励',
        message: '该用户没有可领取的奖励'
      });
    }
    
    // 领取奖励
    const tx = await connectedRewardManager.claimRewards(token);
    await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        user: userAddress,
        token,
        amount: ethers.formatUnits(claimableAmount, decimals),
        transaction: tx.hash,
        message: `已成功领取 ${ethers.formatUnits(claimableAmount, decimals)} 代币奖励`
      }
    });
  } catch (error: any) {
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
export const getClaimableRewards = async (req: Request, res: Response) => {
  try {
    const { address, token } = req.params;
    
    // 参数验证
    if (!address || !ethers.isAddress(address) || !token || !ethers.isAddress(token)) {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: '请提供有效的地址和代币地址'
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
      success: true,
      data: {
        user: address,
        token,
        symbol,
        amount: ethers.formatUnits(claimableAmount, decimals),
        message: `用户 ${address} 可领取 ${ethers.formatUnits(claimableAmount, decimals)} ${symbol} 代币奖励`
      }
    });
  } catch (error: any) {
    console.error('获取可领取奖励失败:', error);
    res.status(500).json({
      success: false,
      error: '获取可领取奖励失败',
      message: error.message
    });
  }
};

/**
 * 添加奖励代币
 */
export const addRewardToken = async (req: Request, res: Response) => {
  try {
    const { token, managerPrivateKey } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token) || !managerPrivateKey) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的参数'
      });
    }
    
    // 获取合约实例
    const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
    const wallet = new ethers.Wallet(managerPrivateKey, provider);
    const rewardManager = await getContract('RewardManager');
    const connectedRewardManager = rewardManager.connect(wallet);
    
    // 检查代币是否已经是奖励代币
    const isRewardToken = await rewardManager.isRewardToken(token);
    if (isRewardToken) {
      return res.status(400).json({
        success: false,
        error: '代币已存在',
        message: '该代币已经是奖励代币'
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
      success: true,
      data: {
        token,
        symbol,
        transaction: tx.hash,
        message: `已成功添加 ${symbol} 作为奖励代币`
      }
    });
  } catch (error: any) {
    console.error('添加奖励代币失败:', error);
    res.status(500).json({
      success: false,
      error: '添加奖励代币失败',
      message: error.message
    });
  }
};

/**
 * 移除奖励代币
 */
export const removeRewardToken = async (req: Request, res: Response) => {
  try {
    const { token, managerPrivateKey } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token) || !managerPrivateKey) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的参数'
      });
    }
    
    // 获取合约实例
    const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
    const wallet = new ethers.Wallet(managerPrivateKey, provider);
    const rewardManager = await getContract('RewardManager');
    const connectedRewardManager = rewardManager.connect(wallet);
    
    // 检查代币是否是奖励代币
    const isRewardToken = await rewardManager.isRewardToken(token);
    if (!isRewardToken) {
      return res.status(400).json({
        success: false,
        error: '代币不存在',
        message: '该代币不是奖励代币'
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
      success: true,
      data: {
        token,
        symbol,
        transaction: tx.hash,
        message: `已成功移除 ${symbol} 作为奖励代币`
      }
    });
  } catch (error: any) {
    console.error('移除奖励代币失败:', error);
    res.status(500).json({
      success: false,
      error: '移除奖励代币失败',
      message: error.message
    });
  }
};