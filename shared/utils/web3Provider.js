const { ethers } = require('ethers');
const { networkConfig } = require('../config');

// 提供者缓存
let providerCache = null;
let networkInfo = null;

/**
 * 获取以太坊提供者
 * @param {string} [customRpcUrl] 可选的自定义RPC URL
 * @returns {ethers.providers.Provider} 以太坊提供者
 */
const getProvider = (customRpcUrl) => {
  // 如果已缓存并且没有指定自定义URL，则使用缓存的提供者
  if (providerCache && !customRpcUrl) {
    return providerCache;
  }
  
  const rpcUrl = customRpcUrl || networkConfig.rpcUrl;
  
  if (!rpcUrl) {
    throw new Error('未配置RPC URL');
  }
  
  try {
    // 创建新的提供者
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // 如果没有指定自定义URL，则缓存提供者
    if (!customRpcUrl) {
      providerCache = provider;
    }
    
    return provider;
  } catch (error) {
    console.error(`创建以太坊提供者失败: ${error.message}`);
    throw new Error(`创建以太坊提供者失败: ${error.message}`);
  }
};

/**
 * 获取带签名者的合约实例
 * @param {string} privateKey 私钥
 * @param {ethers.providers.Provider} [customProvider] 可选的自定义提供者
 * @returns {ethers.Signer} 签名者
 */
const getSigner = (privateKey, customProvider) => {
  if (!privateKey) {
    throw new Error('未提供私钥');
  }
  
  const provider = customProvider || getProvider();
  
  try {
    return new ethers.Wallet(privateKey, provider);
  } catch (error) {
    console.error(`创建签名者失败: ${error.message}`);
    throw new Error(`创建签名者失败: ${error.message}`);
  }
};

/**
 * 获取当前网络信息
 * @returns {Promise<Object>} 网络信息
 */
const getNetworkInfo = async () => {
  if (networkInfo) {
    return networkInfo;
  }
  
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    
    // 缓存网络信息
    networkInfo = {
      name: network.name,
      chainId: network.chainId,
      ensAddress: network.ensAddress,
      rpcUrl: networkConfig.rpcUrl
    };
    
    return networkInfo;
  } catch (error) {
    console.error(`获取网络信息失败: ${error.message}`);
    throw new Error(`获取网络信息失败: ${error.message}`);
  }
};

/**
 * 清除提供者缓存
 */
const clearProviderCache = () => {
  providerCache = null;
  networkInfo = null;
  console.log('已清除提供者缓存');
};

/**
 * 测试网络连接
 * @returns {Promise<boolean>} 连接是否成功
 */
const testConnection = async () => {
  try {
    const provider = getProvider();
    await provider.getBlockNumber();
    const network = await getNetworkInfo();
    console.log(`网络连接测试成功，链接到 ${network.name} (Chain ID: ${network.chainId})`);
    return true;
  } catch (error) {
    console.error(`网络连接测试失败: ${error.message}`);
    return false;
  }
};

module.exports = {
  getProvider,
  getSigner,
  getNetworkInfo,
  clearProviderCache,
  testConnection
}; 