/**
 * 区块链服务
 * 提供与区块链网络的交互功能
 */
const { Provider, Logger, ErrorHandler } = require('../../../shared/src');

/**
 * 区块链服务类
 */
class BlockchainService {
  /**
   * 构造函数
   */
  constructor() {
    this.provider = null;
    this.networkType = null;
    this.initialized = false;
  }

  /**
   * 初始化区块链服务
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (this.initialized) {
        return;
      }

      Logger.info('初始化区块链服务');
      
      // 获取网络类型
      this.networkType = process.env.BLOCKCHAIN_NETWORK || 'localhost';
      
      // 创建Provider
      this.provider = await Provider.create({
        networkType: this.networkType
      });

      // 验证连接
      const network = await Provider.getNetwork(this.provider);
      Logger.info(`已连接到区块链网络: ${this.networkType}`, {
        chainId: network.chainId,
        name: network.name
      });

      this.initialized = true;
      return true;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'network',
        context: {
          method: 'initialize',
          networkType: this.networkType
        }
      });
      Logger.error(`区块链服务初始化失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取网络类型
   * @returns {string} 网络类型
   */
  getNetworkType() {
    return this.networkType;
  }

  /**
   * 检查连接状态
   * @returns {Promise<boolean>} 是否已连接
   */
  async isConnected() {
    try {
      if (!this.initialized) {
        return false;
      }
      
      const network = await Provider.getNetwork(this.provider);
      return !!network.chainId;
    } catch (error) {
      Logger.warn(`检查网络连接失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取网络信息
   * @returns {Promise<Object>} 网络信息
   */
  async getNetworkInfo() {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      const network = await Provider.getNetwork(this.provider);
      const blockNumber = await Provider.getBlockNumber(this.provider);
      const gasPrice = await Provider.getGasPrice(this.provider);
      
      return {
        networkType: this.networkType,
        chainId: network.chainId,
        name: network.name,
        blockNumber,
        gasPrice: gasPrice.toString(),
        formattedGasPrice: `${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`,
        isConnected: true
      };
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'network',
        context: { method: 'getNetworkInfo' }
      });
      Logger.error(`获取网络信息失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取Provider实例
   * @returns {Object} Provider实例
   */
  getProvider() {
    if (!this.initialized) {
      throw new Error('区块链服务尚未初始化');
    }
    return this.provider;
  }
}

// 创建单例实例
const blockchainService = new BlockchainService();

module.exports = blockchainService; 