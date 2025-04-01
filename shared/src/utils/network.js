/**
 * 网络连接工具
 * 统一管理Provider的获取逻辑
 */
const { ethers } = require('ethers');
const envModule = require('../config/env');

// 使用导出的环境配置实例
const env = envModule;

// 缓存Provider实例，避免重复创建
let defaultProvider = null;
const providerCache = {};

/**
 * 获取默认Provider
 * @returns {ethers.JsonRpcProvider} 默认网络的Provider
 */
const getDefaultProvider = () => {
  if (!defaultProvider) {
    const rpcUrl = env.get('RPC_URL');
    defaultProvider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return defaultProvider;
};

/**
 * 获取指定网络的Provider
 * @param {string} network - 网络名称 (mainnet, testnet, localhost)
 * @returns {ethers.JsonRpcProvider} 指定网络的Provider
 */
const getNetworkProvider = (network = 'localhost') => {
  if (providerCache[network]) {
    return providerCache[network];
  }

  let rpcUrl;
  switch (network.toLowerCase()) {
    case 'mainnet':
      rpcUrl = env.get('MAINNET_RPC_URL');
      break;
    case 'testnet':
      rpcUrl = env.get('TESTNET_RPC_URL');
      break;
    case 'localhost':
    default:
      rpcUrl = env.getOptional('RPC_URL', 'http://localhost:8545');
      break;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  providerCache[network] = provider;
  return provider;
};

/**
 * 根据链ID获取Provider
 * @param {number} chainId - 链ID
 * @returns {ethers.JsonRpcProvider} 对应链ID的Provider
 */
const getProviderByChainId = (chainId) => {
  const chainIdStr = chainId.toString();
  
  if (providerCache[chainIdStr]) {
    return providerCache[chainIdStr];
  }

  let rpcUrl;
  if (chainId === env.getInt('MAINNET_CHAIN_ID')) {
    rpcUrl = env.get('MAINNET_RPC_URL');
  } else if (chainId === env.getInt('TESTNET_CHAIN_ID')) {
    rpcUrl = env.get('TESTNET_RPC_URL');
  } else if (chainId === env.getInt('HARDHAT_CHAIN_ID')) {
    rpcUrl = env.getOptional('RPC_URL', 'http://localhost:8545');
  } else {
    throw new Error(`不支持的链ID: ${chainId}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  providerCache[chainIdStr] = provider;
  return provider;
};

module.exports = {
  getDefaultProvider,
  getNetworkProvider,
  getProviderByChainId
}; 