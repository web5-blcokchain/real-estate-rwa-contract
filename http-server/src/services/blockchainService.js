/**
 * 区块链服务
 * HTTP服务器与区块链交互的门户
 * 直接使用shared模块的功能，而不重新实现这些功能
 */
const { 
  Provider, 
  Contract, 
  Wallet, 
  Logger, 
  ErrorHandler 
} = require('../../../shared/src');

/**
 * 区块链服务
 * 该服务是HTTP服务器区块链功能的单一入口点
 * 它直接使用shared模块而不重新实现任何区块链交互逻辑
 */
class BlockchainService {
  constructor() {
    this.provider = null;
    this.initialized = false;
    this.networkType = null;
  }

  /**
   * 初始化区块链服务
   */
  async initialize() {
    try {
      if (this.initialized) {
        return true;
      }

      Logger.info('初始化区块链服务');
      
      // 获取网络类型
      this.networkType = process.env.BLOCKCHAIN_NETWORK || 'localhost';
      
      // 使用shared模块的Provider.create方法初始化Provider
      this.provider = await Provider.create({ networkType: this.networkType });
      
      // 记录初始化成功
      const network = await Provider.getNetwork(this.provider);
      Logger.info(`已连接到区块链网络: ${this.networkType}`, {
        chainId: network.chainId,
        name: network.name
      });
      
      this.initialized = true;
      return true;
    } catch (error) {
      const handledError = ErrorHandler.handle(error);
      Logger.error(`区块链服务初始化失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取网络信息
   */
  async getNetworkInfo() {
    await this.ensureInitialized();
    
    try {
      const network = await Provider.getNetwork(this.provider);
      const blockNumber = await Provider.getBlockNumber(this.provider);
      const gasPrice = await Provider.getGasPrice(this.provider);
      
      return {
        networkType: this.networkType,
        chainId: network.chainId,
        name: network.name,
        blockNumber,
        gasPrice: gasPrice.toString(),
        formattedGasPrice: `${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`
      };
    } catch (error) {
      const handledError = ErrorHandler.handle(error);
      Logger.error(`获取网络信息失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取Provider实例
   * @returns {Object} Provider实例
   */
  async getProvider() {
    await this.ensureInitialized();
    return this.provider;
  }

  /**
   * 创建合约实例
   * 直接使用shared模块的Contract功能
   * 
   * @param {string} contractName - 合约名称
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} 合约实例
   */
  async createContract(contractName, options = {}) {
    await this.ensureInitialized();
    
    try {
      let signer = options.wallet;
      
      // 如果提供了keyType但没有提供wallet，从keyType创建钱包
      if (!signer && options.keyType) {
        signer = await Wallet.createFromKeyType(options.keyType, this.provider);
      }
      
      // 直接使用shared模块的Contract.createFromName
      return await Contract.createFromName(
        contractName,
        this.networkType,
        {
          provider: this.provider,
          signer: signer,
          readOnly: !signer,
          address: options.address
        }
      );
    } catch (error) {
      const handledError = ErrorHandler.handle(error);
      Logger.error(`创建合约实例失败: ${handledError.message}`, { 
        error: handledError,
        contractName
      });
      throw handledError;
    }
  }

  /**
   * 调用合约只读方法
   * 
   * @param {string|Object} contractOrName - 合约名称或实例
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @returns {Promise<any>} 调用结果
   */
  async callContractMethod(contractOrName, method, params = []) {
    await this.ensureInitialized();
    
    try {
      // 获取合约实例
      const contract = typeof contractOrName === 'string'
        ? await this.createContract(contractOrName)
        : contractOrName;
      
      // 使用shared模块的Contract.call方法
      return await Contract.call(contract, method, params);
    } catch (error) {
      const handledError = ErrorHandler.handle(error);
      Logger.error(`调用合约方法失败: ${handledError.message}`, { 
        error: handledError,
        method,
        params 
      });
      throw handledError;
    }
  }

  /**
   * 发送合约交易
   * 
   * @param {string|Object} contractOrName - 合约名称或实例
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @param {Object} options - 交易选项
   * @returns {Promise<Object>} 交易收据
   */
  async sendContractTransaction(contractOrName, method, params = [], options = {}) {
    await this.ensureInitialized();
    
    try {
      // 检查是否提供了钱包、私钥或keyType
      if (!options.wallet && !options.privateKey && !options.keyType) {
        throw new Error('发送交易需要提供钱包、私钥或钱包类型');
      }
      
      // 获取钱包 - 优先级：1. 已有钱包 2. 私钥 3. keyType
      let wallet = options.wallet;
      
      if (!wallet && options.privateKey) {
        wallet = await this.createWalletFromPrivateKey(options.privateKey);
      } else if (!wallet && options.keyType) {
        wallet = await Wallet.createFromKeyType(options.keyType, this.provider);
      }
      
      // 获取合约实例
      const contract = typeof contractOrName === 'string'
        ? await this.createContract(contractOrName, { wallet })
        : contractOrName;
      
      // 准备交易选项
      const txOptions = {};
      if (options.gasLimit) txOptions.gasLimit = options.gasLimit;
      if (options.gasPrice) txOptions.gasPrice = options.gasPrice;
      if (options.value) txOptions.value = options.value;
      
      // 使用shared模块的Contract.send方法
      const txResult = await Contract.send(contract, method, params, txOptions);
      
      // 等待交易确认
      return await Contract.waitForTransaction(txResult);
    } catch (error) {
      const handledError = ErrorHandler.handle(error);
      Logger.error(`发送合约交易失败: ${handledError.message}`, { 
        error: handledError,
        method,
        params 
      });
      throw handledError;
    }
  }

  /**
   * 从私钥创建钱包
   * 
   * @param {string} privateKey - 私钥
   * @param {Object} provider - 可选的provider，如果不提供则使用服务内部的provider
   * @returns {Promise<Object>} 钱包实例
   */
  async createWalletFromPrivateKey(privateKey, provider = null) {
    await this.ensureInitialized();
    
    try {
      // 如果未提供provider，使用服务内部的provider
      const targetProvider = provider || this.provider;
      
      // 使用shared模块的Wallet功能
      return await Wallet.createFromPrivateKey(privateKey, targetProvider);
    } catch (error) {
      const handledError = ErrorHandler.handle(error);
      Logger.error(`从私钥创建钱包失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 创建钱包
   * 
   * @param {Object} options - 钱包选项
   * @returns {Promise<Object>} 钱包实例
   */
  async createWallet(options = {}) {
    await this.ensureInitialized();
    
    try {
      // 直接使用shared模块的Wallet功能
      return await Wallet.create({
        provider: this.provider,
        ...options
      });
    } catch (error) {
      const handledError = ErrorHandler.handle(error);
      Logger.error(`创建钱包失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 确保服务已初始化
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// 创建单例实例
const blockchainService = new BlockchainService();

module.exports = blockchainService; 