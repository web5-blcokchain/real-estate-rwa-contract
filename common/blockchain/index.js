/**
 * 区块链工具类集合
 * 聚合导出所有区块链相关工具
 */

const AddressUtils = require('./address');
const AbiUtils = require('./abi');
const ProviderManager = require('./provider');
const WalletManager = require('./wallet');
const ContractUtils = require('./contract');
const BlockchainUtils = require('./utils');

// 为了向后兼容，保留BlockchainManager的主要方法，但内部使用新的实现
const BlockchainManager = {
  // Provider管理
  getDefaultProvider: ProviderManager.getDefaultProvider.bind(ProviderManager),
  getProvider: ProviderManager.getNetworkProvider.bind(ProviderManager),
  
  // Wallet管理
  getDefaultWallet: WalletManager.getDefaultWallet.bind(WalletManager),
  getWallet: WalletManager.getNetworkWallet.bind(WalletManager),
  
  // 重置方法
  resetProvider: (name) => ProviderManager.resetProvider(name, true),
  resetWallet: (name) => WalletManager.resetWallet(name, true),
  resetAll: () => {
    ProviderManager.resetAll();
    WalletManager.resetAll();
  }
};

module.exports = {
  // 基础工具类
  AddressUtils,     // 地址工具
  AbiUtils,         // ABI工具
  ContractUtils,    // 合约工具
  BlockchainUtils,  // 辅助工具
  
  // 管理器
  ProviderManager,  // Provider管理
  WalletManager,    // 钱包管理
  BlockchainManager, // 向后兼容的管理器
  
  // 常用方法直接导出，方便使用
  isAddress: AddressUtils.isValid,
  getAddress: AddressUtils.toChecksum,
  parseUnits: ContractUtils.parseUnits,
  formatUnits: ContractUtils.formatUnits,
  keccak256: BlockchainUtils.keccak256
}; 