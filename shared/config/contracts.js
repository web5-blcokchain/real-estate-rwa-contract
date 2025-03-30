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

// 合约地址缓存
let contractAddresses = {};
let implementationAddresses = {};

/**
 * 加载合约地址
 * @param {boolean} [force=false] 是否强制重新加载
 * @returns {Object} 合约地址对象
 */
function loadContractAddresses(force = false) {
  // 如果已经加载并且不强制重新加载，则直接返回
  if (!force && Object.keys(contractAddresses).length > 0) {
    return contractAddresses;
  }

  logger.debug('正在加载合约地址...');
  
  try {
    // 清空当前缓存
    contractAddresses = {};
    implementationAddresses = {};
    
    // 只从scripts/deploy-state.json加载
    let deployStateData;
    try {
      deployStateData = fs.readFileSync(DEPLOY_STATE_PATH, 'utf8');
    } catch (error) {
      logger.warn(`无法读取部署状态文件 ${DEPLOY_STATE_PATH}: ${error.message}`);
      return contractAddresses;
    }
    
    // 解析JSON数据
    let deployedAddresses;
    try {
      deployedAddresses = JSON.parse(deployStateData);
    } catch (error) {
      logger.error(`解析部署状态文件失败 ${DEPLOY_STATE_PATH}: ${error.message}`);
      return contractAddresses;
    }
    
    // 处理新格式（包含contracts和implementations字段）
    if (deployedAddresses.contracts) {
      // 使用新格式中的contracts字段
      Object.assign(contractAddresses, deployedAddresses.contracts);
      
      // 使用新格式中的implementations字段
      if (deployedAddresses.implementations) {
        Object.assign(implementationAddresses, deployedAddresses.implementations);
      }
    }
    
    // 同时加载旧格式（直接在根级别的字段）以兼容
    Object.keys(deployedAddresses).forEach(key => {
      // 跳过contracts和implementations字段，因为已经处理过了
      if (key === 'contracts' || key === 'implementations') {
        return;
      }
      
      const address = deployedAddresses[key];
      
      // 只处理字符串类型的地址
      if (typeof address === 'string' && address.startsWith('0x')) {
        // 将Pascal命名转换为驼峰命名以适应新格式
        const pascalName = key.charAt(0).toUpperCase() + key.slice(1);
        
        // 如果不是库合约（通常以Lib结尾），添加到合约地址映射
        if (!key.endsWith('Lib') && !key.endsWith('Library')) {
          contractAddresses[pascalName] = address;
        }
      }
    });
    
    logger.info(`已成功加载合约地址: ${Object.keys(contractAddresses).length}个合约，${Object.keys(implementationAddresses).length}个实现合约`);
    
    if (Object.keys(contractAddresses).length === 0) {
      logger.warn('未找到任何合约地址，请确保正确配置了部署状态文件');
    }
    
    return contractAddresses;
  } catch (error) {
    logger.error(`加载合约地址失败: ${error.message}`);
    logger.error(error.stack);
    return {};
  }
}

/**
 * 验证以太坊地址格式
 * @param {string} address 以太坊地址
 * @returns {boolean} 是否为有效地址
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
 * 在需要时加载合约地址
 * @private
 */
function loadContractAddressesIfNeeded() {
  // 如果缓存为空，尝试重新加载
  if (Object.keys(contractAddresses).length === 0) {
    loadContractAddresses();
  }
}

/**
 * 获取指定合约的实现合约地址
 * @param {string} contractName 合约名称
 * @returns {string|null} 实现合约地址，如果未找到则返回null
 */
function getImplementationAddress(contractName) {
  try {
    loadContractAddressesIfNeeded();
    
    // 首先检查implementations字段
    if (implementationAddresses && implementationAddresses[contractName]) {
      return implementationAddresses[contractName];
    }
    
    // 尝试转换Pascal命名为合适的格式
    const pascalName = contractName.charAt(0).toUpperCase() + contractName.slice(1);
    if (implementationAddresses && implementationAddresses[pascalName]) {
      return implementationAddresses[pascalName];
    }
    
    // 未找到实现合约地址
    return null;
  } catch (error) {
    logger.error(`获取实现合约地址失败 (${contractName}): ${error.message}`);
    return null;
  }
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
 * 获取所有实现合约地址
 * @returns {Object} 实现合约地址配置
 */
function getImplementationAddresses() {
  // 如果缓存为空，尝试重新加载
  if (Object.keys(implementationAddresses).length === 0 && Object.keys(contractAddresses).length === 0) {
    loadContractAddresses();
  }
  
  return { ...implementationAddresses };
}

/**
 * 获取合约实例
 * @param {string} contractName 合约名称
 * @param {ethers.Provider} provider 提供者
 * @returns {Promise<ethers.Contract>} 合约实例
 */
async function getContract(contractName, provider) {
  try {
    const address = getContractAddress(contractName);
    const abi = await getContractAbi(contractName);
    
    if (!provider) {
      throw new Error('需要提供有效的ethers Provider');
    }
    
    return new ethers.Contract(address, abi, provider);
  } catch (error) {
    logger.error(`创建合约 ${contractName} 实例失败: ${error.message}`, error);
    throw error;
  }
}

/**
 * 获取合约实现实例
 * @param {string} contractName 合约名称
 * @param {ethers.Provider} provider 提供者
 * @returns {Promise<ethers.Contract>} 实现合约实例
 */
async function getImplementationContract(contractName, provider) {
  try {
    const address = getImplementationAddress(contractName);
    const abi = await getContractAbi(contractName);
    
    if (!provider) {
      throw new Error('需要提供有效的ethers Provider');
    }
    
    return new ethers.Contract(address, abi, provider);
  } catch (error) {
    logger.error(`创建实现合约 ${contractName} 实例失败: ${error.message}`, error);
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
 * 更新实现合约地址
 * @param {string} contractName 合约名称
 * @param {string} address 实现合约地址
 */
function updateImplementationAddress(contractName, address) {
  if (!isValidEthereumAddress(address)) {
    throw new Error(`尝试更新的实现地址 ${address} 不是有效的以太坊地址`);
  }
  
  implementationAddresses[contractName] = address;
  logger.info(`更新了合约 ${contractName} 的实现地址: ${address}`);
  
  // 自动保存到deploy-state.json
  saveToDeployState();
}

/**
 * 保存当前合约地址到deploy-state.json
 */
function saveToDeployState() {
  try {
    // 确保部署状态文件存在
    if (!fs.existsSync(DEPLOY_STATE_PATH)) {
      const initialState = {
        contracts: {},
        implementations: {}
      };
      fs.writeFileSync(DEPLOY_STATE_PATH, JSON.stringify(initialState, null, 2));
    }
    
    // 读取当前状态
    const currentState = JSON.parse(fs.readFileSync(DEPLOY_STATE_PATH, 'utf8'));
    
    // 更新contracts字段
    if (!currentState.contracts) {
      currentState.contracts = {};
    }
    Object.assign(currentState.contracts, contractAddresses);
    
    // 更新implementations字段
    if (!currentState.implementations) {
      currentState.implementations = {};
    }
    Object.assign(currentState.implementations, implementationAddresses);
    
    // 保留旧格式的向后兼容
    Object.entries(contractAddresses).forEach(([key, value]) => {
      // 对于系统合约，保持驼峰命名
      if (/^[A-Z]/.test(key) && CONTRACT_NAMES.includes(key)) {
        const camelCaseKey = key.charAt(0).toLowerCase() + key.slice(1);
        currentState[camelCaseKey] = value;
      } else {
        currentState[key] = value;
      }
    });
    
    // 写入文件
    fs.writeFileSync(DEPLOY_STATE_PATH, JSON.stringify(currentState, null, 2));
    logger.info(`合约地址已保存到: ${DEPLOY_STATE_PATH}`);
    
    return true;
  } catch (error) {
    logger.error(`保存部署状态失败: ${error.message}`, error);
    return false;
  }
}

// 系统合约名列表
const CONTRACT_NAMES = [
  'RoleManager',
  'FeeManager',
  'PropertyRegistry',
  'RentDistributor',
  'TokenFactory',
  'RedemptionManager',
  'Marketplace',
  'TokenHolderQuery',
  'RealEstateSystem'
];

// 加载合约地址
loadContractAddresses();

// 导出模块API
module.exports = {
  getContractAddress,
  getImplementationAddress,
  getContractAddresses,
  getImplementationAddresses,
  getContract,
  getImplementationContract,
  updateContractAddress,
  updateImplementationAddress,
  saveToDeployState,
  DEPLOY_STATE_PATH,
  CONTRACT_NAMES
}; 