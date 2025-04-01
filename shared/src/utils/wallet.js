/**
 * 钱包管理工具
 * 统一管理钱包的获取逻辑
 */
const { ethers } = require('ethers');
const networkUtils = require('./network');
const EnvConfig = require('../config/env');

// 使用导出的环境配置实例
const env = EnvConfig;

// 钱包缓存，避免重复创建
const walletCache = {};

/**
 * 获取角色对应的地址列表
 * @param {string} role - 角色名称 (admin, manager, operator 等)
 * @returns {string[]} 角色对应的地址列表
 */
const getRoleAddresses = (role) => {
  // 标准化角色名称为大写，避免大小写问题
  const normalizedRole = role.toUpperCase();
  const addressesVar = `${normalizedRole}_ADDRESSES`;
  
  try {
    // 从环境变量获取地址列表
    return env.getArray(addressesVar);
  } catch (error) {
    throw new Error(`未找到角色 ${role} 的地址列表配置，请检查环境变量: ${addressesVar}`);
  }
};

/**
 * 获取角色对应的钱包
 * @param {string} role - 角色名称 (admin, manager, operator 等)
 * @param {string} network - 可选，网络名称 (mainnet, testnet, localhost)
 * @param {number} index - 可选，要获取的钱包索引，默认为0
 * @returns {ethers.Wallet} 角色对应的钱包
 */
const getWallet = (role, network = null, index = 0) => {
  // 标准化角色名称为大写，避免大小写问题
  const normalizedRole = role.toUpperCase();
  const cacheKey = network ? `${normalizedRole}_${network}_${index}` : `${normalizedRole}_${index}`;
  
  // 如果缓存中已存在，则直接返回
  if (walletCache[cacheKey]) {
    return walletCache[cacheKey];
  }
  
  // 从环境变量获取私钥
  const privateKeyVar = `${normalizedRole}_PRIVATE_KEY`;
  
  try {
    const privateKey = env.get(privateKeyVar);
    
    // 获取对应网络的Provider
    const provider = network ? networkUtils.getNetworkProvider(network) : networkUtils.getDefaultProvider();
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // 缓存钱包
    walletCache[cacheKey] = wallet;
    
    return wallet;
  } catch (error) {
    // 如果没有找到专用的私钥，则尝试使用角色地址索引查找相应的私钥
    try {
      const addressIndex = `${normalizedRole}_PRIVATE_KEY_${index}`;
      const indexedPrivateKey = env.get(addressIndex);
      
      // 获取对应网络的Provider
      const provider = network ? networkUtils.getNetworkProvider(network) : networkUtils.getDefaultProvider();
      
      // 创建钱包
      const wallet = new ethers.Wallet(indexedPrivateKey, provider);
      
      // 缓存钱包
      walletCache[cacheKey] = wallet;
      
      return wallet;
    } catch (innerError) {
      throw new Error(`未找到角色 ${role} 的私钥配置，请检查环境变量: ${privateKeyVar} 或 ${normalizedRole}_PRIVATE_KEY_${index}`);
    }
  }
};

/**
 * 从私钥创建钱包
 * @param {string} privateKey - 私钥
 * @param {string} network - 可选，网络名称
 * @returns {ethers.Wallet} 创建的钱包
 */
const createWalletFromPrivateKey = (privateKey, network = null) => {
  // 检查私钥格式
  if (!privateKey || typeof privateKey !== 'string' || !privateKey.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
    throw new Error('无效的私钥格式');
  }
  
  // 标准化私钥格式（移除可能的0x前缀）
  const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  // 获取对应网络的Provider
  const provider = network ? networkUtils.getNetworkProvider(network) : networkUtils.getDefaultProvider();
  
  // 创建钱包
  return new ethers.Wallet(normalizedKey, provider);
};

/**
 * 根据地址获取对应的已知角色
 * @param {string} address - 钱包地址
 * @returns {string|null} 对应的角色名称，如果未找到则返回null
 */
const getRoleByAddress = async (address) => {
  const normalizedAddress = address.toLowerCase();
  
  // 常见角色列表
  const roles = ['ADMIN', 'MANAGER', 'OPERATOR', 'SELLER', 'BUYER'];
  
  for (const role of roles) {
    try {
      // 获取角色对应的地址列表
      const addresses = getRoleAddresses(role);
      
      // 检查地址是否在列表中
      if (addresses.some(addr => addr.toLowerCase() === normalizedAddress)) {
        return role;
      }
      
      // 尝试直接获取钱包
      try {
        const wallet = getWallet(role);
        if (wallet.address.toLowerCase() === normalizedAddress) {
          return role;
        }
      } catch (error) {
        // 如果钱包不存在，继续检查下一个角色
        continue;
      }
    } catch (error) {
      // 如果角色不存在，则继续检查下一个
      continue;
    }
  }
  
  return null;
};

module.exports = {
  getWallet,
  createWalletFromPrivateKey,
  getRoleByAddress,
  getRoleAddresses
}; 