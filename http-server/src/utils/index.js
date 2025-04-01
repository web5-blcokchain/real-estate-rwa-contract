/**
 * 工具模块 - 从shared模块导入公共功能
 */

import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 计算shared模块的路径
const sharedPath = path.resolve(__dirname, '../../../shared/src');

// 导入shared模块的公共功能
const envModule = await import(`${sharedPath}/config/env.js`);
const networkModule = await import(`${sharedPath}/config/network.js`);
const sharedUtils = await import(`${sharedPath}/utils/index.js`);
const utils = sharedUtils.default;

// 导出所有工具
export default {
  // 环境配置
  EnvConfig: envModule.EnvConfig || utils.EnvConfig,
  
  // 网络配置
  NetworkConfig: networkModule.NetworkConfig || networkModule.default,
  
  // 合约工具
  getContract: utils.getContract,
  getContractWithSigner: utils.getContractWithSigner,
  getContractWithPrivateKey: utils.getContractWithPrivateKey,
  createContractFromAddress: utils.createContractFromAddress,
  connectContractWithRole: utils.connectContractWithRole,
  
  // 钱包工具
  getWallet: utils.getWallet,
  createWalletFromPrivateKey: utils.createWalletFromPrivateKey,
  getRoleByAddress: utils.getRoleByAddress,
  
  // 网络工具
  getDefaultProvider: utils.getDefaultProvider,
  getNetworkProvider: utils.getNetworkProvider,
  
  // ABI工具
  getContractABI: utils.getContractABI,
  
  // 日志工具
  logger: utils.logger
}; 