const { ethers } = require('ethers');
const { configManager } = require('../config');
const logger = require('./logger');

let provider = null;
let signer = null;

/**
 * 初始化区块链连接
 */
async function initializeBlockchain() {
  try {
    // 确保配置管理器已初始化
    if (!configManager.isInitialized()) {
      await configManager.initialize();
    }

    // 获取网络配置
    const networkConfig = configManager.getNetworkConfig();
    
    if (!networkConfig || !networkConfig.rpcUrl) {
      throw new Error('Invalid network configuration: RPC URL is missing');
    }
    
    // 创建provider
    provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
    
    // 测试连接
    const network = await provider.getNetwork();
    logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
    
    // 创建signer
    const privateKey = configManager.getPrivateKey('operator');
    if (!privateKey) {
      throw new Error('Operator private key not found in configuration');
    }
    
    signer = new ethers.Wallet(privateKey, provider);
    
    // 验证签名者
    const signerAddress = await signer.getAddress();
    logger.info(`Initialized signer with address: ${signerAddress}`);
    
    logger.info('Blockchain connection initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize blockchain connection:', error);
    throw new Error(`Blockchain initialization failed: ${error.message}`);
  }
}

/**
 * 获取provider实例
 * @returns {ethers.providers.JsonRpcProvider} provider实例
 */
function getProvider() {
  if (!provider) {
    throw new Error('Blockchain provider not initialized. Call initializeBlockchain() first.');
  }
  return provider;
}

/**
 * 获取signer实例
 * @returns {ethers.Wallet} signer实例
 */
function getSigner() {
  if (!signer) {
    throw new Error('Blockchain signer not initialized. Call initializeBlockchain() first.');
  }
  return signer;
}

module.exports = {
  initializeBlockchain,
  getProvider,
  getSigner
}; 