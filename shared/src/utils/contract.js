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
  console.log(`尝试获取合约地址: ${contractName}`);
  
  // 读取部署配置
  const deploymentConfig = readDeploymentConfig();
  
  // 如果找到部署配置并且合约存在
  if (deploymentConfig && deploymentConfig.contracts) {
    // 首先尝试直接匹配（保持原始大小写）
    if (deploymentConfig.contracts[contractName]) {
      console.log(`找到合约地址（精确匹配）: ${deploymentConfig.contracts[contractName]}`);
      return deploymentConfig.contracts[contractName];
    }
    
    // 如果找不到精确匹配，尝试大小写不敏感匹配
    const contracts = deploymentConfig.contracts;
    for (const key in contracts) {
      if (key.toLowerCase() === contractName.toLowerCase()) {
        console.log(`找到合约地址（大小写不敏感匹配）: ${contracts[key]}`);
        return contracts[key];
      }
    }
  }
  
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
  
  throw new Error(`未找到合约 ${contractName} 的地址配置，请检查部署配置文件 (config/deployment.json) 或环境变量。`);
};

/**
 * 获取合约实例
 * @param {string} contractName - 合约名称
 * @param {string} network - 可选，网络名称
 * @returns {ethers.Contract} 合约实例
 */
const getContract = (contractName, network = null) => {
  // 创建缓存键，保持原始大小写
  const cacheKey = network ? `${contractName}_${network}` : contractName;
  
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

/**
 * 创建房产代币合约实例
 * @param {string} initialSupply - 初始供应量
 * @param {string} name - 代币名称
 * @param {string} symbol - 代币符号
 * @param {string} owner - 所有者地址
 * @param {string} manager - 管理者地址
 * @param {string} network - 可选，网络名称
 * @returns {Promise<ethers.Contract>} 创建的PropertyToken合约实例
 */
const createPropertyToken = async (initialSupply, name, symbol, owner, manager, network = null) => {
  try {
    // 获取Provider
    const provider = network ? networkUtils.getNetworkProvider(network) : networkUtils.getDefaultProvider();
    
    // 获取钱包（使用部署者角色）
    const wallet = walletUtils.getWallet('deployer', network);
    
    // 获取PropertyToken的ABI
    const abi = getContractABI('PropertyToken');
    
    // 获取PropertyToken的bytecode
    // 注意：这里需要从artifacts中获取bytecode，如果没有可以从环境变量或其他地方获取
    const bytecode = env.get('PROPERTY_TOKEN_BYTECODE');
    if (!bytecode) {
      throw new Error('无法获取PropertyToken的bytecode');
    }
    
    // 创建合约工厂
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    // 部署合约
    console.log(`开始部署PropertyToken，参数: ${initialSupply}, ${name}, ${symbol}, ${owner}, ${manager}`);
    const contract = await factory.deploy(initialSupply, name, symbol, owner, manager);
    
    // 等待部署完成
    const tx = await contract.deploymentTransaction();
    await tx.wait();
    console.log(`PropertyToken部署完成，地址: ${contract.address}`);
    
    return contract;
  } catch (error) {
    console.error('创建PropertyToken失败:', error);
    throw error;
  }
};

/**
 * 为房产注册代币
 * @param {string} propertyId - 房产ID
 * @param {string} tokenAddress - 代币地址
 * @param {string} role - 可选，调用者角色
 * @param {string} network - 可选，网络名称
 * @returns {Promise<Object>} 交易结果
 */
const registerTokenForProperty = async (propertyId, tokenAddress, role = 'manager', network = null) => {
  try {
    // 获取PropertyManager合约实例（带签名者）
    const propertyManager = getContractWithSigner('PropertyManager', role, network);
    
    // 调用合约方法
    console.log(`为房产 ${propertyId} 注册代币 ${tokenAddress}`);
    const tx = await propertyManager.registerTokenForProperty(propertyId, tokenAddress);
    
    // 等待交易确认
    const receipt = await tx.wait();
    console.log(`注册代币成功，交易哈希: ${tx.hash}`);
    
    return receipt;
  } catch (error) {
    console.error(`为房产 ${propertyId} 注册代币失败:`, error);
    throw error;
  }
};

module.exports = {
  getContractAddress,
  getContract,
  getContractWithSigner,
  getContractWithPrivateKey,
  createContractFromAddress,
  connectContractWithRole,
  createPropertyToken,
  registerTokenForProperty
}; 