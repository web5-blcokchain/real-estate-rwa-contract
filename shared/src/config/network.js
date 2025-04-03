const { Validation } = require('../utils/validation');
const { ConfigError } = require('../utils/errors');
const EnvConfig = require('./env');

/**
 * 网络配置类
 */
class NetworkConfig {
  /**
   * 网络类型常量
   */
  static NETWORK_TYPES = {
    LOCALHOST: 'localhost',
    TESTNET: 'testnet',
    MAINNET: 'mainnet'
  };

  /**
   * 加载网络配置
   * @param {Object} envConfig - 环境变量配置
   * @returns {Object} 网络配置
   */
  static load(envConfig) {
    try {
      // 验证网络配置
      this._validateNetworkConfig(envConfig);

      // 确保网络类型标准化（local 转为 localhost）
      const networkType = this._normalizeNetworkType(envConfig.NETWORK_TYPE);

      return {
        type: networkType,
        url: envConfig.NETWORK_URL,
        chainId: envConfig.NETWORK_CHAIN_ID,
        // 网络特定配置
        ...this._getNetworkSpecificConfig(networkType)
      };
    } catch (error) {
      throw new ConfigError(`加载网络配置失败: ${error.message}`);
    }
  }

  /**
   * 验证网络配置
   * @private
   * @param {Object} envConfig - 环境变量配置
   */
  static _validateNetworkConfig(envConfig) {
    // 标准化网络类型后再验证
    const normalizedType = this._normalizeNetworkType(envConfig.NETWORK_TYPE);
    
    // 验证网络类型
    Validation.validate(
      Validation.isValidNetworkType(normalizedType),
      '无效的网络类型'
    );

    // 验证网络URL
    Validation.validate(
      typeof envConfig.NETWORK_URL === 'string' && envConfig.NETWORK_URL.length > 0,
      '无效的网络URL'
    );

    // 验证链ID
    Validation.validate(
      typeof envConfig.NETWORK_CHAIN_ID === 'number' && envConfig.NETWORK_CHAIN_ID > 0,
      '无效的链ID'
    );
  }

  /**
   * 标准化网络类型
   * @private
   * @param {string} networkType - 网络类型
   * @returns {string} 标准化后的网络类型
   */
  static _normalizeNetworkType(networkType) {
    if (!networkType) return this.NETWORK_TYPES.LOCALHOST;
    return networkType.toLowerCase() === 'local' ? this.NETWORK_TYPES.LOCALHOST : networkType.toLowerCase();
  }

  /**
   * 获取网络特定配置
   * @private
   * @param {string} networkType - 网络类型
   * @returns {Object} 网络特定配置
   */
  static _getNetworkSpecificConfig(networkType) {
    // 使用已标准化的网络类型
    const normalizedType = this._normalizeNetworkType(networkType);
    
    const configs = {
      [this.NETWORK_TYPES.LOCALHOST]: {
        name: 'Localhost Network',
        explorer: 'http://localhost:4000',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      [this.NETWORK_TYPES.TESTNET]: {
        name: 'Test Network',
        explorer: 'https://testnet.etherscan.io',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      },
      [this.NETWORK_TYPES.MAINNET]: {
        name: 'Ethereum Mainnet',
        explorer: 'https://etherscan.io',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        }
      }
    };

    return configs[normalizedType] || configs[this.NETWORK_TYPES.LOCALHOST];
  }

  /**
   * 获取当前网络配置
   * @returns {Object} 网络配置
   */
  static getCurrentNetwork() {
    return EnvConfig.getNetworkConfig();
  }

  /**
   * 获取网络类型
   * @returns {string} 网络类型
   */
  static getNetworkType() {
    return EnvConfig.getNetworkType();
  }

  /**
   * 检查是否本地网络
   * @param {string} [networkType] - 网络类型，如果不提供则使用当前配置
   * @returns {boolean} 是否本地网络
   */
  static isLocalNetwork(networkType) {
    const type = networkType || EnvConfig.getNetworkType();
    return this._normalizeNetworkType(type) === this.NETWORK_TYPES.LOCALHOST;
  }

  /**
   * 检查是否测试网络
   * @param {string} [networkType] - 网络类型，如果不提供则使用当前配置
   * @returns {boolean} 是否测试网络
   */
  static isTestNetwork(networkType) {
    const type = networkType || EnvConfig.getNetworkType();
    return this._normalizeNetworkType(type) === this.NETWORK_TYPES.TESTNET;
  }

  /**
   * 检查是否主网
   * @param {string} [networkType] - 网络类型，如果不提供则使用当前配置
   * @returns {boolean} 是否主网
   */
  static isMainNetwork(networkType) {
    const type = networkType || EnvConfig.getNetworkType();
    return this._normalizeNetworkType(type) === this.NETWORK_TYPES.MAINNET;
  }

  /**
   * 获取网络名称
   * @returns {string} 网络名称
   */
  static getNetworkName() {
    return this.getCurrentNetwork().name;
  }

  /**
   * 获取RPC URL
   * @returns {string} RPC URL
   */
  static getRpcUrl() {
    return this.getCurrentNetwork().rpcUrl;
  }

  /**
   * 获取链ID
   * @returns {number} 链ID
   */
  static getChainId() {
    return this.getCurrentNetwork().chainId;
  }

  /**
   * 获取区块浏览器URL
   * @param {string} txHash - 交易哈希（可选）
   * @returns {string} 区块浏览器URL
   */
  static getExplorerUrl(txHash) {
    const networkConfig = EnvConfig.getNetworkConfig();
    let url = networkConfig.explorer || this._getNetworkSpecificConfig(networkConfig.type).explorer;
    
    if (txHash) {
      return `${url}/tx/${txHash}`;
    }
    return url;
  }
}

module.exports = NetworkConfig; 