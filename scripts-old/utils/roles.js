/**
 * 角色管理工具
 * 提供统一的角色管理函数，确保全系统使用一致的方式处理角色
 */

const { ethers } = require('hardhat');
const { logger } = require('../../shared/utils');

// 角色常量
const ROLES = {
  DEFAULT_ADMIN: '0x0000000000000000000000000000000000000000000000000000000000000000',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  TOKEN_MANAGER: 'TOKEN_MANAGER',
  FEE_MANAGER: 'FEE_MANAGER',
  RENT_MANAGER: 'RENT_MANAGER',
  REDEMPTION_MANAGER: 'REDEMPTION_MANAGER',
  MARKETPLACE_MANAGER: 'MARKETPLACE_MANAGER',
  FEE_COLLECTOR: 'FEE_COLLECTOR',
  MINTER: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  SNAPSHOT: '0xe890b0e9775b69760b908bc25301d794a9e670ee1aa8c991580bbde9a640da83'
};

/**
 * 将角色名转换为角色哈希
 * @param {string} roleName - 角色名称
 * @returns {string} - 角色哈希
 */
function getRoleHash(roleName) {
  // 如果已经是哈希值（0x开头的字符串），则直接返回
  if (typeof roleName === 'string' && roleName.startsWith('0x') && roleName.length === 66) {
    return roleName;
  }
  
  // 否则，计算哈希值
  return ethers.keccak256(ethers.toUtf8Bytes(roleName));
}

/**
 * 获取私钥对应的账户地址
 * @param {string} roleKey - 角色对应的环境变量名
 * @returns {string} - 账户地址
 */
function getRoleAddress(roleKey) {
  const rolePrivateKey = process.env[`${roleKey}_PRIVATE_KEY`];
  if (!rolePrivateKey) {
    logger.warn(`未设置 ${roleKey}_PRIVATE_KEY 环境变量`);
    return null;
  }
  
  // 创建钱包实例并返回地址
  const wallet = new ethers.Wallet(rolePrivateKey);
  return wallet.address;
}

/**
 * 授予角色权限
 * @param {ethers.Contract} roleManager - RoleManager合约实例
 * @param {string} role - 角色名称或哈希
 * @param {string} address - 要授予权限的地址
 * @returns {Promise<boolean>} - 授权是否成功
 */
async function grantRole(roleManager, role, address) {
  try {
    const roleHash = getRoleHash(role);
    const hasRole = await roleManager.hasRole(roleHash, address);
    
    if (hasRole) {
      logger.info(`地址 ${address} 已拥有 ${role} 角色`);
      return true;
    }
    
    logger.info(`为地址 ${address} 授予 ${role} 角色...`);
    const tx = await roleManager.grantRole(roleHash, address);
    await tx.wait();
    logger.info(`成功为 ${address} 授予 ${role} 角色`);
    return true;
  } catch (error) {
    logger.error(`授予角色 ${role} 失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查地址是否拥有指定角色
 * @param {ethers.Contract} roleManager - RoleManager合约实例
 * @param {string} role - 角色名称或哈希
 * @param {string} address - 要检查的地址
 * @returns {Promise<boolean>} - 是否拥有角色
 */
async function hasRole(roleManager, role, address) {
  try {
    const roleHash = getRoleHash(role);
    return await roleManager.hasRole(roleHash, address);
  } catch (error) {
    logger.error(`检查角色 ${role} 失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  ROLES,
  getRoleHash,
  getRoleAddress,
  grantRole,
  hasRole
}; 