/**
 * 合约服务
 * 提供合约ABI加载和实例化功能
 */
const fs = require('fs');
const path = require('path');
const { Contract, Wallet, Logger, ErrorHandler } = require('../../../shared/src');
const blockchainService = require('./blockchainService');

/**
 * 合约服务类
 */
class ContractService {
  constructor() {
    this.contractCache = {};
    this.abiCache = {};
  }

  /**
   * 初始化合约服务
   */
  initialize() {
    // 提前加载常用合约的ABI到缓存
    this.preloadCommonContracts();
    return true;
  }

  /**
   * 预加载常用合约的ABI
   */
  preloadCommonContracts() {
    try {
      const contractsToPreload = [
        'RealEstateFacade',
        'PropertyToken',
        'RoleManager',
        'PropertyManager',
        'TradingManager',
        'RewardManager'
      ];

      contractsToPreload.forEach(contractName => {
        try {
          this.getContractABI(contractName);
          Logger.debug(`预加载合约ABI成功: ${contractName}`);
        } catch (err) {
          Logger.warn(`预加载合约ABI失败: ${contractName}`, { error: err.message });
        }
      });
    } catch (error) {
      Logger.warn('预加载合约ABI过程中发生错误', { error: error.message });
    }
  }

  /**
   * 获取合约ABI
   * @param {string} contractName - 合约名称
   * @returns {Object} 合约ABI
   */
  getContractABI(contractName) {
    try {
      // 如果缓存中已有，直接返回
      if (this.abiCache[contractName]) {
        return this.abiCache[contractName];
      }

      // 构建ABI文件路径
      const artifactsBasePath = path.resolve(process.env.PROJECT_PATH, 'artifacts/contracts');
      const abiFilePath = path.join(artifactsBasePath, `${contractName}.sol`, `${contractName}.json`);

      // 检查文件是否存在
      if (!fs.existsSync(abiFilePath)) {
        throw new Error(`合约ABI文件不存在: ${abiFilePath}`);
      }

      // 读取并解析ABI文件
      const contractJson = JSON.parse(fs.readFileSync(abiFilePath, 'utf8'));
      
      // 提取ABI部分
      if (!contractJson.abi) {
        throw new Error(`合约ABI格式无效: ${contractName}`);
      }

      // 缓存ABI
      this.abiCache[contractName] = contractJson.abi;
      
      return contractJson.abi;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getContractABI', contractName }
      });
      Logger.error(`获取合约ABI失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称
   * @returns {string|null} 合约地址
   */
  getContractAddress(contractName) {
    try {
      // 尝试从环境变量获取
      const envKey = `CONTRACT_${contractName.toUpperCase()}_ADDRESS`;
      const address = process.env[envKey];
      
      if (address) {
        return address;
      }

      // 尝试从部署文件获取
      const deploymentFilePath = path.resolve(process.env.PROJECT_PATH, 'config/deployment.json');
      
      if (fs.existsSync(deploymentFilePath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
        const networkType = process.env.BLOCKCHAIN_NETWORK || 'localhost';
        
        if (deploymentData[networkType] && deploymentData[networkType][contractName]) {
          return deploymentData[networkType][contractName];
        }
      }

      Logger.warn(`找不到合约地址: ${contractName}`);
      return null;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getContractAddress', contractName }
      });
      Logger.error(`获取合约地址失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 创建合约实例
   * @param {string} contractName - 合约名称
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} 合约实例
   */
  async createContractInstance(contractName, options = {}) {
    try {
      // 生成缓存键
      const cacheKey = `${contractName}-${options.address || 'default'}-${options.wallet ? 'with-wallet' : 'no-wallet'}`;
      
      // 如果缓存中已有，直接返回
      if (this.contractCache[cacheKey]) {
        return this.contractCache[cacheKey];
      }

      // 获取合约ABI
      const abi = options.abi || this.getContractABI(contractName);
      if (!abi) {
        throw new Error(`无法获取合约ABI: ${contractName}`);
      }
      
      // 获取合约地址
      const address = options.address || this.getContractAddress(contractName);
      if (!address) {
        throw new Error(`无法获取合约地址: ${contractName}`);
      }
      
      // 获取Provider
      const provider = options.provider || blockchainService.getProvider();
      if (!provider) {
        throw new Error('Provider不可用');
      }
      
      // 创建合约实例
      const contract = await Contract.create({
        abi,
        address,
        provider,
        wallet: options.wallet
      });
      
      // 缓存合约实例
      this.contractCache[cacheKey] = contract;
      
      return contract;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'createContractInstance', contractName }
      });
      Logger.error(`创建合约实例失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 调用合约只读方法
   * @param {Object|string} contractOrName - 合约实例或合约名称
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @param {Object} options - 调用选项
   * @returns {Promise<any>} 调用结果
   */
  async callMethod(contractOrName, method, params = [], options = {}) {
    try {
      // 确定合约实例
      const contract = typeof contractOrName === 'string' 
        ? await this.createContractInstance(contractOrName, options)
        : contractOrName;
      
      // 调用合约方法
      const result = await Contract.call(contract, method, params);
      
      // 记录调用日志
      Logger.debug(`调用合约方法: ${method}`, {
        contract: contract.address,
        method,
        params
      });
      
      return result;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { 
          method: 'callMethod', 
          contractMethod: method, 
          params 
        }
      });
      Logger.error(`调用合约方法失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 发送合约交易
   * @param {Object|string} contractOrName - 合约实例或合约名称
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @param {Object} options - 交易选项
   * @returns {Promise<Object>} 交易收据
   */
  async sendTransaction(contractOrName, method, params = [], options = {}) {
    try {
      // 检查是否提供了钱包
      if (!options.wallet && !options.privateKey) {
        throw new Error('发送交易需要提供钱包或私钥');
      }
      
      // 如果提供了私钥，创建钱包
      if (options.privateKey && !options.wallet) {
        const provider = blockchainService.getProvider();
        options.wallet = await Wallet.createFromPrivateKey(options.privateKey, provider);
      }
      
      // 确定合约实例
      const contract = typeof contractOrName === 'string' 
        ? await this.createContractInstance(contractOrName, options)
        : contractOrName;
      
      // 发送交易
      const receipt = await Contract.send(contract, method, params, {
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice,
        value: options.value
      });
      
      // 记录交易日志
      Logger.info(`合约交易已确认: ${method}`, {
        contract: contract.address,
        method,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });
      
      return receipt;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'transaction',
        context: { 
          method: 'sendTransaction', 
          contractMethod: method, 
          params 
        }
      });
      Logger.error(`发送合约交易失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }
}

// 创建单例实例
const contractService = new ContractService();

module.exports = contractService; 