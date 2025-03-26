const { ethers } = require('ethers');
const { getNetworkConfigPath, validatePath } = require('./paths');
const logger = require('./logger');

/**
 * 验证网络配置
 * @param {Object} config 网络配置
 * @returns {boolean} 是否有效
 */
function validateNetworkConfig(config) {
  const requiredFields = ['rpcUrl', 'chainId', 'explorerUrl'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    logger.error(`Missing required fields in network config: ${missingFields.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * 验证合约配置
 * @param {Object} config 合约配置
 * @returns {boolean} 是否有效
 */
function validateContractConfig(config) {
  const requiredFields = ['address', 'abi'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    logger.error(`Missing required fields in contract config: ${missingFields.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * 验证私钥
 * @param {string} privateKey 私钥
 * @returns {boolean} 是否有效
 */
function validatePrivateKey(privateKey) {
  try {
    if (!privateKey || typeof privateKey !== 'string') {
      logger.error('Invalid private key: must be a non-empty string');
      return false;
    }

    if (!privateKey.startsWith('0x')) {
      privateKey = `0x${privateKey}`;
    }

    if (privateKey.length !== 66) {
      logger.error('Invalid private key: must be 64 characters (32 bytes)');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to validate private key:', error);
    return false;
  }
}

/**
 * 验证地址
 * @param {string} address 地址
 * @returns {boolean} 是否有效
 */
function validateAddress(address) {
  try {
    if (!address || typeof address !== 'string') {
      logger.error('Invalid address: must be a non-empty string');
      return false;
    }

    if (!address.startsWith('0x')) {
      address = `0x${address}`;
    }

    if (address.length !== 42) {
      logger.error('Invalid address: must be 40 characters (20 bytes)');
      return false;
    }

    ethers.utils.getAddress(address);
    return true;
  } catch (error) {
    logger.error('Failed to validate address:', error);
    return false;
  }
}

/**
 * 验证金额
 * @param {string} amount 金额
 * @returns {boolean} 是否有效
 */
function validateAmount(amount) {
  try {
    if (!amount || typeof amount !== 'string') {
      logger.error('Invalid amount: must be a non-empty string');
      return false;
    }

    const value = ethers.utils.parseEther(amount);
    if (value.lte(0)) {
      logger.error('Invalid amount: must be greater than 0');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to validate amount:', error);
    return false;
  }
}

module.exports = {
  validateNetworkConfig,
  validateContractConfig,
  validatePrivateKey,
  validateAddress,
  validateAmount
}; 