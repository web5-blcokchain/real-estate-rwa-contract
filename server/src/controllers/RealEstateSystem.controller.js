/**
 * RealEstateSystem合约控制器
 * 直接代理RealEstateSystem.json ABI文件中的所有方法
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../../../shared/src/utils');
const { blockchainService } = require('../services');
const { processContractResult, sendResponse } = require('../utils/ContractUtils');

// 读取ABI文件
const abiPath = path.resolve(process.cwd(), 'config/abi/RealEstateSystem.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// 合约地址配置
const addressConfigPath = path.resolve(process.cwd(), 'config/contract-addresses.json');
let contractAddress;

// 从配置文件获取合约地址
if (fs.existsSync(addressConfigPath)) {
  const addressConfig = JSON.parse(fs.readFileSync(addressConfigPath, 'utf8'));
  const networkType = process.env.BLOCKCHAIN_NETWORK || 'localhost';
  contractAddress = addressConfig[networkType]?.RealEstateSystem;
}

// 如果配置文件中没有，尝试从环境变量获取
if (!contractAddress) {
  contractAddress = process.env.CONTRACT_REALESTATESYSTEM_ADDRESS;
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
      Logger.info('RealEstateSystem合约初始化成功', { address: contractAddress });
    }
    return contractInstance;
  } catch (error) {
    Logger.error(`RealEstateSystem合约初始化失败: ${error.message}`, { error });
    throw error;
  }
}

/**
 * 获取合约地址
 */
async function getContractAddress(req, res) {
  try {
    return sendResponse(res, { address: contractAddress });
  } catch (error) {
    Logger.error(`获取RealEstateSystem合约地址失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * getContractAddresses - 获取系统中所有合约地址
 */
async function getContractAddresses(req, res) {
  try {
    const contract = await initContract();
    const result = await contract.getContractAddresses();
    return sendResponse(res, processContractResult(result));
  } catch (error) {
    Logger.error(`调用RealEstateSystem.getContractAddresses失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * getSystemStats - 获取系统统计数据
 */
async function getSystemStats(req, res) {
  try {
    const contract = await initContract();
    const result = await contract.getSystemStats();
    return sendResponse(res, processContractResult(result));
  } catch (error) {
    Logger.error(`调用RealEstateSystem.getSystemStats失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * updateContract - 更新系统中的合约地址
 */
async function updateContract(req, res) {
  try {
    const { contractName, contractAddress: targetAddress } = req.body;
    
    if (!contractName || !targetAddress) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    // 获取私钥
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) {
      return sendResponse(res, { error: '未配置区块链私钥，无法发送交易' }, 400);
    }
    
    // 初始化区块链服务
    await blockchainService.initialize();
    
    // 获取带签名者的合约实例
    const signedContract = blockchainService.getSignedContractInstance(abi, contractAddress, privateKey);
    
    // 发送交易
    const tx = await signedContract.updateContract(contractName, targetAddress);
    
    // 等待交易确认
    Logger.info(`交易已提交: ${tx.hash}`, { method: 'updateContract' });
    const receipt = await tx.wait();
    
    return sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('更新合约地址失败', { error });
    return sendResponse(res, { error: error.message }, 500);
  }
}

// RealEstateSystem特有的其他方法...

// 导出所有方法
module.exports = {
  getContractAddress,
  getContractAddresses,
  getSystemStats,
  updateContract,
  // 其他方法...
}; 