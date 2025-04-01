/**
 * 合约工具
 * 统一管理合约的创建和使用
 */
const { ethers } = require('ethers');
const { getContractABI } = require('./abi');
const walletUtils = require('./wallet');
const networkUtils = require('./network');
const EnvConfig = require('../config/env');
const fs = require('fs');
const path = require('path');

// 使用导出的环境配置实例
const env = EnvConfig;

// 合约实例缓存，避免重复创建
const contractCache = {};

// 缓存部署配置，避免重复读取
let cachedDeploymentConfig = null;

/**
 * 读取部署配置文件
 * @param {boolean} force - 是否强制重新读取
 * @returns {Object|null} 部署配置对象，读取失败则返回null
 */
const readDeploymentConfig = (force = false) => {
  // 如果已缓存且不强制重新读取，则返回缓存
  if (cachedDeploymentConfig && !force) {
    return cachedDeploymentConfig;
  }
  
  // 可能的部署配置文件路径
  const possiblePaths = [
    // 直接使用相对路径
    'config/deployment.json'
  ];
  
  console.log('尝试查找部署配置文件...');
  
  for (const deploymentPath of possiblePaths) {
    try {
      // 检查文件是否存在
      if (fs.existsSync(deploymentPath)) {
        console.log(`找到部署配置文件: ${deploymentPath}`);
        
        // 读取配置文件
        const configData = fs.readFileSync(deploymentPath, 'utf8');
        cachedDeploymentConfig = JSON.parse(configData);
        
        // 如果读取成功，输出合约列表进行调试
        if (cachedDeploymentConfig && cachedDeploymentConfig.contracts) {
          console.log('已找到以下合约地址:');
          Object.entries(cachedDeploymentConfig.contracts).forEach(([name, address]) => {
            console.log(`- ${name}: ${address}`);
          });
        }
        
        return cachedDeploymentConfig;
      }
    } catch (error) {
      console.warn(`尝试读取 ${deploymentPath} 失败: ${error.message}`);
    }
  }
  
  console.warn('未能在任何路径找到有效的部署配置文件');
  return null;
};

/**
 * 获取合约地址
 * @param {string} contractName - 合约名称
 * @returns {string} 合约地址
 */
const getContractAddress = (contractName) => {
  // 标准化合约名称为小写
  const normalizedName = contractName.toLowerCase();
  console.log(`尝试获取合约地址，原始名称: ${contractName}, 标准化名称: ${normalizedName}`);
  
  // 可能的合约名称变体
  const possibleNames = [
    normalizedName,
    normalizedName.replace('manager', ''),  // 尝试移除manager后缀
    normalizedName.endsWith('manager') ? normalizedName.slice(0, -7) : normalizedName, // 另一种移除manager的方式
    // 特殊处理propertymanager
    contractName === 'PropertyManager' ? 'propertymanager' : normalizedName,
    contractName === 'PropertyManager' ? 'property' : normalizedName,
  ];
  
  console.log(`尝试以下可能的合约名称: ${possibleNames.join(', ')}`);
  
  // 读取部署配置
  const deploymentConfig = readDeploymentConfig();
  
  // 如果在部署配置中找不到，尝试从环境变量获取（兼容旧方式）
  console.warn(`在部署配置中找不到合约 ${contractName} 的地址，尝试从环境变量获取`);
  const addressKey = `${contractName.toUpperCase()}_ADDRESS`;
  
  try {
    const address = env.get(addressKey);
    if (address) {
      console.log(`从环境变量获取到合约地址: ${addressKey} => ${address}`);
      return address;
    }
  } catch (error) {
    console.warn(`环境变量 ${addressKey} 不存在: ${error.message}`);
  }
  
  throw new Error(`未找到合约 ${contractName} 的地址配置，请检查部署配置文件 (config/deployment.json) 或环境变量。已尝试的合约名称: ${possibleNames.join(', ')}`);
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
  const provider = network ? networkUtils.getNetworkProvider(network) : networkUtils.getDefaultProvider();
  
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
  const wallet = walletUtils.getWallet(role, network);
  
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
  const wallet = walletUtils.createWalletFromPrivateKey(privateKey, network);
  
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
  const provider = network ? networkUtils.getNetworkProvider(network) : networkUtils.getDefaultProvider();
  
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
  const wallet = walletUtils.getWallet(role, network);
  
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