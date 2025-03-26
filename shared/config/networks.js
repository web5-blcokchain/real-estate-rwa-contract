const { getHardhatConfigPath, validatePath } = require('../utils/paths');
const logger = require('../utils/logger');
const { getEnvVar } = require('./environment');

/**
 * 网络配置管理器
 * 直接从环境变量读取网络配置
 */
class NetworkConfigManager {
  constructor() {
    this.networks = {};
    this.initialized = false;
  }

  /**
   * 初始化网络配置
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // 初始化hardhat网络配置
      this._initHardhatNetwork();
      
      // 初始化BSC主网配置
      this._initBscMainnet();
      
      // 初始化BSC测试网配置
      this._initBscTestnet();
      
      this.initialized = true;
      logger.info(`成功从环境变量加载了${Object.keys(this.networks).length}个网络配置`);
    } catch (error) {
      logger.error('初始化网络配置失败:', error);
      throw error;
    }
  }

  /**
   * 初始化本地hardhat网络配置
   * @private
   */
  _initHardhatNetwork() {
    const rpcUrl = getEnvVar('HARDHAT_RPC_URL', 'http://127.0.0.1:8545');
    const chainId = parseInt(getEnvVar('HARDHAT_CHAIN_ID', '31337'));
    const gasPrice = parseInt(getEnvVar('HARDHAT_GAS_PRICE', '50000000000'));
    
    this.networks.hardhat = {
      rpcUrl: rpcUrl,
      chainId: chainId,
      explorerUrl: '',
      name: 'Hardhat Local',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
      },
      confirmations: 1,
      defaultGasLimit: 3000000,
      defaultGasPrice: gasPrice / 1000000000,
      hardhatConfig: {
        url: rpcUrl,
        chainId: chainId,
        gasPrice: gasPrice
      }
    };
    
    logger.debug('加载hardhat网络配置成功');
  }

  /**
   * 初始化BSC主网配置
   * @private
   */
  _initBscMainnet() {
    const rpcUrl = getEnvVar('MAINNET_RPC_URL', 'https://bsc-dataseed.binance.org/');
    const chainId = parseInt(getEnvVar('MAINNET_CHAIN_ID', '56'));
    const gasPrice = parseInt(getEnvVar('MAINNET_GAS_PRICE', '5000000000'));
    
    this.networks.bsc_mainnet = {
      rpcUrl: rpcUrl,
      chainId: chainId,
      explorerUrl: 'https://bscscan.com',
      name: 'BSC Mainnet',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      },
      confirmations: 1,
      defaultGasLimit: 3000000,
      defaultGasPrice: gasPrice / 1000000000,
      hardhatConfig: {
        url: rpcUrl,
        chainId: chainId,
        gasPrice: gasPrice
      }
    };
    
    logger.debug('加载BSC主网配置成功');
  }

  /**
   * 初始化BSC测试网配置
   * @private
   */
  _initBscTestnet() {
    const rpcUrl = getEnvVar('TESTNET_RPC_URL', 'https://data-seed-prebsc-1-s1.binance.org:8545/');
    const chainId = parseInt(getEnvVar('TESTNET_CHAIN_ID', '97'));
    const gasPrice = parseInt(getEnvVar('TESTNET_GAS_PRICE', '10000000000'));
    
    this.networks.bsc_testnet = {
      rpcUrl: rpcUrl,
      chainId: chainId,
      explorerUrl: 'https://testnet.bscscan.com',
      name: 'BSC Testnet',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      },
      confirmations: 1,
      defaultGasLimit: 3000000,
      defaultGasPrice: gasPrice / 1000000000,
      hardhatConfig: {
        url: rpcUrl,
        chainId: chainId,
        gasPrice: gasPrice
      }
    };
    
    logger.debug('加载BSC测试网配置成功');
  }

  /**
   * 获取网络配置
   * @param {string} network 网络名称
   * @returns {Object} 网络配置
   */
  getNetworkConfig(network) {
    this._ensureInitialized();
    
    if (!this.networks[network]) {
      throw new Error(`未找到网络配置: ${network}`);
    }
    
    logger.info(`加载网络配置: ${network}, 链ID: ${this.networks[network].chainId}`);
    return this.networks[network];
  }

  /**
   * 获取所有可用网络
   * @returns {string[]} 网络名称列表
   */
  getAvailableNetworks() {
    this._ensureInitialized();
    return Object.keys(this.networks);
  }

  /**
   * 验证网络配置
   * @param {Object} config 网络配置
   * @returns {boolean} 是否有效
   */
  validateNetworkConfig(config) {
    const requiredFields = ['rpcUrl', 'chainId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      logger.error(`网络配置缺少必要字段: ${missingFields.join(', ')}`);
      return false;
    }
    
    return true;
  }

  /**
   * 确保管理器已初始化
   * @private
   */
  _ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

// 创建单例实例
const networkConfigManager = new NetworkConfigManager();

// 导出网络配置方法
module.exports = {
  getNetworkConfig: (network) => networkConfigManager.getNetworkConfig(network),
  getAvailableNetworks: () => networkConfigManager.getAvailableNetworks(),
  validateNetworkConfig: (config) => networkConfigManager.validateNetworkConfig(config),
  networkConfigManager
}; 