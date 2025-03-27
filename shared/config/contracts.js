/**
 * 合约地址管理模块
 * 从部署状态文件加载合约地址
 */
const fs = require('fs');
const path = require('path');
const { getContractAbiPath, getDeployStatePath, validatePath } = require('../utils/paths');
const logger = require('../utils/logger');
const { ethers } = require('ethers');
const { getAbi: getContractAbi } = require('../utils/getAbis');

// 项目根目录
const ROOT_DIR = path.join(__dirname, '..', '..');

// 合约地址配置
const contractAddresses = {};

// 从deploy-state.json加载合约地址
try {
  const deployStatePath = getDeployStatePath();
  if (validatePath(deployStatePath)) {
    const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf8'));
    logger.info('Loading contract addresses from deploy-state.json');
    
    if (deployState && deployState.contracts) {
      // 直接使用deploy-state.json中的合约名称和地址
      Object.assign(contractAddresses, deployState.contracts);
      logger.info('Contract addresses loaded successfully');
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
    // 直接从artifacts加载
    const artifactPath = path.join(ROOT_DIR, 'contracts', 'artifacts', `${contractName}.json`);
    logger.info(`尝试从${artifactPath}加载ABI...`);
    
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      if (artifact.abi && Array.isArray(artifact.abi)) {
        logger.info(`从artifacts加载了${contractName}的ABI，包含 ${artifact.abi.length} 个函数/事件`);
        return artifact.abi;
      } else {
        throw new Error(`合约 ${contractName} 的ABI格式无效`);
      }
    } else {
      throw new Error(`找不到合约 ${contractName} 的ABI文件: ${artifactPath}`);
    }
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
    const artifactPath = path.join(ROOT_DIR, 'contracts', 'artifacts', `${contractName}.json`);
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Bytecode file not found for contract: ${contractName}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
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