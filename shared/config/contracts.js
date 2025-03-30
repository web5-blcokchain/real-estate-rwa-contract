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

// 部署状态文件路径 - 唯一的合约地址来源
const DEPLOY_STATE_PATH = path.join(ROOT_DIR, 'scripts', 'deploy-state.json');

// 合约地址配置
const contractAddresses = {};

// 尝试加载合约地址
function loadContractAddresses() {
  try {
    // 只从scripts/deploy-state.json加载
    if (!fs.existsSync(DEPLOY_STATE_PATH)) {
      logger.warn(`部署状态文件不存在: ${DEPLOY_STATE_PATH}`);
      return {};
    }

    logger.info(`从 ${DEPLOY_STATE_PATH} 加载合约地址`);
    
    // 读取文件内容
    const fileContent = fs.readFileSync(DEPLOY_STATE_PATH, 'utf8');
    if (!fileContent || fileContent.trim() === '') {
      logger.warn(`部署状态文件为空: ${DEPLOY_STATE_PATH}`);
      return {};
    }
    
    // 解析JSON
    const deployState = JSON.parse(fileContent);
    
    if (!deployState) {
      logger.warn(`部署状态文件内容无效: ${DEPLOY_STATE_PATH}`);
      return {};
    }
    
    // 清空现有地址
    Object.keys(contractAddresses).forEach(key => delete contractAddresses[key]);
    
    if (deployState.contracts) {
      // 如果有contracts字段（新格式）
      Object.assign(contractAddresses, deployState.contracts);
      logger.info(`从contracts字段加载了 ${Object.keys(deployState.contracts).length} 个合约地址`);
    } else {
      // 直接包含合约地址（旧格式）
      Object.assign(contractAddresses, deployState);
      logger.info(`直接加载了 ${Object.keys(deployState).length} 个合约地址`);
    }
    
    // 处理特殊字段
    if (deployState.RealEstateTokenImplementation) {
      contractAddresses.RealEstateTokenImplementation = deployState.RealEstateTokenImplementation;
      logger.info('已加载 RealEstateTokenImplementation 地址');
    }
    
    logger.info(`合约地址加载成功，共 ${Object.keys(contractAddresses).length} 个合约`);
    logger.debug('已加载的合约地址:', contractAddresses);
    
    return contractAddresses;
  } catch (error) {
    logger.error(`加载合约地址失败: ${error.message}`, error);
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
    throw new Error(`找不到合约 ${contractName} 的地址，请确保已部署并正确更新了 ${DEPLOY_STATE_PATH} 文件`);
  }
  
  // 验证地址格式
  if (!isValidEthereumAddress(address)) {
    throw new Error(`合约 ${contractName} 的地址 ${address} 格式无效`);
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
  
  if (Object.keys(contractAddresses).length === 0) {
    logger.warn(`未找到任何合约地址，请确保 ${DEPLOY_STATE_PATH} 文件存在且包含有效数据`);
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
  if (!isValidEthereumAddress(address)) {
    throw new Error(`尝试更新的地址 ${address} 不是有效的以太坊地址`);
  }
  
  contractAddresses[contractName] = address;
  logger.info(`更新了合约 ${contractName} 的地址: ${address}`);
  
  // 自动保存到deploy-state.json
  saveToDeployState();
}

/**
 * 保存部署状态
 */
function saveToDeployState() {
  try {
    if (Object.keys(contractAddresses).length === 0) {
      logger.warn('没有合约地址可保存');
      return;
    }
    
    // 确保目录存在
    const dir = path.dirname(DEPLOY_STATE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`创建目录: ${dir}`);
    }
    
    // 保存合约地址
    fs.writeFileSync(
      DEPLOY_STATE_PATH,
      JSON.stringify(contractAddresses, null, 2)
    );
    
    logger.info(`合约地址已保存到 ${DEPLOY_STATE_PATH}`);
    logger.debug('保存的合约地址:', contractAddresses);
  } catch (error) {
    logger.error(`保存部署状态失败: ${error.message}`, error);
    throw error;
  }
}

// 导出功能
module.exports = {
  getContractAddress,
  getContractAddresses,
  getAbi,
  getBytecode,
  updateContractAddress,
  saveToDeployState,
  DEPLOY_STATE_PATH  // 导出部署状态文件路径常量
}; 