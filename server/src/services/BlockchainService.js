/**
 * 区块链服务类
 * 提供与区块链交互的相关功能
 */
const { Provider, Contract, Wallet, Logger, ErrorHandler, Validation } = require('../../../shared/src');
const { AbiConfig, AddressConfig, EnvConfig } = require('../../../shared/src/config');
const serverConfig = require('../config');
const path = require('path');

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

      // 确保EnvConfig已初始化(虽然在入口文件已经调用，这里做双重保证)
      if (!EnvConfig.isInitialized()) {
        EnvConfig.load();
        Logger.info('区块链服务中重新初始化EnvConfig');
      }

      // 确保已设置deployment.json路径
      const deploymentPath = path.resolve(process.cwd(), 'config/deployment.json');
      if (require('fs').existsSync(deploymentPath) && !AddressConfig.isInitialized()) {
        AddressConfig.setDeploymentPath(deploymentPath);
        Logger.info('区块链服务中重新设置deployment.json路径');
      }

      // 验证网络类型
      Validation.validate(
        Validation.isNotEmpty(this.networkType),
        '网络类型不能为空'
      );
      
      // 使用共享模块创建Provider
      Logger.info('初始化区块链服务');
      this.provider = await Provider.create({
        networkType: this.networkType,
        rpcUrl: blockchainConfig.rpcUrl
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
   * @returns {Promise<string>} Gas价格（以wei为单位）
   */
  async getGasPrice() {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      const gasPrice = await Provider.getGasPrice(this.provider);
      return gasPrice.toString();
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'network',
        context: { method: 'getGasPrice' }
      });
      Logger.error(`获取Gas价格失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 使用合约名称获取合约实例（已签名）
   * @param {string} contractName - 合约名称
   * @param {string} keyType - 私钥类型(ADMIN/OPERATOR等)
   * @returns {Promise<Object>} 合约实例
   */
  async getContractInstanceByName(contractName, keyType = 'ADMIN') {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      // 使用Contract类的静态create方法创建合约实例
      const wallet = await Wallet.create({
        keyType,
        provider: this.provider
      });
      
      const contract = await Contract.create({
        contractName,
        provider: wallet
      });
      
      Logger.info(`成功获取合约实例: ${contractName}`, {
        address: contract.address,
        keyType,
        signerAddress: wallet.address
      });
      
      return contract;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getContractInstanceByName', contractName, keyType }
      });
      Logger.error(`获取合约实例失败: ${handledError.message}`, { 
        error: handledError, 
        contractName, 
        keyType 
      });
      throw handledError;
    }
  }

  /**
   * 调用合约只读方法
   * @param {Object} contract - 合约实例
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @returns {Promise<any>} 调用结果
   */
  async callContractMethod(contract, method, params = []) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      // 使用Contract类的静态call方法调用合约只读方法
      const result = await Contract.call(contract, method, params);
      
      // 记录API调用日志
      Logger.logApiCall({
        module: 'blockchain',
        interface: method,
        method: 'CALL',
        params,
        result,
        contractAddress: contract.address
      });
      
      return result;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'callContractMethod', contractMethod: method, params }
      });
      
      // 记录错误日志
      Logger.logApiCall({
        module: 'blockchain',
        interface: method,
        method: 'CALL',
        params,
        error: handledError.message,
        contractAddress: contract?.address
      });
      
      Logger.error(`调用合约方法失败: ${handledError.message}`, { 
        error: handledError, 
        method, 
        params,
        contractAddress: contract?.address
      });
      
      throw handledError;
    }
  }

  /**
   * 发送合约交易
   * @param {Object} contract - 合约实例
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @param {Object} options - 交易选项
   * @returns {Promise<Object>} 交易收据
   */
  async sendContractTransaction(contract, method, params = [], options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      // 使用Contract类的静态send方法发送合约交易
      const receipt = await Contract.send(contract, method, params, options);
      
      // 记录API调用日志
      Logger.logApiCall({
        module: 'blockchain',
        interface: method,
        method: 'SEND',
        params,
        result: {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString()
        },
        contractAddress: contract.address
      });
      
      return receipt;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'transaction',
        context: { 
          method: 'sendContractTransaction', 
          contractMethod: method, 
          params,
          options 
        }
      });
      
      // 记录错误日志
      Logger.logApiCall({
        module: 'blockchain',
        interface: method,
        method: 'SEND',
        params,
        error: handledError.message,
        contractAddress: contract?.address
      });
      
      Logger.error(`发送合约交易失败: ${handledError.message}`, { 
        error: handledError, 
        method, 
        params,
        options,
        contractAddress: contract?.address
      });
      
      throw handledError;
    }
  }
}

// 创建单例实例
const blockchainService = new BlockchainService();

module.exports = blockchainService; 