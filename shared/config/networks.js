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
      // 初始化本地网络配置
      this._initLocalNetwork();
      
      // 初始化本地测试网络配置
      this._initLocalhostNetwork();
      
      // 初始化主网配置
      this._initMainnet();
      
      // 初始化测试网配置
      this._initTestnet();
      
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
  _initLocalNetwork() {
    const rpcUrl = getEnvVar('LOCAL_RPC_URL', 'http://127.0.0.1:8545');
    const chainId = parseInt(getEnvVar('LOCAL_CHAIN_ID', '31337'));
    const gasPrice = parseInt(getEnvVar('LOCAL_GAS_PRICE', '50000000000'));
    
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
    
    logger.debug('加载本地网络配置成功');
  }

  /**
   * 初始化localhost网络配置
   * @private
   */
  _initLocalhostNetwork() {
    const rpcUrl = getEnvVar('LOCAL_RPC_URL', 'http://127.0.0.1:8545');
    const chainId = parseInt(getEnvVar('LOCAL_CHAIN_ID', '31337'));
    const gasPrice = parseInt(getEnvVar('LOCAL_GAS_PRICE', '50000000000'));
    
    this.networks.localhost = {
      rpcUrl: rpcUrl,
      chainId: chainId,
      explorerUrl: '',
      name: 'Localhost Node',
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
    
    logger.debug('加载localhost网络配置成功');
  }

  /**
   * 初始化主网配置
   * @private
   */
  _initMainnet() {
    const rpcUrl = getEnvVar('MAINNET_RPC_URL', 'https://mainnet.infura.io/v3/your-api-key');
    const chainId = parseInt(getEnvVar('MAINNET_CHAIN_ID', '1'));
    const gasPrice = parseInt(getEnvVar('MAINNET_GAS_PRICE', '30000000000'));
    
    this.networks.mainnet = {
      rpcUrl: rpcUrl,
      chainId: chainId,
      explorerUrl: 'https://etherscan.io',
      name: 'Mainnet',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
      },
      confirmations: 2,
      defaultGasLimit: 3000000,
      defaultGasPrice: gasPrice / 1000000000,
      hardhatConfig: {
        url: rpcUrl,
        chainId: chainId,
        gasPrice: gasPrice
      }
    };
    
    logger.debug('加载主网配置成功');
  }

  /**
   * 初始化测试网配置
   * @private
   */
  _initTestnet() {
    const rpcUrl = getEnvVar('TESTNET_RPC_URL', 'https://sepolia.infura.io/v3/your-api-key');
    const chainId = parseInt(getEnvVar('TESTNET_CHAIN_ID', '11155111'));
    const gasPrice = parseInt(getEnvVar('TESTNET_GAS_PRICE', '10000000000'));
    
    this.networks.testnet = {
      rpcUrl: rpcUrl,
      chainId: chainId,
      explorerUrl: 'https://sepolia.etherscan.io',
      name: 'Testnet',
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
    
    logger.debug('加载测试网配置成功');
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