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

// 尝试从多个来源加载合约地址
function loadContractAddresses() {
  try {
    // 1. 尝试从scripts/deploy-state.json加载
    let scriptsDeployState = path.join(ROOT_DIR, 'scripts', 'deploy-state.json');
    if (fs.existsSync(scriptsDeployState)) {
      logger.info('Loading contract addresses from scripts/deploy-state.json');
      const deployState = JSON.parse(fs.readFileSync(scriptsDeployState, 'utf8'));
      
      if (deployState) {
        if (deployState.contracts) {
          // deploy-state.json中有contracts字段
          Object.assign(contractAddresses, deployState.contracts);
        } else {
          // deploy-state.json直接包含合约地址
          Object.assign(contractAddresses, deployState);
        }
        
        if (deployState.RealEstateTokenImplementation) {
          contractAddresses.RealEstateTokenImplementation = deployState.RealEstateTokenImplementation;
        }
        
        logger.info('Contract addresses loaded successfully');
        return contractAddresses;
      }
    }
    
    // 2. 尝试从scripts/logging/contracts.json加载
    const loggingContractsPath = path.join(ROOT_DIR, 'scripts', 'logging', 'contracts.json');
    if (fs.existsSync(loggingContractsPath)) {
      logger.info('Loading contract addresses from scripts/logging/contracts.json');
      const contracts = JSON.parse(fs.readFileSync(loggingContractsPath, 'utf8'));
      Object.assign(contractAddresses, contracts);
      logger.info('Contract addresses loaded successfully');
      return contractAddresses;
    }
    
    // 3. 最后尝试从shared/deploy-state.json加载
    const deployStatePath = getDeployStatePath();
    if (validatePath(deployStatePath)) {
      logger.info('Loading contract addresses from shared/deploy-state.json');
      const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf8'));
      
      if (deployState && deployState.contracts) {
        Object.assign(contractAddresses, deployState.contracts);
        logger.info('Contract addresses loaded successfully');
        return contractAddresses;
      }
    }
    
    throw new Error('No contract addresses loaded from any source');
  } catch (error) {
    logger.warn(`Failed to load contract addresses: ${error.message}`);
    return {};
  }
}

// 初始加载合约地址
loadContractAddresses();

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
  // 如果缓存为空，尝试重新加载
  if (Object.keys(contractAddresses).length === 0) {
    loadContractAddresses();
  }
  
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
  // 如果缓存为空，尝试重新加载
  if (Object.keys(contractAddresses).length === 0) {
    loadContractAddresses();
  }
  
  return { ...contractAddresses };
}

/**
 * 获取合约ABI
 * @param {string} contractName 合约名称
 * @returns {Array} 合约ABI
 */
function getAbi(contractName) {
  try {
    // 首先尝试从标准Hardhat输出目录加载
    const standardArtifactPath = path.join(ROOT_DIR, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    logger.info(`尝试从${standardArtifactPath}加载ABI...`);
    
    if (fs.existsSync(standardArtifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(standardArtifactPath, 'utf8'));
      if (artifact.abi && Array.isArray(artifact.abi)) {
        logger.info(`从标准artifacts目录加载了${contractName}的ABI，包含 ${artifact.abi.length} 个函数/事件`);
        return artifact.abi;
      }
    }
    
    // 后备方案：从旧路径加载
    const legacyArtifactPath = path.join(ROOT_DIR, 'contracts', 'artifacts', `${contractName}.json`);
    logger.info(`尝试从旧路径${legacyArtifactPath}加载ABI...`);
    
    if (fs.existsSync(legacyArtifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(legacyArtifactPath, 'utf8'));
      if (artifact.abi && Array.isArray(artifact.abi)) {
        logger.info(`从旧artifacts目录加载了${contractName}的ABI，包含 ${artifact.abi.length} 个函数/事件`);
        return artifact.abi;
      } else {
        throw new Error(`合约 ${contractName} 的ABI格式无效`);
      }
    }
    
    // 两个路径都尝试失败
    throw new Error(`找不到合约 ${contractName} 的ABI文件，已尝试路径:\n1. ${standardArtifactPath}\n2. ${legacyArtifactPath}`);
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
    // 首先尝试从标准Hardhat输出目录加载
    const standardArtifactPath = path.join(ROOT_DIR, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    if (fs.existsSync(standardArtifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(standardArtifactPath, 'utf8'));
      return artifact.bytecode;
    }
    
    // 后备方案：从旧路径加载
    const legacyArtifactPath = path.join(ROOT_DIR, 'contracts', 'artifacts', `${contractName}.json`);
    if (fs.existsSync(legacyArtifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(legacyArtifactPath, 'utf8'));
      return artifact.bytecode;
    }

    throw new Error(`Bytecode file not found for contract: ${contractName}`);
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