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

// 获取钱包实例
const getWallet = (role: string) => {
  const privateKey = env.get(`${role.toUpperCase()}_PRIVATE_KEY`);
  if (!privateKey) {
    throw new Error(`未找到角色 ${role} 的私钥配置`);
  }
  const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
  return new ethers.Wallet(privateKey, provider);
};

/**
 * 获取系统状态
 */
export const getSystemStatus = async (req: Request, res: Response) => {
  try {
    // 获取各个合约实例
    const roleManager = await getContract('RoleManager');
    const propertyManager = await getContract('PropertyManager');
    const tradingManager = await getContract('TradingManager');
    const rewardManager = await getContract('RewardManager');

    // 获取系统状态信息
    const emergencyMode = await roleManager.emergencyMode();
    const propertyCount = await propertyManager.getPropertyCount();
    const tradingPaused = await tradingManager.paused();

    // 获取区块链信息
    const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();

    res.status(200).json({
      success: true,
      data: {
        system: {
          emergencyMode,
          propertyCount: propertyCount.toString(),
          tradingPaused
        },
        blockchain: {
          network: {
            chainId: network.chainId,
            name: network.name
          },
          blockNumber
        },
        contracts: {
          roleManager: roleManager.target,
          propertyManager: propertyManager.target,
          tradingManager: tradingManager.target,
          rewardManager: rewardManager.target
        }
      }
    });
  } catch (error: any) {
    console.error('获取系统状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统状态失败',
      message: error.message
    });
  }
};

/**
 * 切换紧急模式
 */
export const toggleEmergencyMode = async (req: Request, res: Response) => {
  try {
    const { enable, adminRole = 'admin' } = req.body;

    // 参数验证
    if (enable === undefined) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的参数'
      });
    }

    // 从环境变量获取管理员钱包
    const wallet = getWallet(adminRole);
    const roleManager = await getContract('RoleManager');
    const connectedRoleManager = roleManager.connect(wallet);

    // 获取当前状态
    const currentMode = await roleManager.emergencyMode();

    // 如果当前状态与请求状态相同，则无需操作
    if (currentMode === enable) {
      return res.status(400).json({
        success: false,
        error: '状态未变化',
        message: `紧急模式已经${enable ? '启用' : '禁用'}`
      });
    }

    // 切换紧急模式
    const tx = await connectedRoleManager.setEmergencyMode(enable);
    await tx.wait();

    res.status(200).json({
      success: true,
      data: {
        emergencyMode: enable,
        transaction: tx.hash,
        message: `已成功${enable ? '启用' : '禁用'}紧急模式`
      }
    });
  } catch (error: any) {
    console.error('切换紧急模式失败:', error);
    res.status(500).json({
      success: false,
      error: '切换紧急模式失败',
      message: error.message
    });
  }
};

/**
 * 暂停/恢复交易
 */
export const toggleTradingPause = async (req: Request, res: Response) => {
  try {
    const { pause, adminRole = 'admin' } = req.body;

    // 参数验证
    if (pause === undefined) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的参数'
      });
    }

    // 从环境变量获取管理员钱包
    const wallet = getWallet(adminRole);
    const tradingManager = await getContract('TradingManager');
    const connectedTradingManager = tradingManager.connect(wallet);

    // 获取当前状态
    const currentPaused = await tradingManager.paused();

    // 如果当前状态与请求状态相同，则无需操作
    if (currentPaused === pause) {
      return res.status(400).json({
        success: false,
        error: '状态未变化',
        message: `交易已经${pause ? '暂停' : '恢复'}`
      });
    }

    // 暂停/恢复交易
    let tx;
    if (pause) {
      tx = await connectedTradingManager.pause();
    } else {
      tx = await connectedTradingManager.unpause();
    }
    await tx.wait();

    res.status(200).json({
      success: true,
      data: {
        tradingPaused: pause,
        transaction: tx.hash,
        message: `已成功${pause ? '暂停' : '恢复'}交易`
      }
    });
  } catch (error: any) {
    console.error('切换交易状态失败:', error);
    res.status(500).json({
      success: false,
      error: '切换交易状态失败',
      message: error.message
    });
  }
};

/**
 * 获取合约地址
 */
export const getContractAddresses = async (req: Request, res: Response) => {
  try {
    // 从环境配置中获取合约地址
    const roleManagerAddress = env.get('ROLE_MANAGER_ADDRESS');
    const propertyManagerAddress = env.get('PROPERTY_MANAGER_ADDRESS');
    const tradingManagerAddress = env.get('TRADING_MANAGER_ADDRESS');
    const rewardManagerAddress = env.get('REWARD_MANAGER_ADDRESS');

    res.status(200).json({
      success: true,
      data: {
        roleManager: roleManagerAddress,
        propertyManager: propertyManagerAddress,
        tradingManager: tradingManagerAddress,
        rewardManager: rewardManagerAddress
      }
    });
  } catch (error: any) {
    console.error('获取合约地址失败:', error);
    res.status(500).json({
      success: false,
      error: '获取合约地址失败',
      message: error.message
    });
  }
};