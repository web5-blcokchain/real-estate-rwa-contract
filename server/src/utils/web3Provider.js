const { ethers } = require('ethers');
const { networkConfig } = require('../config');
const keyManager = require('../config/keyManager');
const logger = require('./logger');

/**
 * 创建 JSON RPC Provider 实例
 */
const createProvider = () => {
  try {
    return new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
  } catch (error) {
    logger.error(`创建Provider失败: ${error.message}`);
    throw error;
  }
};

// 单例Provider实例
let providerInstance = null;

/**
 * 获取Provider实例（单例模式）
 * @returns {ethers.providers.Provider} Provider实例
 */
const getProvider = () => {
  if (!providerInstance) {
    providerInstance = createProvider();
  }
  return providerInstance;
};

/**
 * 获取指定角色的签名者
 * @param {string} role 角色名称（admin, operator, finance, emergency）
 * @returns {ethers.Wallet} 对应角色的签名者钱包
 */
const getSigner = (role = 'admin') => {
  const provider = getProvider();
  return keyManager.getSigner(role, provider);
};

/**
 * 获取签名者和调用账户地址信息
 * @param {object} options 选项
 * @param {string} options.role 角色名称
 * @param {boolean} options.showAddressInfo 是否打印地址信息
 * @returns {object} 包含签名者和地址信息的对象
 */
const getSignerWithInfo = (options = {}) => {
  const { role = 'admin', showAddressInfo = false } = options;
  
  const signer = getSigner(role);
  const address = signer.address;
  
  if (showAddressInfo) {
    logger.info(`使用角色 "${role}" 的账户 ${address} 执行操作`);
  }
  
  return {
    signer,
    address
  };
};

// 导出 Provider 和 Signer 获取函数
module.exports = {
  provider: getProvider(),
  getProvider,
  getSigner,
  getSignerWithInfo,
  // 便捷角色签名者获取器
  getAdminSigner: () => getSigner('admin'),
  getOperatorSigner: () => getSigner('operator'),
  getFinanceSigner: () => getSigner('finance'),
  getEmergencySigner: () => getSigner('emergency')
};