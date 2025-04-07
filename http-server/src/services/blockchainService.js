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
          Logger.debug(`【调试】尝试使用keyType创建钱包: ${options.keyType}`);
          signer = await this.createWallet({ keyType: options.keyType });
          
          // 验证钱包是否有效
          if (!signer) {
            Logger.error(`【调试】创建钱包失败: 返回null`);
            throw new Error('创建钱包失败: 返回null');
          }
          
          // 检查钱包是否有getAddress方法
          if (typeof signer.getAddress !== 'function') {
            Logger.error(`【调试】创建的钱包无效，缺少getAddress方法`, {
              signerType: typeof signer,
              signerKeys: Object.keys(signer)
            });
            throw new Error('创建的钱包无效，缺少必要的方法');
          }
          
          const address = await signer.getAddress();
          Logger.debug(`【调试】使用keyType成功创建钱包: ${options.keyType}, 地址: ${address}`);
        } catch (walletError) {
          Logger.error(`【调试】使用keyType创建钱包失败: ${walletError.message}`, { 
            error: walletError,
            stack: walletError.stack 
          });
          throw new Error(`创建钱包失败: ${walletError.message}`);
        }
      } else if (signer) {
        try {
          const address = await signer.getAddress();
          Logger.debug(`【调试】使用提供的钱包，地址: ${address}`);
        } catch (addrError) {
          Logger.error(`【调试】无法获取提供的钱包地址: ${addrError.message}`);
        }
      }
      
      // 记录创建合约前的信息
      Logger.info(`【调试】尝试创建合约实例: ${contractName}`, { 
        contractName,
        networkType: this.networkType, 
        hasSigner: !!signer,
        signerType: signer ? typeof signer : 'undefined',
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
      
      // 验证合约实例
      if (!contract) {
        throw new Error(`创建合约${contractName}返回null或undefined`);
      }
      
      // 检查合约是否有signer
      let hasSigner = false;
      try {
        hasSigner = !!contract.signer;
        if (hasSigner) {
          const signerAddress = await contract.signer.getAddress();
          Logger.debug(`【调试】合约实例有签名者，地址: ${signerAddress}`);
        } else {
          Logger.warn(`【调试】合约实例没有签名者`);
        }
      } catch (signerErr) {
        Logger.error(`【调试】检查合约签名者时出错: ${signerErr.message}`);
      }
      
      Logger.info(`【调试】成功创建合约实例: ${contractName}`, { 
        contractName,
        address: contract.address,
        hasSigner: hasSigner,
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
        Logger.error(`【调试】发送交易失败: 未提供钱包或keyType`, { method, contractName: typeof contractOrName === 'string' ? contractOrName : contractOrName.address });
        throw new Error('发送交易需要提供钱包或密钥类型');
      }
      
      // 获取钱包 - 优先级：1. 已有钱包 2. keyType
      let wallet = options.wallet;
      
      // 记录提供的钱包信息
      if (wallet) {
        try {
          const address = await wallet.getAddress();
          Logger.debug(`【调试】使用提供的钱包，地址: ${address}`);
        } catch (addrErr) {
          Logger.error(`【调试】无法获取提供的钱包地址: ${addrErr.message}`);
        }
      }
      
      if (!wallet && options.keyType) {
        try {
          Logger.debug(`【调试】通过keyType=${options.keyType}创建钱包`);
          wallet = await this.createWallet({ keyType: options.keyType });
          
          if (!wallet) {
            Logger.error(`【调试】通过keyType创建钱包返回null`);
            throw new Error(`通过keyType=${options.keyType}创建钱包失败: 返回null`);
          }
          
          const address = await wallet.getAddress();
          Logger.debug(`【调试】通过keyType创建钱包成功，地址: ${address}`);
        } catch (walletError) {
          Logger.error(`【调试】通过keyType创建钱包失败: ${walletError.message}`, {
            error: walletError,
            stack: walletError.stack
          });
          throw new Error(`通过keyType创建钱包失败: ${walletError.message}`);
        }
      }
      
      // 获取或检查合约实例
      let contract;
      if (typeof contractOrName === 'string') {
        // 如果提供的是合约名称，创建新的合约实例
        Logger.debug(`【调试】从名称创建合约实例: ${contractOrName}`);
        contract = await this.createContract(contractOrName, { wallet });
      } else {
        // 如果提供的是合约实例，检查它是否有签名者
        contract = contractOrName;
        
        // 检查合约实例是否可用
        if (!contract) {
          Logger.error(`【调试】提供的合约实例为null或undefined`);
          throw new Error('合约实例无效');
        }
        
        Logger.debug(`【调试】使用现有合约实例，地址: ${contract.address}`);
        
        // 检查合约是否有签名者
        const hasSigner = !!contract.signer;
        Logger.debug(`【调试】合约实例有签名者: ${hasSigner}`);
        
        // 如果合约没有签名者但我们有钱包，使用钱包连接合约
        if (!hasSigner && wallet) {
          try {
            Logger.debug(`【调试】合约没有签名者，尝试连接钱包`);
            // 需要根据具体的合约库实现方式连接钱包
            // 以下是ethers.js的连接方式，可能需要根据实际使用的库调整
            if (typeof contract.connect === 'function') {
              Logger.debug(`【调试】使用connect方法连接钱包`);
              contract = contract.connect(wallet);
              
              // 检查连接后是否有签名者
              const hasSignerAfterConnect = !!contract.signer;
              Logger.debug(`【调试】连接后，合约实例有签名者: ${hasSignerAfterConnect}`);
              
              if (!hasSignerAfterConnect) {
                Logger.error(`【调试】连接钱包后，合约实例仍然没有签名者`);
                throw new Error('连接钱包后，合约实例仍然没有签名者');
              }
            } else {
              Logger.error(`【调试】合约实例没有connect方法，无法连接钱包`);
              throw new Error('合约实例没有connect方法，无法连接钱包');
            }
          } catch (connectError) {
            Logger.error(`【调试】连接钱包到合约失败: ${connectError.message}`, {
              error: connectError,
              stack: connectError.stack
            });
            throw new Error(`连接钱包到合约失败: ${connectError.message}`);
          }
        }
      }
      
      // 准备交易选项
      const txOptions = {};
      if (options.gasLimit) {
        txOptions.gasLimit = options.gasLimit;
        Logger.debug(`【调试】设置gasLimit: ${options.gasLimit}`);
      }
      if (options.gasPrice) {
        txOptions.gasPrice = options.gasPrice;
        Logger.debug(`【调试】设置gasPrice: ${options.gasPrice}`);
      }
      if (options.value) {
        txOptions.value = options.value;
        Logger.debug(`【调试】设置value: ${options.value.toString()}`);
      }
      
      Logger.debug(`【调试】准备发送交易，方法: ${method}, 参数: ${JSON.stringify(params)}`);
      
      // 最后检查合约是否有签名者
      if (!contract.signer) {
        Logger.error(`【调试】合约实例没有签名者，无法发送交易`);
        throw new Error('合约实例没有签名者，无法发送交易');
      }
      
      try {
        // 获取签名者地址用于日志
        const signerAddress = await contract.signer.getAddress();
        Logger.debug(`【调试】使用签名者地址 ${signerAddress} 发送交易`);
      } catch (addrErr) {
        Logger.warn(`【调试】无法获取签名者地址: ${addrErr.message}`);
      }
      
      // 使用shared模块的Contract.send方法
      try {
        Logger.debug(`【调试】调用Contract.send方法`);
        const txResult = await Contract.send(contract, method, params, txOptions);
        Logger.debug(`【调试】Contract.send成功返回，hash: ${txResult.hash}`);
        
        // 等待交易确认
        Logger.debug(`【调试】等待交易确认...`);
        const receipt = await Contract.waitForTransaction(txResult);
        Logger.debug(`【调试】交易已确认，blockNumber: ${receipt.blockNumber}`);
        
        return receipt;
      } catch (sendError) {
        Logger.error(`【调试】发送交易操作失败: ${sendError.message}`, {
          error: sendError,
          stack: sendError.stack,
          code: sendError.code,
          reason: sendError.reason
        });
        throw sendError;
      }
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