/**
 * RoleManager合约控制器
 * 直接代理RoleManager.json ABI文件中的所有方法
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../../../shared/src');
const { blockchainService } = require('../services');
const { AbiConfig, AddressConfig } = require('../../../shared/src/config');
const { processContractResult, sendResponse } = require('../utils/ContractUtils');

// 合约名称常量
const CONTRACT_NAME = 'RoleManager';

// 使用AbiConfig获取ABI
let abi;
try {
  const abiInfo = AbiConfig.getContractAbi(CONTRACT_NAME);
  abi = abiInfo.abi;
  Logger.info(`成功加载${CONTRACT_NAME}的ABI`, { source: abiInfo.source });
} catch (error) {
  // 尝试使用项目根目录路径加载
  const projectRootPath = process.env.PROJECT_PATH || path.resolve(__dirname, '../../..');
  const abiPath = path.resolve(projectRootPath, `config/abi/${CONTRACT_NAME}.json`);
  if (fs.existsSync(abiPath)) {
    Logger.info(`使用项目根目录路径加载ABI: ${abiPath}`);
    abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  } else {
    Logger.error(`无法找到${CONTRACT_NAME}的ABI文件: ${abiPath}`);
    throw new Error(`无法找到${CONTRACT_NAME}的ABI文件: ${abiPath}`);
  }
}

// 使用AddressConfig获取合约地址
let contractAddress;
try {
  contractAddress = AddressConfig.getContractAddress(CONTRACT_NAME);
  Logger.info(`成功获取${CONTRACT_NAME}合约地址`, { address: contractAddress });
} catch (error) {
  // 如果通过AddressConfig获取失败，尝试从环境变量获取
  const envKey = `CONTRACT_${CONTRACT_NAME.toUpperCase()}_ADDRESS`;
  contractAddress = process.env[envKey];
  if (!contractAddress) {
    Logger.warn(`无法从AddressConfig或环境变量获取${CONTRACT_NAME}合约地址`);
  } else {
    Logger.info(`从环境变量获取${CONTRACT_NAME}合约地址`, { address: contractAddress });
  }
}

// 合约实例
let contractInstance = null;

/**
 * 初始化合约实例
 */
async function initContract() {
  try {
    if (!contractInstance) {
      await blockchainService.initialize();
      contractInstance = blockchainService.getContractInstance(abi, contractAddress);
      Logger.info('RoleManager合约初始化成功', { address: contractAddress });
    }
    return contractInstance;
  } catch (error) {
    Logger.error(`RoleManager合约初始化失败: ${error.message}`, { error });
    throw error;
  }
}

/**
 * 获取合约地址
 */
async function getContractAddress(req, res) {
  try {
    sendResponse(res, { address: contractAddress });
  } catch (error) {
    Logger.error('获取RoleManager合约地址失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 检查地址是否有特定角色
 */
async function hasRole(req, res) {
  try {
    const { role, account } = req.params;
    
    if (!role || !account) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    const hasRole = await contract.hasRole(role, account);
    
    sendResponse(res, { hasRole });
  } catch (error) {
    Logger.error('检查角色失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 为地址授予特定角色
 */
async function grantRole(req, res) {
  try {
    const { role, account } = req.body;
    
    if (!role || !account) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.grantRole(role, account);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('授予角色失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 撤销地址的特定角色
 */
async function revokeRole(req, res) {
  try {
    const { role, account } = req.body;
    
    if (!role || !account) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.revokeRole(role, account);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('撤销角色失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 转移管理员权限到新地址
 */
async function transferAdminRole(req, res) {
  try {
    const { newAdmin } = req.body;
    
    if (!newAdmin) {
      return sendResponse(res, { error: '缺少新管理员地址参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.transferAdminRole(newAdmin);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('转移管理员权限失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 批量授予地址特定角色
 */
async function batchGrantRole(req, res) {
  try {
    const { role, accounts } = req.body;
    
    if (!role || !accounts || !Array.isArray(accounts)) {
      return sendResponse(res, { error: '缺少必要参数或accounts不是数组' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.batchGrantRole(role, accounts);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('批量授予角色失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 批量撤销地址的特定角色
 */
async function batchRevokeRole(req, res) {
  try {
    const { role, accounts } = req.body;
    
    if (!role || !accounts || !Array.isArray(accounts)) {
      return sendResponse(res, { error: '缺少必要参数或accounts不是数组' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.batchRevokeRole(role, accounts);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('批量撤销角色失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 激活紧急模式
 */
async function activateEmergencyMode(req, res) {
  try {
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.activateEmergencyMode();
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('激活紧急模式失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 取消激活紧急模式
 */
async function deactivateEmergencyMode(req, res) {
  try {
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.deactivateEmergencyMode();
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('取消激活紧急模式失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取紧急模式状态
 */
async function getEmergencyModeStatus(req, res) {
  try {
    const contract = await initContract();
    const status = await contract.emergencyMode();
    
    sendResponse(res, { emergencyMode: status });
  } catch (error) {
    Logger.error('获取紧急模式状态失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取系统版本
 */
async function getVersion(req, res) {
  try {
    const contract = await initContract();
    const version = await contract.getVersion();
    
    sendResponse(res, { version: processContractResult(version) });
  } catch (error) {
    Logger.error('获取系统版本失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取角色常量
 */
async function getRoleConstants(req, res) {
  try {
    const contract = await initContract();
    
    const [adminRole, managerRole, operatorRole, pauserRole, upgraderRole] = await Promise.all([
      contract.ADMIN_ROLE(),
      contract.MANAGER_ROLE(),
      contract.OPERATOR_ROLE(),
      contract.PAUSER_ROLE(),
      contract.UPGRADER_ROLE()
    ]);
    
    sendResponse(res, { 
      ADMIN_ROLE: adminRole,
      MANAGER_ROLE: managerRole,
      OPERATOR_ROLE: operatorRole,
      PAUSER_ROLE: pauserRole,
      UPGRADER_ROLE: upgraderRole
    });
  } catch (error) {
    Logger.error('获取角色常量失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

module.exports = {
  getContractAddress,
  hasRole,
  grantRole,
  revokeRole,
  transferAdminRole,
  batchGrantRole,
  batchRevokeRole,
  activateEmergencyMode,
  deactivateEmergencyMode,
  getEmergencyModeStatus,
  getVersion,
  getRoleConstants
}; 