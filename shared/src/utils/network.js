/**
 * 网络连接工具
 * 统一管理Provider的获取逻辑
 */
const { ethers } = require('ethers');
const envConfig = require('../config/env');

/**
 * 区块链网络配置工具
 * 根据BLOCKCHAIN_NETWORK环境变量提供相应的网络配置
 */

class NetworkUtils {
  constructor() {
    // 从env配置中获取区块链网络环境
    this.network = envConfig.get('BLOCKCHAIN_NETWORK') || 'localhost';
    this.config = this.getNetworkConfig();
  }

  /**
   * 获取网络配置
   * @returns {Object} 网络配置对象
   */
  getNetworkConfig() {
    switch (this.network) {
      case 'localhost':
        return {
          chainId: envConfig.getInt('LOCALHOST_CHAIN_ID'),
          rpcUrl: envConfig.get('LOCALHOST_RPC_URL'),
          name: 'Local Development',
          isTestnet: true,
          isMainnet: false,
          explorerUrl: envConfig.get('ETHERSCAN_BROWSER_URL'),
          explorerApiUrl: envConfig.get('ETHERSCAN_API_URL'),
          explorerApiKey: envConfig.get('ETHERSCAN_API_KEY')
        };
      
      case 'testnet':
        return {
          chainId: envConfig.getInt('TESTNET_CHAIN_ID'),
          rpcUrl: envConfig.get('TESTNET_RPC_URL'),
          name: 'Testnet',
          isTestnet: true,
          isMainnet: false,
          explorerUrl: envConfig.get('ETHERSCAN_BROWSER_URL'),
          explorerApiUrl: envConfig.get('ETHERSCAN_API_URL'),
          explorerApiKey: envConfig.get('ETHERSCAN_API_KEY')
        };
      
      case 'mainnet':
        return {
          chainId: envConfig.getInt('MAINNET_CHAIN_ID'),
          rpcUrl: envConfig.get('MAINNET_RPC_URL'),
          name: 'Mainnet',
          isTestnet: false,
          isMainnet: true,
          explorerUrl: envConfig.get('ETHERSCAN_BROWSER_URL'),
          explorerApiUrl: envConfig.get('ETHERSCAN_API_URL'),
          explorerApiKey: envConfig.get('ETHERSCAN_API_KEY')
        };
      
      default:
        throw new Error(`Unsupported blockchain network: ${this.network}`);
    }
  }

  /**
   * 获取当前网络配置
   * @returns {Object} 当前网络配置
   */
  getCurrentNetwork() {
    return this.config;
  }

  /**
   * 获取当前区块链网络名称
   * @returns {string} 网络名称
   */
  getBlockchainNetwork() {
    return this.network;
  }

  /**
   * 获取RPC URL
   * @returns {string} RPC URL
   */
  getRpcUrl() {
    return this.config.rpcUrl;
  }

  /**
   * 获取链ID
   * @returns {number} 链ID
   */
  getChainId() {
    return this.config.chainId;
  }

  /**
   * 获取网络名称
   * @returns {string} 网络名称
   */
  getNetworkName() {
    return this.config.name;
  }

  /**
   * 是否是测试网
   * @returns {boolean} 是否是测试网
   */
  isTestnet() {
    return this.config.isTestnet;
  }

  /**
   * 是否是主网
   * @returns {boolean} 是否是主网
   */
  isMainnet() {
    return this.config.isMainnet;
  }

  /**
   * 获取区块浏览器URL
   * @returns {string} 区块浏览器URL
   */
  getExplorerUrl() {
    return this.config.explorerUrl;
  }

  /**
   * 获取区块浏览器API URL
   * @returns {string} 区块浏览器API URL
   */
  getExplorerApiUrl() {
    return this.config.explorerApiUrl;
  }

  /**
   * 获取区块浏览器API密钥
   * @returns {string} 区块浏览器API密钥
   */
  getExplorerApiKey() {
    return this.config.explorerApiKey;
  }

  /**
   * 获取完整的网络配置对象
   * @returns {Object} 网络配置对象
   */
  getConfig() {
    return this.config;
  }

  /**
   * 获取网络提供者
   * @returns {ethers.Provider} 网络提供者实例
   */
  getProvider() {
    return new ethers.JsonRpcProvider(this.getRpcUrl());
  }

  /**
   * 获取带签名者的网络提供者
   * @param {string} privateKey - 私钥
   * @returns {ethers.Wallet} 带签名者的网络提供者实例
   */
  getSigner(privateKey) {
    const provider = this.getProvider();
    return new ethers.Wallet(privateKey, provider);
  }
}

// 创建单例实例
const networkUtils = new NetworkUtils();

// 导出通用的网络功能
function getDefaultProvider() {
  return networkUtils.getProvider();
}

function getNetworkProvider(network) {
  // 可以根据需要创建特定网络的提供者
  return new ethers.JsonRpcProvider(
    network === 'localhost' ? envConfig.get('LOCALHOST_RPC_URL') :
    network === 'testnet' ? envConfig.get('TESTNET_RPC_URL') :
    network === 'mainnet' ? envConfig.get('MAINNET_RPC_URL') :
    envConfig.get('LOCALHOST_RPC_URL')
  );
}

function getProviderByChainId(chainId) {
  // 根据链ID获取提供者
  return new ethers.JsonRpcProvider(
    chainId === envConfig.getInt('LOCALHOST_CHAIN_ID') ? envConfig.get('LOCALHOST_RPC_URL') :
    chainId === envConfig.getInt('TESTNET_CHAIN_ID') ? envConfig.get('TESTNET_RPC_URL') :
    chainId === envConfig.getInt('MAINNET_CHAIN_ID') ? envConfig.get('MAINNET_RPC_URL') :
    envConfig.get('LOCALHOST_RPC_URL')
  );
}

// 导出模块
module.exports = {
  getDefaultProvider,
  getNetworkProvider,
  getProviderByChainId,
  NetworkUtils,
  // 导出单例实例
  networkUtils,
  // 导出实例方法
  getCurrentNetwork: networkUtils.getCurrentNetwork.bind(networkUtils),
  getBlockchainNetwork: networkUtils.getBlockchainNetwork.bind(networkUtils),
  getRpcUrl: networkUtils.getRpcUrl.bind(networkUtils),
  getChainId: networkUtils.getChainId.bind(networkUtils),
  getNetworkName: networkUtils.getNetworkName.bind(networkUtils),
  isTestnet: networkUtils.isTestnet.bind(networkUtils),
  isMainnet: networkUtils.isMainnet.bind(networkUtils),
  getExplorerUrl: networkUtils.getExplorerUrl.bind(networkUtils),
  getExplorerApiUrl: networkUtils.getExplorerApiUrl.bind(networkUtils),
  getExplorerApiKey: networkUtils.getExplorerApiKey.bind(networkUtils),
  getConfig: networkUtils.getConfig.bind(networkUtils),
  getProvider: networkUtils.getProvider.bind(networkUtils),
  getSigner: networkUtils.getSigner.bind(networkUtils)
}; 