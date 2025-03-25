/**
 * 配置模块
 * 集中管理所有配置项目
 */

require('dotenv').config({ path: '../../.env' });
const fs = require('fs');
const path = require('path');
const { getAbis } = require('../../../shared/utils/getAbis');
const { web3Provider } = require('../../../shared/utils/web3Provider');
const { contractService } = require('../../../shared/utils/contractService');
const { logger } = require('../utils/logger');

// 尝试读取部署状态文件
let deployedContracts = {};
try {
  const deployStateFile = path.join(__dirname, '../../../deploy-state.json');
  if (fs.existsSync(deployStateFile)) {
    deployedContracts = JSON.parse(fs.readFileSync(deployStateFile, 'utf8'));
  }
} catch (error) {
  console.warn('Warning: Could not load deployment state file:', error.message);
}

// 服务器配置
const serverConfig = {
  port: process.env.SERVER_PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// 区块链网络配置
const networkConfig = {
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  chainId: parseInt(process.env.CHAIN_ID || '31337'),
  privateKey: process.env.ADMIN_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
};

// 合约地址配置
const contractAddresses = {
  roleManager: process.env.ROLE_MANAGER_ADDRESS || deployedContracts.roleManager || '',
  propertyRegistry: process.env.PROPERTY_REGISTRY_ADDRESS || deployedContracts.propertyRegistry || '',
  tokenFactory: process.env.TOKEN_FACTORY_ADDRESS || deployedContracts.tokenFactory || '',
  redemptionManager: process.env.REDEMPTION_MANAGER_ADDRESS || deployedContracts.redemptionManager || '',
  rentDistributor: process.env.RENT_DISTRIBUTOR_ADDRESS || deployedContracts.rentDistributor || '',
  feeManager: process.env.FEE_MANAGER_ADDRESS || deployedContracts.feeManager || '',
  marketplace: process.env.MARKETPLACE_ADDRESS || deployedContracts.marketplace || '',
  tokenHolderQuery: process.env.TOKEN_HOLDER_QUERY_ADDRESS || deployedContracts.tokenHolderQuery || '',
  realEstateSystem: process.env.REAL_ESTATE_SYSTEM_ADDRESS || deployedContracts.realEstateSystem || ''
};

// 操作权限配置 - 定义每种操作需要的角色
const operationRoles = {
  // 房产管理
  registerProperty: 'operator',
  approveProperty: 'admin',
  rejectProperty: 'admin',
  delistProperty: 'admin',
  setPropertyStatus: 'admin',
  
  // 代币管理
  createToken: 'admin',
  updateTokenImplementation: 'admin',
  addToWhitelist: 'operator',
  batchAddToWhitelist: 'operator',
  removeFromWhitelist: 'operator',
  batchRemoveFromWhitelist: 'operator',
  
  // 赎回管理
  approveRedemption: 'finance',
  rejectRedemption: 'finance',
  completeRedemption: 'finance',
  addSupportedStablecoin: 'admin',
  removeSupportedStablecoin: 'admin',
  emergencyWithdraw: 'emergency',
  
  // 租金管理
  distributeRent: 'finance',
  liquidateUnclaimedRent: 'finance'
};

// ABI文件路径配置
const getAbiPath = (contractName) => {
  return path.join(__dirname, `../../../artifacts/contracts/${contractName}.sol/${contractName}.json`);
};

// 导出共享的工具
module.exports = {
  serverConfig,
  networkConfig,
  contractAddresses,
  operationRoles,
  getAbiPath,
  getAbis,
  web3Provider,
  contractService,
  logger
};