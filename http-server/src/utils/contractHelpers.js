/**
 * 合约工具函数
 * 提供合约操作相关的实用方法，封装shared模块功能
 */
const { ethers } = require('ethers');
const utils = require('./index');
const logger = require('./logger');

/**
 * 获取合约实例
 * @param {string} contractName - 合约名称
 * @param {string} [role=''] - 角色名称，如果指定则使用对应的签名者
 * @returns {Promise<ethers.Contract>} 合约实例
 */
const getContractInstance = async (contractName, role = '') => {
  try {
    logger.debug(`尝试获取${contractName}合约实例${role ? `，使用角色${role}` : ''}`);
    
    if (role) {
      return await utils.getContractWithSigner(contractName, role);
    } else {
      return await utils.getContract(contractName);
    }
  } catch (error) {
    logger.error(`获取${contractName}合约实例失败:`, error);
    throw error;
  }
};

/**
 * 扩展的获取合约实例函数，支持更多选项
 * @param {Object} options - 合约选项
 * @param {string} options.contractName - 合约名称
 * @param {string} [options.role] - 角色名称，如果指定则使用对应的签名者
 * @param {string} [options.network] - 网络名称
 * @param {string} [options.privateKey] - 私钥
 * @returns {Promise<ethers.Contract>} 合约实例
 */
const getContractWithOptions = async (options) => {
  const { contractName, role, network, privateKey } = options;
  
  if (!contractName) {
    throw new Error('必须指定合约名称');
  }
  
  try {
    if (privateKey) {
      return await utils.getContractWithPrivateKey(contractName, privateKey, network);
    } else if (role) {
      return await utils.getContractWithSigner(contractName, role, network);
    } else {
      return await utils.getContract(contractName, network);
    }
  } catch (error) {
    logger.error(`获取${contractName}合约实例失败:`, error);
    throw error;
  }
};

/**
 * 执行合约交易并等待确认
 * @param {Function} txFunction - 返回交易的函数
 * @param {string} operationName - 操作名称，用于日志
 * @param {Object} options - 交易选项
 * @param {number} [options.confirmations=1] - 需要等待的确认数
 * @param {number} [options.timeout=60000] - 超时时间(毫秒)
 * @returns {Promise<Object>} 交易收据和相关信息
 */
const executeTransaction = async (txFunction, operationName, options = {}) => {
  const { confirmations = 1, timeout = 60000 } = options;
  
  try {
    logger.info(`开始执行合约交易: ${operationName}`);
    
    // 执行交易
    const tx = await txFunction();
    logger.info(`交易已提交: ${operationName}, 哈希: ${tx.hash}`);
    
    // 等待交易确认
    const receipt = await tx.wait(confirmations);
    logger.info(`交易已确认: ${operationName}, 块号: ${receipt.blockNumber}`);
    
    return {
      success: true,
      transaction: tx,
      receipt,
      blockNumber: receipt.blockNumber,
      events: receipt.logs
    };
  } catch (error) {
    logger.error(`执行合约交易失败: ${operationName}`, error);
    throw error;
  }
};

// 导出函数
module.exports = {
  getContractInstance,
  getContractWithOptions,
  executeTransaction,
  // 再导出shared模块的函数，避免直接依赖
  createPropertyToken: utils.createPropertyToken,
  registerTokenForProperty: utils.registerTokenForProperty
}; 