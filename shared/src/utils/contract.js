/**
 * 合约工具
 * 统一管理合约实例的获取逻辑
 */
const { ethers } = require('ethers');
const EnvConfig = require('../config/env');
const { getContractABI } = require('./abi');
const { getDefaultProvider, getNetworkProvider } = require('./network');
const { getWallet, createWalletFromPrivateKey } = require('./wallet');

// 创建环境配置实例
const env = new EnvConfig();

// 合约实例缓存，避免重复创建
const contractCache = {};

/**
 * 获取合约地址
 * @param {string} contractName - 合约名称
 * @returns {string} 合约地址
 */
const getContractAddress = (contractName) => {
  // 标准化合约名称为大写，与环境变量命名一致
  const addressKey = `${contractName.toUpperCase()}_ADDRESS`;
  const address = env.get(addressKey);
  
  if (!address) {
    throw new Error(`未找到合约 ${contractName} 的地址配置，请检查环境变量: ${addressKey}`);
  }
  
  return address;
};

/**
 * 获取合约实例
 * @param {string} contractName - 合约名称
 * @param {string} network - 可选，网络名称
 * @returns {ethers.Contract} 合约实例
 */
const getContract = (contractName, network = null) => {
  // 创建缓存键
  const cacheKey = network ? `${contractName.toLowerCase()}_${network}` : contractName.toLowerCase();
  
  // 如果缓存中已存在，则直接返回
  if (contractCache[cacheKey]) {
    return contractCache[cacheKey];
  }
  
  // 获取合约地址、ABI和Provider
  const contractAddress = getContractAddress(contractName);
  const contractABI = getContractABI(contractName);
  const provider = network ? getNetworkProvider(network) : getDefaultProvider();
  
  // 创建合约实例
  const contract = new ethers.Contract(contractAddress, contractABI, provider);
  
  // 缓存合约实例
  contractCache[cacheKey] = contract;
  
  return contract;
};

/**
 * 获取已连接到指定角色的合约实例
 * @param {string} contractName - 合约名称
 * @param {string} role - 角色名称
 * @param {string} network - 可选，网络名称
 * @returns {ethers.Contract} 已连接的合约实例
 */
const getContractWithSigner = (contractName, role, network = null) => {
  // 获取基础合约实例
  const contract = getContract(contractName, network);
  
  // 获取角色对应的钱包
  const wallet = getWallet(role, network);
  
  // 连接合约与签名者
  return contract.connect(wallet);
};

/**
 * 使用私钥创建已连接的合约实例
 * @param {string} contractName - 合约名称
 * @param {string} privateKey - 私钥
 * @param {string} network - 可选，网络名称
 * @returns {ethers.Contract} 已连接的合约实例
 */
const getContractWithPrivateKey = (contractName, privateKey, network = null) => {
  // 获取基础合约实例
  const contract = getContract(contractName, network);
  
  // 使用私钥创建钱包
  const wallet = createWalletFromPrivateKey(privateKey, network);
  
  // 连接合约与签名者
  return contract.connect(wallet);
};

/**
 * 根据地址和ABI创建合约实例
 * @param {string} address - 合约地址
 * @param {Object} abi - 合约ABI
 * @param {string} network - 可选，网络名称
 * @returns {ethers.Contract} 合约实例
 */
const createContractFromAddress = (address, abi, network = null) => {
  // 检查地址格式
  if (!ethers.isAddress(address)) {
    throw new Error(`无效的合约地址: ${address}`);
  }
  
  // 获取Provider
  const provider = network ? getNetworkProvider(network) : getDefaultProvider();
  
  // 创建合约实例
  return new ethers.Contract(address, abi, provider);
};

/**
 * 将合约连接到指定角色
 * @param {ethers.Contract} contract - 合约实例
 * @param {string} role - 角色名称
 * @param {string} network - 可选，网络名称
 * @returns {ethers.Contract} 已连接的合约实例
 */
const connectContractWithRole = (contract, role, network = null) => {
  // 获取角色对应的钱包
  const wallet = getWallet(role, network);
  
  // 连接合约与签名者
  return contract.connect(wallet);
};

module.exports = {
  getContractAddress,
  getContract,
  getContractWithSigner,
  getContractWithPrivateKey,
  createContractFromAddress,
  connectContractWithRole
}; 