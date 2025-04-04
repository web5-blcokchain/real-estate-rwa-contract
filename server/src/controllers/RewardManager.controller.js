/**
 * RewardManager合约控制器
 * 直接代理RewardManager.json ABI文件中的所有方法
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../../../shared/src');
const { blockchainService } = require('../services');
const { AbiConfig, AddressConfig } = require('../../../shared/src/config');
const { processContractResult, sendResponse } = require('../utils/ContractUtils');

// 合约名称常量
const CONTRACT_NAME = 'RewardManager';

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
      Logger.info('RewardManager合约初始化成功', { address: contractAddress });
    }
    return contractInstance;
  } catch (error) {
    Logger.error(`RewardManager合约初始化失败: ${error.message}`, { error });
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
    Logger.error('获取RewardManager合约地址失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取支持的支付代币列表
 */
async function getSupportedPaymentTokens(req, res) {
  try {
    const contract = await initContract();
    const tokens = await contract.getSupportedPaymentTokens();
    sendResponse(res, { tokens: processContractResult(tokens) });
  } catch (error) {
    Logger.error('获取支持的支付代币列表失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 创建分配
 */
async function createDistribution(req, res) {
  try {
    const { 
      propertyIdHash, 
      tokenAddress, 
      amount, 
      distType, 
      description, 
      applyFees, 
      paymentToken 
    } = req.body;
    
    if (!propertyIdHash || !tokenAddress || !amount) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.createDistribution(
      propertyIdHash,
      tokenAddress,
      amount,
      distType || 0, // 默认为Dividend(0)
      description || '',
      applyFees !== undefined ? applyFees : true,
      paymentToken || ethers.constants.AddressZero
    );
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    // 解析事件找到分配ID
    const event = receipt.events?.find(e => e.event === 'DistributionCreated');
    const distributionId = event ? event.args.distributionId.toString() : null;
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      distributionId: distributionId,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('创建分配失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 提取分配
 */
async function withdrawDistribution(req, res) {
  try {
    const { distributionId } = req.body;
    
    if (!distributionId) {
      return sendResponse(res, { error: '缺少分配ID参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.withdrawDistribution(distributionId);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('提取分配失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取分配详情
 */
async function getDistribution(req, res) {
  try {
    const { distributionId } = req.params;
    
    if (!distributionId) {
      return sendResponse(res, { error: '缺少分配ID参数' }, 400);
    }
    
    const contract = await initContract();
    const distribution = await contract.getDistribution(distributionId);
    
    sendResponse(res, { distribution: processContractResult(distribution) });
  } catch (error) {
    Logger.error('获取分配详情失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取可用的分配金额
 */
async function getAvailableDistributionAmount(req, res) {
  try {
    const { distributionId, account } = req.params;
    
    if (!distributionId || !account) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    const result = await contract.getAvailableDistributionAmount(distributionId, account);
    
    sendResponse(res, { 
      available: processContractResult(result.available),
      canWithdraw: result.canWithdraw,
      paymentToken: result.paymentToken
    });
  } catch (error) {
    Logger.error('获取可用分配金额失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取房产所有分配
 */
async function getPropertyDistributions(req, res) {
  try {
    const { propertyIdHash } = req.params;
    
    if (!propertyIdHash) {
      return sendResponse(res, { error: '缺少房产ID参数' }, 400);
    }
    
    const contract = await initContract();
    const distributions = await contract.getPropertyDistributions(propertyIdHash);
    
    sendResponse(res, { distributions: processContractResult(distributions) });
  } catch (error) {
    Logger.error('获取房产分配列表失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取特定类型的所有分配
 */
async function getDistributionsByType(req, res) {
  try {
    const { distType } = req.params;
    
    if (distType === undefined) {
      return sendResponse(res, { error: '缺少分配类型参数' }, 400);
    }
    
    const contract = await initContract();
    const distributions = await contract.getDistributionsByType(distType);
    
    sendResponse(res, { distributions: processContractResult(distributions) });
  } catch (error) {
    Logger.error('获取特定类型分配列表失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取代币的所有分配
 */
async function getTokenDistributions(req, res) {
  try {
    const { tokenAddress } = req.params;
    
    if (!tokenAddress) {
      return sendResponse(res, { error: '缺少代币地址参数' }, 400);
    }
    
    const contract = await initContract();
    const distributions = await contract.getTokenDistributions(tokenAddress);
    
    sendResponse(res, { distributions: processContractResult(distributions) });
  } catch (error) {
    Logger.error('获取代币分配列表失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取分配总数
 */
async function getDistributionsCount(req, res) {
  try {
    const contract = await initContract();
    const count = await contract.getDistributionsCount();
    
    sendResponse(res, { count: processContractResult(count) });
  } catch (error) {
    Logger.error('获取分配总数失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取奖励信息
 */
async function getReward(req, res) {
  try {
    const { account } = req.query;
    
    if (!account) {
      return sendResponse(res, { error: '缺少账户地址参数' }, 400);
    }
    
    const contract = await initContract();
    const reward = await contract.getReward(account);
    
    sendResponse(res, { reward: processContractResult(reward) });
  } catch (error) {
    Logger.error('获取奖励信息失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 领取奖励
 */
async function claimReward(req, res) {
  try {
    const { distributionId } = req.body;
    
    if (!distributionId) {
      return sendResponse(res, { error: '缺少分配ID参数' }, 400);
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
    const tx = await signedContract.claimReward(distributionId);
    
    // 等待交易确认
    Logger.info(`交易已提交: ${tx.hash}`, { method: 'claimReward' });
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('领取奖励失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

module.exports = {
  getContractAddress,
  getSupportedPaymentTokens,
  createDistribution,
  withdrawDistribution,
  getDistribution,
  getAvailableDistributionAmount,
  getPropertyDistributions,
  getDistributionsByType,
  getTokenDistributions,
  getDistributionsCount,
  getReward,
  claimReward
}; 