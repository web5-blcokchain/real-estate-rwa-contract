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
   * @param {Object} [options.wallet] - 钱包实例
   * @param {string} [options.keyType] - 密钥类型 (admin, manager, operator, user)
   * @param {string} [options.address] - 合约地址
   * @returns {Promise<Object>} 合约实例
   */
  async createContract(contractName, options = {}) {
    await this.ensureInitialized();
    
    try {
      let signer = options.wallet;
      
      // 如果提供了keyType但没有提供wallet，从keyType创建钱包
      if (!signer && options.keyType) {
        try {
          Logger.debug(`尝试使用keyType创建钱包: ${options.keyType}`);
          signer = await this.createWallet({ keyType: options.keyType });
          Logger.debug(`使用keyType成功创建钱包: ${options.keyType}`);
        } catch (walletError) {
          Logger.error(`使用keyType创建钱包失败: ${walletError.message}`, { error: walletError });
          throw new Error(`创建钱包失败: ${walletError.message}`);
        }
      }
      
      // 记录创建合约前的信息
      Logger.info(`尝试创建合约实例: ${contractName}`, { 
        contractName,
        networkType: this.networkType, 
        hasSigner: !!signer,
        customAddress: options.address ? true : false 
      });
      
      // 直接使用shared模块的Contract.createFromName
      const contract = await Contract.createFromName(
        contractName,
        this.networkType,
        {
          provider: this.provider,
          signer: signer,
          readOnly: !signer,
          address: options.address
        }
      );
      
      Logger.info(`成功创建合约实例: ${contractName}`, { 
        contractName,
        address: contract.address,
        networkType: this.networkType
      });
      
      return contract;
    } catch (error) {
      // 尝试从环境变量获取地址（作为调试信息）
      let debugInfo = { contractName, networkType: this.networkType };
      
      try {
        const envVars = [
          `${contractName.toUpperCase()}_ADDRESS`, 
          `CONTRACT_${contractName.toUpperCase()}`,
          `CONTRACT_${contractName.toUpperCase()}_ADDRESS`
        ];
                         
        for (const envVar of envVars) {
          if (process.env[envVar]) {
            debugInfo.foundEnvVar = envVar;
            debugInfo.envVarValue = process.env[envVar].substring(0, 10) + '...';
            break;
          }
        }
      } catch (envError) {
        // 忽略环境变量检查错误
      }
      
      const handledError = ErrorHandler.handle(error);
      Logger.error(`创建合约实例失败: ${handledError.message}`, { 
        error: handledError,
        ...debugInfo
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
      // 检查是否提供了钱包或keyType
      if (!options.wallet && !options.keyType) {
        throw new Error('发送交易需要提供钱包或密钥类型');
      }
      
      // 获取钱包 - 优先级：1. 已有钱包 2. keyType
      let wallet = options.wallet;
      
      if (!wallet && options.keyType) {
        wallet = await this.createWallet({ keyType: options.keyType });
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
   * 创建钱包
   * 
   * @param {Object} options - 钱包选项
   * @param {string} [options.keyType] - 密钥类型 (admin, manager, operator, user)
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