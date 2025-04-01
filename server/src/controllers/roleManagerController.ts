import { Request, Response } from 'express';
import { ethers } from 'ethers';

// 导入环境配置和合约工具
const envConfig = require('../../../shared/src/config/env');
const env = new envConfig();

// 这里假设我们有一个合约工具类，如果没有，需要在shared目录下创建
// 以下是示例，实际实现可能需要调整
const getContract = async (contractName: string) => {
  // 这里应该从shared目录下导入获取合约的函数
  // 暂时使用示例代码
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
 * 获取地址的角色信息
 */
export const getRoles = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: '无效的地址',
        message: '请提供有效的以太坊地址'
      });
    }
    
    const roleManager = await getContract('RoleManager');
    
    const adminRole = await roleManager.ADMIN_ROLE();
    const managerRole = await roleManager.MANAGER_ROLE();
    const traderRole = await roleManager.TRADER_ROLE();
    
    const isAdmin = await roleManager.hasRole(adminRole, address);
    const isManager = await roleManager.hasRole(managerRole, address);
    const isTrader = await roleManager.hasRole(traderRole, address);
    
    res.status(200).json({
      success: true,
      data: {
        address,
        roles: {
          isAdmin,
          isManager,
          isTrader
        }
      }
    });
  } catch (error: any) {
    console.error('获取角色失败:', error);
    res.status(500).json({
      success: false,
      error: '获取角色失败',
      message: error.message
    });
  }
};

/**
 * 授予角色
 */
export const grantRole = async (req: Request, res: Response) => {
  try {
    const { address, role, adminRole = 'admin' } = req.body;
    
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: '无效的地址',
        message: '请提供有效的以太坊地址'
      });
    }
    
    if (!role || !['admin', 'manager', 'trader'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: '无效的角色',
        message: '角色必须是admin、manager或trader之一'
      });
    }
    
    // 从环境变量获取管理员钱包
    const wallet = getWallet(adminRole);
    const roleManager = await getContract('RoleManager');
    const connectedRoleManager = roleManager.connect(wallet);
    
    let roleHash;
    switch (role) {
      case 'admin':
        roleHash = await roleManager.ADMIN_ROLE();
        break;
      case 'manager':
        roleHash = await roleManager.MANAGER_ROLE();
        break;
      case 'trader':
        roleHash = await roleManager.TRADER_ROLE();
        break;
    }
    
    // 检查是否已经有该角色
    const hasRole = await roleManager.hasRole(roleHash, address);
    if (hasRole) {
      return res.status(400).json({
        success: false,
        error: '角色已存在',
        message: `地址 ${address} 已经拥有 ${role} 角色`
      });
    }
    
    // 授予角色
    const tx = await connectedRoleManager.grantRole(roleHash, address);
    await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        address,
        role,
        transaction: tx.hash,
        message: `已成功授予地址 ${address} ${role} 角色`
      }
    });
  } catch (error: any) {
    console.error('授予角色失败:', error);
    res.status(500).json({
      success: false,
      error: '授予角色失败',
      message: error.message
    });
  }
};

/**
 * 撤销角色
 */
export const revokeRole = async (req: Request, res: Response) => {
  try {
    const { address, role, adminRole = 'admin' } = req.body;
    
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: '无效的地址',
        message: '请提供有效的以太坊地址'
      });
    }
    
    if (!role || !['admin', 'manager', 'trader'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: '无效的角色',
        message: '角色必须是admin、manager或trader之一'
      });
    }
    
    // 从环境变量获取管理员钱包
    const wallet = getWallet(adminRole);
    const roleManager = await getContract('RoleManager');
    const connectedRoleManager = roleManager.connect(wallet);
    
    let roleHash;
    switch (role) {
      case 'admin':
        roleHash = await roleManager.ADMIN_ROLE();
        break;
      case 'manager':
        roleHash = await roleManager.MANAGER_ROLE();
        break;
      case 'trader':
        roleHash = await roleManager.TRADER_ROLE();
        break;
    }
    
    // 检查是否有该角色
    const hasRole = await roleManager.hasRole(roleHash, address);
    if (!hasRole) {
      return res.status(400).json({
        success: false,
        error: '角色不存在',
        message: `地址 ${address} 没有 ${role} 角色`
      });
    }
    
    // 撤销角色
    const tx = await connectedRoleManager.revokeRole(roleHash, address);
    await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        address,
        role,
        transaction: tx.hash,
        message: `已成功撤销地址 ${address} 的 ${role} 角色`
      }
    });
  } catch (error: any) {
    console.error('撤销角色失败:', error);
    res.status(500).json({
      success: false,
      error: '撤销角色失败',
      message: error.message
    });
  }
};