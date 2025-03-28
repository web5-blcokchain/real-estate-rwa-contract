/**
 * ethers工具模块
 * 统一提供ethers v5 API，确保在整个项目中兼容性
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
    // 兼容 ethers v5 和 v6
    if (typeof ethers.isAddress === 'function') {
      // ethers v6
      return ethers.isAddress(address);
    } else if (typeof ethers.utils?.isAddress === 'function') {
      // ethers v5
      return ethers.utils.isAddress(address);
    } else {
      logger.error('无法找到 ethers.isAddress 或 ethers.utils.isAddress 方法');
      return false;
    }
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
    // 兼容 ethers v5 和 v6
    if (typeof ethers.getAddress === 'function') {
      // ethers v6
      return ethers.getAddress(address);
    } else if (typeof ethers.utils?.getAddress === 'function') {
      // ethers v5
      return ethers.utils.getAddress(address);
    } else {
      // 兼容性处理 - 如果ethers中没有getAddress，自己实现一个简单版本
      // 这仅作为最后手段，应该尽量避免使用
      logger.warn('无法找到 ethers.getAddress 或 ethers.utils.getAddress 方法，使用兼容实现');
      // 简单的地址合法性检查和转换为小写
      if (typeof address !== 'string' || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
        throw new Error(`Invalid address: ${address}`);
      }
      // 如果getAddress不可用，至少返回一个小写版本的地址
      return address.toLowerCase();
    }
  } catch (error) {
    logger.error(`格式化地址时出错: ${error.message}`);
    throw error;
  }
}

// 从hardhat-ethers中导入getAddress以在全局作用域可用
// 这使得其他模块可以直接导入此模块中的getAddress
// 注意：这是为了确保在整个项目中使用相同的getAddress函数
global.getAddress = getAddress;

/**
 * 解析以太币金额
 * @param {string|number|BigNumber} value 要解析的值
 * @returns {BigNumber} 解析后的BigNumber
 */
function parseEther(value) {
  try {
    // 兼容 ethers v5 和 v6
    if (typeof ethers.parseEther === 'function') {
      // ethers v6
      return ethers.parseEther(value.toString());
    } else if (typeof ethers.utils?.parseEther === 'function') {
      // ethers v5
      return ethers.utils.parseEther(value.toString());
    } else {
      throw new Error('无法找到 ethers.parseEther 或 ethers.utils.parseEther 方法');
    }
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
    // 兼容 ethers v5 和 v6
    if (typeof ethers.formatEther === 'function') {
      // ethers v6
      return ethers.formatEther(value);
    } else if (typeof ethers.utils?.formatEther === 'function') {
      // ethers v5
      return ethers.utils.formatEther(value);
    } else {
      throw new Error('无法找到 ethers.formatEther 或 ethers.utils.formatEther 方法');
    }
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
    // 兼容 ethers v5 和 v6
    if (typeof ethers.parseUnits === 'function') {
      // ethers v6
      return ethers.parseUnits(value.toString(), decimals);
    } else if (typeof ethers.utils?.parseUnits === 'function') {
      // ethers v5
      return ethers.utils.parseUnits(value.toString(), decimals);
    } else {
      throw new Error('无法找到 ethers.parseUnits 或 ethers.utils.parseUnits 方法');
    }
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
    // 兼容 ethers v5 和 v6
    if (typeof ethers.formatUnits === 'function') {
      // ethers v6
      return ethers.formatUnits(value, decimals);
    } else if (typeof ethers.utils?.formatUnits === 'function') {
      // ethers v5
      return ethers.utils.formatUnits(value, decimals);
    } else {
      throw new Error('无法找到 ethers.formatUnits 或 ethers.utils.formatUnits 方法');
    }
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
  // 导出原始ethers以便在需要时使用
  ethers
}; 