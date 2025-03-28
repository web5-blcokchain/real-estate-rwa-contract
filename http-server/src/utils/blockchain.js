/**
 * 区块链工具
 * 复用shared中的区块链连接功能
 */

const { logger } = require('./logger');
const {
  getProviderFromCache,
  getSignerFromCache,
  testConnection
} = require('../../../shared/utils/web3Provider');
const { getContractAddress, getContractAddresses } = require('../../../shared/config/contracts');
const { contractService } = require('../../../shared/utils/contractService');
const config = require('../config');
const { ethers } = require('ethers');

// 初始化区块链连接
async function initializeBlockchain() {
  try {
    logger.info('初始化区块链连接...');
    
    // 创建provider
    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    
    // 创建signer
    const wallet = new ethers.Wallet(config.blockchain.privateKey, provider);
    
    // 测试连接
    await testConnection(provider);
    
    // 缓存provider和signer
    global._provider = provider;
    global._signer = wallet;
    
    logger.info(`已连接到区块链网络RPC: ${config.blockchain.rpcUrl}`);
    logger.info(`使用账户地址: ${wallet.address}`);
    
    return true;
  } catch (error) {
    logger.error('初始化区块链连接失败:', error);
    throw error;
  }
}

// 获取Provider实例
function getProvider() {
  if (!global._provider) {
    throw new Error('Provider未初始化');
  }
  return global._provider;
}

// 获取Signer实例
function getSigner() {
  if (!global._signer) {
    throw new Error('Signer未初始化');
  }
  return global._signer;
}

// 获取合约实例
function getContractInstance(contractName) {
  try {
    // 获取合约地址
    const contractAddress = getContractAddress(contractName);
    logger.debug(`获取合约实例: ${contractName} @ ${contractAddress}`);
    
    // 创建合约服务实例
    const signer = getSigner();
    return contractService.createContractService(contractAddress, contractName, signer);
  } catch (error) {
    logger.error(`获取合约实例失败 (${contractName}):`, error);
    throw error;
  }
}

module.exports = {
  initializeBlockchain,
  getContractInstance,
  getProvider,
  getSigner,
  getContractAddress,
  getContractAddresses
}; 