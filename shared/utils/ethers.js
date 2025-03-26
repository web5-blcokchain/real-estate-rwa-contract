const { ethers } = require('ethers');
const { getNetworkConfigPath, validatePath } = require('./paths');
const logger = require('./logger');

/**
 * 创建Web3提供者
 * @param {string} network 网络名称
 * @returns {ethers.providers.JsonRpcProvider} Web3提供者
 */
function createProvider(network) {
  try {
    const configPath = getNetworkConfigPath(network);
    if (!validatePath(configPath)) {
      throw new Error(`Network configuration not found for network: ${network}`);
    }

    const config = require(configPath);
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    logger.info(`Web3 provider created for network: ${network}`);
    return provider;
  } catch (error) {
    logger.error(`Failed to create Web3 provider for network ${network}:`, error);
    throw error;
  }
}

/**
 * 创建签名者
 * @param {string} privateKey 私钥
 * @param {ethers.providers.JsonRpcProvider} provider Web3提供者
 * @returns {ethers.Wallet} 签名者
 */
function createSigner(privateKey, provider) {
  try {
    const signer = new ethers.Wallet(privateKey, provider);
    logger.info('Signer created successfully');
    return signer;
  } catch (error) {
    logger.error('Failed to create signer:', error);
    throw error;
  }
}

/**
 * 等待交易确认
 * @param {ethers.ContractTransaction} tx 交易
 * @param {number} [confirmations=1] 确认数
 * @returns {Promise<ethers.ContractReceipt>} 交易收据
 */
async function waitForTransaction(tx, confirmations = 1) {
  try {
    const receipt = await tx.wait(confirmations);
    logger.info(`Transaction confirmed with ${confirmations} confirmations`);
    return receipt;
  } catch (error) {
    logger.error('Failed to wait for transaction:', error);
    throw error;
  }
}

/**
 * 格式化以太坊地址
 * @param {string} address 地址
 * @returns {string} 格式化后的地址
 */
function formatAddress(address) {
  return ethers.utils.getAddress(address);
}

/**
 * 检查地址是否有效
 * @param {string} address 地址
 * @returns {boolean} 是否有效
 */
function isValidAddress(address) {
  try {
    ethers.utils.getAddress(address);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  createProvider,
  createSigner,
  waitForTransaction,
  formatAddress,
  isValidAddress
}; 