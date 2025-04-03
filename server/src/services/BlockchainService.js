/**
 * 区块链服务类
 * 提供与区块链交互的相关功能
 */
const { Provider, Contract, Wallet, Logger, ErrorHandler, Validation } = require('../../../shared/src');
const serverConfig = require('../config');

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

      // 获取区块链配置
      const blockchainConfig = serverConfig.getBlockchainConfig();
      this.networkType = blockchainConfig.networkType;

      // 验证网络类型
      Validation.validate(
        Validation.isNotEmpty(this.networkType),
        '网络类型不能为空'
      );

      // 创建Provider
      this.provider = await Provider.create({
        networkType: this.networkType,
        url: blockchainConfig.rpcUrl
      });

      // 验证连接
      const network = await Provider.getNetwork(this.provider);
      Logger.info(`已连接到区块链网络: ${this.networkType}`, {
        chainId: network.chainId,
        name: network.name
      });

      this.initialized = true;
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
      ErrorHandler.handle(error, {
        type: 'network',
        context: { method: 'isConnected' }
      });
      return false;
    }
  }

  /**
   * 获取网络ID
   * @returns {Promise<number>} 网络ID
   */
  async getNetworkId() {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      const network = await Provider.getNetwork(this.provider);
      return network.chainId;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'network',
        context: { method: 'getNetworkId' }
      });
      Logger.error(`获取网络ID失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取当前区块高度
   * @returns {Promise<number>} 区块高度
   */
  async getBlockNumber() {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      return await Provider.getBlockNumber(this.provider);
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'network',
        context: { method: 'getBlockNumber' }
      });
      Logger.error(`获取区块高度失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 根据交易哈希获取交易信息
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易信息
   */
  async getTransaction(txHash) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      // 验证交易哈希
      Validation.validate(
        Validation.isValidTxHash(txHash),
        '无效的交易哈希'
      );
      
      return await Provider.getTransaction(this.provider, txHash);
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'transaction',
        context: { method: 'getTransaction', txHash }
      });
      Logger.error(`获取交易信息失败: ${handledError.message}`, { error: handledError, txHash });
      throw handledError;
    }
  }

  /**
   * 获取交易收据
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易收据
   */
  async getTransactionReceipt(txHash) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      // 验证交易哈希
      Validation.validate(
        Validation.isValidTxHash(txHash),
        '无效的交易哈希'
      );
      
      return await Provider.getTransactionReceipt(this.provider, txHash);
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'transaction',
        context: { method: 'getTransactionReceipt', txHash }
      });
      Logger.error(`获取交易收据失败: ${handledError.message}`, { error: handledError, txHash });
      throw handledError;
    }
  }

  /**
   * 获取当前Gas价格
   * @returns {Promise<BigNumber>} Gas价格
   */
  async getGasPrice() {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      return await Provider.getGasPrice(this.provider);
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'gas',
        context: { method: 'getGasPrice' }
      });
      Logger.error(`获取Gas价格失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 创建合约实例
   * @param {Array} abi - 合约ABI
   * @param {string} address - 合约地址
   * @returns {Contract} 合约实例
   */
  async getContractInstance(abi, address) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      // 验证合约地址
      Validation.validate(
        Validation.isValidAddress(address),
        '无效的合约地址'
      );
      
      return await Contract.create({
        address,
        abi,
        provider: this.provider
      });
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getContractInstance', address }
      });
      Logger.error(`创建合约实例失败: ${handledError.message}`, { error: handledError, address });
      throw handledError;
    }
  }

  /**
   * 创建带签名者的合约实例
   * @param {Array} abi - 合约ABI
   * @param {string} address - 合约地址
   * @param {string} privateKey - 私钥
   * @returns {Contract} 带签名者的合约实例
   */
  async getSignedContractInstance(abi, address, privateKey) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      // 验证参数
      Validation.validate(
        Validation.isValidAddress(address),
        '无效的合约地址'
      );
      
      Validation.validate(
        Validation.isNotEmpty(privateKey),
        '未提供私钥，无法创建带签名者的合约实例'
      );
      
      // 创建钱包
      const wallet = await Wallet.create({
        privateKey,
        provider: this.provider
      });
      
      // 创建合约实例
      return await Contract.create({
        address,
        abi,
        provider: this.provider,
        signer: wallet
      });
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getSignedContractInstance', address }
      });
      Logger.error(`创建带签名者的合约实例失败: ${handledError.message}`, { error: handledError, address });
      throw handledError;
    }
  }
}

// 创建单例实例
const blockchainService = new BlockchainService();

module.exports = blockchainService; 