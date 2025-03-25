/**
 * 合约地址管理模块
 * 从部署状态文件和环境变量中加载合约地址
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 初始空配置
let contractAddresses = {
  roleManager: '',
  propertyRegistry: '',
  tokenFactory: '',
  redemptionManager: '',
  rentDistributor: '',
  feeManager: '',
  marketplace: '',
  tokenHolderQuery: '',
  realEstateSystem: ''
};

// 部署状态文件路径
const DEPLOY_STATE_FILE = path.join(process.cwd(), 'deploy-state.json');

/**
 * 从部署状态文件加载合约地址
 * @returns {Object} 合约地址映射
 */
function loadFromDeployState() {
  try {
    if (fs.existsSync(DEPLOY_STATE_FILE)) {
      const deployState = JSON.parse(fs.readFileSync(DEPLOY_STATE_FILE, 'utf8'));
      if (deployState.contracts) {
        // 转换合约名格式: RoleManager => roleManager
        Object.entries(deployState.contracts).forEach(([name, address]) => {
          const camelCaseName = name.charAt(0).toLowerCase() + name.slice(1);
          contractAddresses[camelCaseName] = address;
        });
        return deployState.contracts;
      }
    }
    return {};
  } catch (error) {
    console.warn(`Warning: Could not load contract addresses from deploy-state.json: ${error.message}`);
    return {};
  }
}

/**
 * 从环境变量加载合约地址
 * 优先使用环境变量中的地址
 */
function loadFromEnv() {
  // 环境变量名映射
  const envMapping = {
    roleManager: 'ROLE_MANAGER_ADDRESS',
    propertyRegistry: 'PROPERTY_REGISTRY_ADDRESS',
    tokenFactory: 'TOKEN_FACTORY_ADDRESS',
    redemptionManager: 'REDEMPTION_MANAGER_ADDRESS',
    rentDistributor: 'RENT_DISTRIBUTOR_ADDRESS',
    feeManager: 'FEE_MANAGER_ADDRESS',
    marketplace: 'MARKETPLACE_ADDRESS',
    tokenHolderQuery: 'TOKEN_HOLDER_QUERY_ADDRESS',
    realEstateSystem: 'REAL_ESTATE_SYSTEM_ADDRESS'
  };

  // 从环境变量加载地址
  Object.entries(envMapping).forEach(([configKey, envKey]) => {
    if (process.env[envKey]) {
      contractAddresses[configKey] = process.env[envKey];
    }
  });
}

/**
 * 获取所有合约地址
 * @returns {Object} 合约地址配置
 */
function getContractAddresses() {
  return { ...contractAddresses };
}

/**
 * 更新合约地址
 * @param {string} name 合约名称 (camelCase格式)
 * @param {string} address 合约地址
 */
function updateContractAddress(name, address) {
  if (contractAddresses.hasOwnProperty(name)) {
    contractAddresses[name] = address;
  }
}

/**
 * 保存合约地址到部署状态文件
 */
function saveToDeployState() {
  try {
    // 如果文件存在，读取现有状态
    let deployState = {};
    if (fs.existsSync(DEPLOY_STATE_FILE)) {
      deployState = JSON.parse(fs.readFileSync(DEPLOY_STATE_FILE, 'utf8'));
    }

    // 转换合约名格式: roleManager => RoleManager
    const contracts = {};
    Object.entries(contractAddresses).forEach(([name, address]) => {
      if (address) {
        const pascalCaseName = name.charAt(0).toUpperCase() + name.slice(1);
        contracts[pascalCaseName] = address;
      }
    });

    // 更新合约地址
    deployState.contracts = contracts;
    
    // 保存文件
    fs.writeFileSync(DEPLOY_STATE_FILE, JSON.stringify(deployState, null, 2));
    console.log('Contract addresses saved to deploy-state.json');
  } catch (error) {
    console.error(`Error saving contract addresses: ${error.message}`);
  }
}

// 初始化 - 加载合约地址
loadFromDeployState();
loadFromEnv();

module.exports = {
  addresses: contractAddresses,
  getContractAddresses,
  updateContractAddress,
  saveToDeployState
}; 