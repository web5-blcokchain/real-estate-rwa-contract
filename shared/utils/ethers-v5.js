/**
 * ethers v5工具模块
 * 直接使用ethers v5 API，不进行兼容处理
 */
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
 * 检查字符串是否为有效的以太坊地址
 * @param {string} address 要检查的地址
 * @returns {boolean} 是否为有效的以太坊地址
 */
function isAddress(address) {
  try {
    return ethers.utils.isAddress(address);
  } catch (error) {
    logger.error(`检查地址验证时出错: ${error.message}`);
    return false;
  }
}

/**
 * 标准化以太坊地址（校验和）
 * @param {string} address 要标准化的地址
 * @returns {string} 标准化后的地址
 */
function getAddress(address) {
  try {
    return ethers.utils.getAddress(address);
  } catch (error) {
    logger.error(`格式化地址时出错: ${error.message}`);
    throw error;
  }
}

/**
 * 解析以太币金额
 * @param {string|number|BigNumber} value 要解析的值
 * @returns {BigNumber} 解析后的BigNumber
 */
function parseEther(value) {
  try {
    return ethers.utils.parseEther(value.toString());
  } catch (error) {
    logger.error(`解析以太币数量时出错: ${error.message}`);
    throw error;
  }
}

/**
 * 格式化以太币金额
 * @param {BigNumber|string} value 要格式化的值
 * @returns {string} 格式化后的值
 */
function formatEther(value) {
  try {
    return ethers.utils.formatEther(value);
  } catch (error) {
    logger.error(`格式化以太币数量时出错: ${error.message}`);
    throw error;
  }
}

/**
 * 解析指定单位的金额
 * @param {string|number|BigNumber} value 要解析的值
 * @param {number|string} decimals 小数位数或单位名称
 * @returns {BigNumber} 解析后的BigNumber
 */
function parseUnits(value, decimals) {
  try {
    return ethers.utils.parseUnits(value.toString(), decimals);
  } catch (error) {
    logger.error(`解析代币数量时出错: ${error.message}`);
    throw error;
  }
}

/**
 * 格式化指定单位的金额
 * @param {BigNumber|string} value 要格式化的值
 * @param {number|string} decimals 小数位数或单位名称
 * @returns {string} 格式化后的值
 */
function formatUnits(value, decimals) {
  try {
    return ethers.utils.formatUnits(value, decimals);
  } catch (error) {
    logger.error(`格式化代币数量时出错: ${error.message}`);
    throw error;
  }
}

/**
 * 安全验证地址格式
 * 如果地址无效，则抛出错误
 * @param {string} address 要验证的地址
 * @throws {Error} 如果地址无效
 * @returns {string} 标准化的地址
 */
function validateAddress(address) {
  try {
    if (!isAddress(address)) {
      return null;
    }
    return getAddress(address);
  } catch (error) {
    logger.error(`验证地址时出错: ${error.message}`);
    return null;
  }
}

/**
 * 获取合约地址，统一处理ethers v5和v6的差异
 * @param {Object} contract - 合约实例
 * @returns {string} 合约地址
 */
function getContractAddress(contract) {
  // 从合约实例中获取地址
  if (!contract) return null;
  
  // 如果是ethers v5格式的合约，直接返回address属性
  if (contract.address) {
    return contract.address;
  }
  
  // 如果是特殊格式，尝试获取target属性
  if (contract.target) {
    return contract.target;
  }
  
  // 如果都无法获取，返回null
  return null;
}

module.exports = {
  createProvider,
  createSigner,
  waitForTransaction,
  isAddress,
  getAddress,
  parseEther,
  formatEther,
  parseUnits,
  formatUnits,
  validateAddress,
  getContractAddress,
  // 导出原始ethers以便在需要时使用
  ethers
}; 