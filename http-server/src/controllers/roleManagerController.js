import { ethers } from 'ethers';
import utils from '../utils/index.js';

const { getContract, getWallet } = utils;
const EnvConfig = utils.EnvConfig;

// 创建环境配置实例
const env = new EnvConfig();

/**
 * 获取地址的角色信息
 */
export const getRoles = async (req, res) => {
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
  } catch (error) {
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
export const grantRole = async (req, res) => {
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
    
    // 获取管理员钱包
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
  } catch (error) {
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
export const revokeRole = async (req, res) => {
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
    
    // 获取管理员钱包
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
  } catch (error) {
    console.error('撤销角色失败:', error);
    res.status(500).json({
      success: false,
      error: '撤销角色失败',
      message: error.message
    });
  }
};

/**
 * 获取角色地址列表
 */
export const getRoleAddresses = async (req, res) => {
  try {
    const roleManager = await getContract('RoleManager');
    
    const adminRole = await roleManager.ADMIN_ROLE();
    const managerRole = await roleManager.MANAGER_ROLE();
    const traderRole = await roleManager.TRADER_ROLE();
    
    // 获取角色成员数量
    const adminCount = await roleManager.getRoleMemberCount(adminRole);
    const managerCount = await roleManager.getRoleMemberCount(managerRole);
    const traderCount = await roleManager.getRoleMemberCount(traderRole);
    
    const adminList = [];
    const managerList = [];
    const traderList = [];
    
    // 获取每个角色的地址列表
    for (let i = 0; i < adminCount; i++) {
      const address = await roleManager.getRoleMember(adminRole, i);
      adminList.push(address);
    }
    
    for (let i = 0; i < managerCount; i++) {
      const address = await roleManager.getRoleMember(managerRole, i);
      managerList.push(address);
    }
    
    for (let i = 0; i < traderCount; i++) {
      const address = await roleManager.getRoleMember(traderRole, i);
      traderList.push(address);
    }
    
    res.status(200).json({
      success: true,
      data: {
        admins: adminList,
        managers: managerList,
        traders: traderList
      }
    });
  } catch (error) {
    console.error('获取角色地址列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取角色地址列表失败',
      message: error.message
    });
  }
}; 