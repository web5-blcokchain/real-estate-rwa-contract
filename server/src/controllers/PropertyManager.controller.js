/**
 * PropertyManager合约控制器
 * 直接代理PropertyManager.json ABI文件中的所有方法
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../../../shared/src');
const { blockchainService } = require('../services');
const { processContractResult, sendResponse } = require('../utils/ContractUtils');

// 读取ABI文件
const abiPath = path.resolve(process.cwd(), 'config/abi/PropertyManager.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// 合约地址配置
const addressConfigPath = path.resolve(process.cwd(), 'config/contract-addresses.json');
let contractAddress;

// 从配置文件获取合约地址
if (fs.existsSync(addressConfigPath)) {
  const addressConfig = JSON.parse(fs.readFileSync(addressConfigPath, 'utf8'));
  const networkType = process.env.BLOCKCHAIN_NETWORK || 'localhost';
  contractAddress = addressConfig[networkType]?.PropertyManager;
}

// 如果配置文件中没有，尝试从环境变量获取
if (!contractAddress) {
  contractAddress = process.env.CONTRACT_PROPERTYMANAGER_ADDRESS;
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
      Logger.info('PropertyManager合约初始化成功', { address: contractAddress });
    }
    return contractInstance;
  } catch (error) {
    Logger.error(`PropertyManager合约初始化失败: ${error.message}`, { error });
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
    Logger.error('获取PropertyManager合约地址失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 注册新房产
 */
async function registerProperty(req, res) {
  try {
    const { propertyId, country, metadataURI } = req.body;
    
    if (!propertyId) {
      return sendResponse(res, { error: '缺少房产ID参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.registerProperty(
      propertyId,
      country || '',
      metadataURI || ''
    );
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    // 解析事件
    const event = receipt.events?.find(e => e.event === 'PropertyRegistered');
    const propertyIdHash = event ? event.args.propertyIdHash : null;
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      propertyIdHash: propertyIdHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('注册房产失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 更新房产状态
 */
async function updatePropertyStatus(req, res) {
  try {
    const { propertyIdHash, newStatus } = req.body;
    
    if (!propertyIdHash || newStatus === undefined) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.updatePropertyStatus(propertyIdHash, newStatus);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('更新房产状态失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 通过字符串ID更新房产状态
 */
async function updatePropertyStatusByStringId(req, res) {
  try {
    const { propertyId, newStatus } = req.body;
    
    if (!propertyId || newStatus === undefined) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.updatePropertyStatusByStringId(propertyId, newStatus);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('通过字符串ID更新房产状态失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 检查房产是否存在
 */
async function propertyExists(req, res) {
  try {
    const { propertyIdHash } = req.params;
    
    if (!propertyIdHash) {
      return sendResponse(res, { error: '缺少房产ID哈希参数' }, 400);
    }
    
    const contract = await initContract();
    const exists = await contract.propertyExists(propertyIdHash);
    
    sendResponse(res, { exists });
  } catch (error) {
    Logger.error('检查房产是否存在失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 通过字符串ID检查房产是否存在
 */
async function propertyExistsByStringId(req, res) {
  try {
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return sendResponse(res, { error: '缺少房产ID参数' }, 400);
    }
    
    const contract = await initContract();
    const exists = await contract.propertyExistsByStringId(propertyId);
    
    sendResponse(res, { exists });
  } catch (error) {
    Logger.error('通过字符串ID检查房产是否存在失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取房产状态
 */
async function getPropertyStatus(req, res) {
  try {
    const { propertyIdHash } = req.params;
    
    if (!propertyIdHash) {
      return sendResponse(res, { error: '缺少房产ID哈希参数' }, 400);
    }
    
    const contract = await initContract();
    const status = await contract.getPropertyStatus(propertyIdHash);
    
    sendResponse(res, { status: processContractResult(status) });
  } catch (error) {
    Logger.error('获取房产状态失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 通过字符串ID获取房产状态
 */
async function getPropertyStatusByStringId(req, res) {
  try {
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return sendResponse(res, { error: '缺少房产ID参数' }, 400);
    }
    
    const contract = await initContract();
    const status = await contract.getPropertyStatusByStringId(propertyId);
    
    sendResponse(res, { status: processContractResult(status) });
  } catch (error) {
    Logger.error('通过字符串ID获取房产状态失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 检查房产是否已批准
 */
async function isPropertyApproved(req, res) {
  try {
    const { propertyIdHash } = req.params;
    
    if (!propertyIdHash) {
      return sendResponse(res, { error: '缺少房产ID哈希参数' }, 400);
    }
    
    const contract = await initContract();
    const approved = await contract.isPropertyApproved(propertyIdHash);
    
    sendResponse(res, { approved });
  } catch (error) {
    Logger.error('检查房产是否已批准失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 为房产注册代币
 */
async function registerTokenForProperty(req, res) {
  try {
    const { propertyIdHash, tokenAddress } = req.body;
    
    if (!propertyIdHash || !tokenAddress) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.registerTokenForProperty(propertyIdHash, tokenAddress);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('为房产注册代币失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取所有房产哈希
 */
async function getAllPropertyHashes(req, res) {
  try {
    const contract = await initContract();
    const hashes = await contract.getAllPropertyHashes();
    
    sendResponse(res, { hashes: processContractResult(hashes) });
  } catch (error) {
    Logger.error('获取所有房产哈希失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取房产详情
 */
async function getPropertyDetails(req, res) {
  try {
    const { propertyIdHash } = req.params;
    
    if (!propertyIdHash) {
      return sendResponse(res, { error: '缺少房产ID哈希参数' }, 400);
    }
    
    const contract = await initContract();
    const details = await contract.getPropertyDetails(propertyIdHash);
    
    sendResponse(res, { 
      details: {
        status: processContractResult(details.status),
        registrationTime: processContractResult(details.registrationTime),
        country: details.country,
        metadataURI: details.metadataURI,
        tokenAddress: details.tokenAddress
      }
    });
  } catch (error) {
    Logger.error('获取房产详情失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 设置合约授权
 */
async function setContractAuthorization(req, res) {
  try {
    const { contractAddress: targetContract, authorized } = req.body;
    
    if (!targetContract || authorized === undefined) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.setContractAuthorization(targetContract, authorized);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('设置合约授权失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

module.exports = {
  getContractAddress,
  registerProperty,
  updatePropertyStatus,
  updatePropertyStatusByStringId,
  propertyExists,
  propertyExistsByStringId,
  getPropertyStatus,
  getPropertyStatusByStringId,
  isPropertyApproved,
  registerTokenForProperty,
  getAllPropertyHashes,
  getPropertyDetails,
  setContractAuthorization
}; 