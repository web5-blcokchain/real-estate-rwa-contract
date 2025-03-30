/**
 * Ethers.js 模块
 * 
 * 该模块提供 ethers.js 的兼容性和工具函数。
 * 
 * @module ethers
 * @version 1.0.0
 */

const ethers = require('ethers');

/**
 * 格式化 wei 为 ether
 * @param {string|BigInt|number} wei - wei 金额
 * @returns {string} - 格式化后的 ether 金额
 */
function formatEther(wei) {
  return ethers.formatEther(wei);
}

/**
 * 将 ether 转换为 wei
 * @param {string|number} ether - ether 金额
 * @returns {BigInt} - wei 金额
 */
function parseEther(ether) {
  return ethers.parseEther(ether);
}

/**
 * 检查地址是否有效
 * @param {string} address - 要检查的地址
 * @returns {boolean} - 地址是否有效
 */
function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
}

/**
 * 获取合约接口
 * @param {Array|Object} abi - 合约ABI
 * @returns {ethers.Interface} - 合约接口对象
 */
function getContractInterface(abi) {
  return new ethers.Interface(abi);
}

/**
 * 创建合约实例
 * @param {string} address - 合约地址
 * @param {Array|Object} abi - 合约ABI
 * @param {ethers.Signer|ethers.Provider} signerOrProvider - 签名者或提供者
 * @returns {ethers.Contract} - 合约实例
 */
function getContract(address, abi, signerOrProvider) {
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * 获取交易收据
 * @param {ethers.Provider} provider - Provider实例
 * @param {string} txHash - 交易哈希
 * @param {number} [confirmations=1] - 确认数
 * @returns {Promise<ethers.TransactionReceipt>} - 交易收据
 */
async function getTransactionReceipt(provider, txHash, confirmations = 1) {
  return await provider.getTransactionReceipt(txHash);
}

/**
 * 等待交易确认
 * @param {ethers.Provider} provider - Provider实例
 * @param {string} txHash - 交易哈希
 * @param {number} [confirmations=1] - 确认数
 * @returns {Promise<ethers.TransactionReceipt>} - 交易收据
 */
async function waitForTransaction(provider, txHash, confirmations = 1) {
  return await provider.waitForTransaction(txHash, confirmations);
}

// 导出自定义函数和原始ethers对象
module.exports = {
  ethers,
  formatEther,
  parseEther,
  isValidAddress,
  getContractInterface,
  getContract,
  getTransactionReceipt,
  waitForTransaction,
  ZeroAddress: ethers.ZeroAddress,
  MaxUint256: ethers.MaxUint256,
  HashZero: ethers.ZeroHash
}; 