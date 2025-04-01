/**
 * 工具集合导出
 * 方便统一导入各种工具
 */

// 使用CommonJS方式导入所有模块
const { ethers } = require('ethers');
const abiUtils = require('./abi');
const walletUtils = require('./wallet');
const contractUtils = require('./contract');
const networkUtils = require('./network');
const logger = require('../logger');
const EnvConfig = require('../config/env');

// 导出所有工具
module.exports = {
  // ABI工具
  getContractABI: abiUtils.getContractABI,
  
  // 网络工具
  getDefaultProvider: networkUtils.getDefaultProvider,
  getNetworkProvider: networkUtils.getNetworkProvider,
  getProviderByChainId: networkUtils.getProviderByChainId,
  NetworkUtils: networkUtils.NetworkUtils,
  networkUtils: networkUtils.networkUtils,
  
  // 钱包工具
  getWallet: walletUtils.getWallet,
  createWalletFromPrivateKey: walletUtils.createWalletFromPrivateKey,
  getRoleByAddress: walletUtils.getRoleByAddress,
  
  // 合约工具
  getContractAddress: contractUtils.getContractAddress,
  getContract: contractUtils.getContract,
  getContractWithSigner: contractUtils.getContractWithSigner,
  getContractWithPrivateKey: contractUtils.getContractWithPrivateKey,
  createContractFromAddress: contractUtils.createContractFromAddress,
  connectContractWithRole: contractUtils.connectContractWithRole,
  createPropertyToken: contractUtils.createPropertyToken,
  registerTokenForProperty: contractUtils.registerTokenForProperty,
  
  // 日志工具
  logger,
  
  // 环境配置
  EnvConfig,
  
  // 原始模块导出
  abi: abiUtils,
  network: networkUtils,
  wallet: walletUtils,
  contract: contractUtils
}; 