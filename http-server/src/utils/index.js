/**
 * 工具模块 - 从shared模块导入公共功能
 */

const path = require('path');
const fs = require('fs');

// 计算shared模块的路径
const sharedPath = path.resolve(__dirname, '../../../shared/src');

// 导入shared模块的公共功能
const envConfig = require(`${sharedPath}/config/env`);
const utils = require(`${sharedPath}/utils/index`);

// 创建一个统一的导出对象
const sharedUtils = {
  // 环境配置
  EnvConfig: envConfig.EnvConfig,
  env: envConfig,
  
  // 网络配置
  NetworkUtils: utils.NetworkUtils,
  networkUtils: utils.networkUtils,
  
  // 合约工具
  getContract: utils.getContract,
  getContractWithSigner: utils.getContractWithSigner,
  getContractWithPrivateKey: utils.getContractWithPrivateKey,
  createContractFromAddress: utils.createContractFromAddress,
  connectContractWithRole: utils.connectContractWithRole,
  createPropertyToken: utils.createPropertyToken,
  registerTokenForProperty: utils.registerTokenForProperty,
  
  // 钱包工具
  getWallet: utils.getWallet,
  createWalletFromPrivateKey: utils.createWalletFromPrivateKey,
  getRoleByAddress: utils.getRoleByAddress,
  
  // 网络工具
  getDefaultProvider: utils.getDefaultProvider,
  getNetworkProvider: utils.getNetworkProvider,
  
  // ABI工具
  getContractABI: utils.getContractABI,
  
  // 日志工具 - 使用共享模块的logger
  logger: utils.logger
};

module.exports = sharedUtils; 