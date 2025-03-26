/**
 * 合约地址管理模块
 * 从部署状态文件加载合约地址
 */
const fs = require('fs');
const { getContractAbiPath, getDeployStatePath, validatePath } = require('../utils/paths');
const logger = require('../utils/logger');
const { ethers } = require('ethers');

// 合约地址配置
const contractAddresses = {
  propertyRegistry: process.env.PROPERTY_REGISTRY_ADDRESS,
  realEstateToken: process.env.REAL_ESTATE_TOKEN_ADDRESS,
  roleManager: process.env.ROLE_MANAGER_ADDRESS,
  redemptionManager: process.env.REDEMPTION_MANAGER_ADDRESS
};

// 从deploy-state.json加载合约地址
try {
  const deployStatePath = getDeployStatePath();
  if (validatePath(deployStatePath)) {
    const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf8'));
    logger.info('Loading contract addresses from deploy-state.json');
    
    if (deployState && deployState.contracts) {
      // 将合约地址映射到小写键名
      Object.keys(deployState.contracts).forEach(key => {
        const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
        if (!contractAddresses[lowerKey] || contractAddresses[lowerKey] === '') {
          contractAddresses[lowerKey] = deployState.contracts[key];
          logger.info(`Loaded contract address for ${key}: ${deployState.contracts[key]}`);
        }
      });
    }
  }
} catch (error) {
  logger.warn(`Failed to load deploy state: ${error.message}`);
}

/**
 * 验证以太坊地址是否合法
 * @param {string} address 要验证的地址
 * @returns {boolean} 是否是合法的以太坊地址
 */
function isValidEthereumAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
}

/**
 * 获取合约地址
 * @param {string} contractName 合约名称
 * @returns {string} 合约地址
 */
function getContractAddress(contractName) {
  const address = contractAddresses[contractName];
  if (!address) {
    throw new Error(`Contract address not found for: ${contractName}`);
  }
  return address;
}

/**
 * 获取所有合约地址
 * @returns {Object} 合约地址配置
 */
function getContractAddresses() {
  return { ...contractAddresses };
}

/**
 * 获取合约ABI
 * @param {string} contractName 合约名称
 * @returns {Array} 合约ABI
 */
function getAbi(contractName) {
  try {
    const abiPath = getContractAbiPath(contractName);
    if (!validatePath(abiPath)) {
      throw new Error(`ABI file not found for contract: ${contractName}`);
    }

    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return artifact.abi;
  } catch (error) {
    logger.error(`Failed to load ABI for contract: ${contractName}`, error);
    throw error;
  }
}

/**
 * 获取合约字节码
 * @param {string} contractName 合约名称
 * @returns {string} 合约字节码
 */
function getBytecode(contractName) {
  try {
    const abiPath = getContractAbiPath(contractName);
    if (!validatePath(abiPath)) {
      throw new Error(`Bytecode file not found for contract: ${contractName}`);
    }

    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return artifact.bytecode;
  } catch (error) {
    logger.error(`Failed to load bytecode for contract: ${contractName}`, error);
    throw error;
  }
}

/**
 * 更新合约地址
 * @param {string} contractName 合约名称
 * @param {string} address 合约地址
 */
function updateContractAddress(contractName, address) {
  if (isValidEthereumAddress(address)) {
    contractAddresses[contractName] = address;
  }
}

/**
 * 保存部署状态
 */
function saveToDeployState() {
  try {
    const deployStatePath = getDeployStatePath();
    fs.writeFileSync(
      deployStatePath,
      JSON.stringify({ contracts: contractAddresses }, null, 2)
    );
    logger.info('Deploy state saved successfully');
  } catch (error) {
    logger.error('Failed to save deploy state:', error);
    throw error;
  }
}

module.exports = {
  getContractAddress,
  getContractAddresses,
  getAbi,
  getBytecode,
  updateContractAddress,
  saveToDeployState
}; 