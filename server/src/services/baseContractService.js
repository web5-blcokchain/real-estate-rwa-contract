const { ethers } = require('ethers');
const { getContractAddresses } = require('../../../shared/config/contracts');
const { getProvider, getSigner } = require('../../../shared/utils/blockchain');
const { getAbi } = require('../../../shared/utils/getAbis');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { getContractAddress, getContractAbi } = require('../../../shared/utils/paths');

// 更改为强制禁用模拟模式
const USE_MOCK = false;

// 操作权限配置 - 定义每种操作需要的角色
const operationRoles = {
  // 房产管理
  registerProperty: 'operator',
  updateProperty: 'operator',
  deleteProperty: 'operator',
  
  // 代币管理
  mintToken: 'operator',
  burnToken: 'operator',
  transferToken: 'operator',
  
  // 赎回管理
  createRedemption: 'operator',
  approveRedemption: 'operator',
  rejectRedemption: 'operator',
  executeRedemption: 'operator',
  
  // 租金分配
  createDistribution: 'operator',
  distributeRent: 'operator',
  claimRent: 'user',
  liquidateUnclaimedRent: 'operator'
};

/**
 * 基础合约服务类
 * 提供通用的合约交互功能
 */
class BaseContractService {
  /**
   * 创建合约服务实例
   * @param {string} contractName 合约名称
   * @param {string} [addressKey] 合约地址配置键名
   */
  constructor(contractName, addressKey) {
    this.contractName = contractName;
    this.addressKey = addressKey || contractName.charAt(0).toLowerCase() + contractName.slice(1);
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this._useMock = USE_MOCK;
    
    if (this._useMock) {
      logger.warn(`使用模拟模式 - 合约: ${contractName}`);
    }
  }
  
  /**
   * 初始化合约
   * @param {ethers.providers.Provider} provider 以太坊提供者
   * @param {ethers.Signer} signer 签名者
   */
  async initialize(provider, signer) {
    try {
      if (!provider || !signer) {
        throw new ApiError(500, '缺少必要的区块链连接参数');
      }
      
      this.provider = provider;
      this.signer = signer;
      
      // 获取合约地址和ABI
      const address = await this.getContractAddress();
      const abi = await this.getContractAbi();
      
      // 创建合约实例
      this.contract = new ethers.Contract(address, abi, this.signer);
      
      logger.info(`合约初始化成功 - contract: ${this.contractName}, address: ${address}`);
    } catch (error) {
      logger.error(`合约初始化失败 - contract: ${this.contractName}, error: ${error.message}`);
      throw new ApiError(500, '合约初始化失败', error.message);
    }
  }
  
  /**
   * 获取合约地址
   * @returns {Promise<string>} 合约地址
   */
  async getContractAddress() {
    try {
      const address = await getContractAddress(this.addressKey);
      if (!address) {
        if (this._useMock) {
          // 在模拟模式下，返回一个假地址
          const mockAddress = `0x${'1'.repeat(40)}`;
          logger.warn(`在模拟模式下使用地址: ${mockAddress} 用于 ${this.addressKey}`);
          return mockAddress;
        }
        throw new ApiError(500, `未找到合约地址 - contract: ${this.contractName}`);
      }
      
      return address;
    } catch (error) {
      logger.error(`获取合约地址失败 - contract: ${this.contractName}, error: ${error.message}`);
      throw new ApiError(500, '获取合约地址失败', error.message);
    }
  }
  
  /**
   * 获取合约ABI
   * @returns {Promise<Array>} 合约ABI
   */
  async getContractAbi() {
    try {
      const abi = await getContractAbi(this.contractName);
      if (!abi) {
        if (this._useMock) {
          // 在模拟模式下，返回一个简单的 ABI
          logger.warn(`在模拟模式下使用默认 ABI 用于 ${this.contractName}`);
          return [];
        }
        throw new ApiError(500, `未找到合约ABI - contract: ${this.contractName}`);
      }
      return abi;
    } catch (error) {
      logger.error(`获取合约ABI失败 - contract: ${this.contractName}, error: ${error.message}`);
      throw new ApiError(500, '获取合约ABI失败', error.message);
    }
  }
  
  /**
   * 获取合约实例
   * @returns {ethers.Contract} 合约实例
   */
  getContract() {
    if (this._useMock) {
      // 在模拟模式下，返回一个带有模拟方法的对象
      logger.warn(`在模拟模式下使用模拟合约实例 用于 ${this.contractName}`);
      return this._getMockContract();
    }
    
    if (!this.contract) {
      throw new ApiError(500, '合约未初始化');
    }
    
    return this.contract;
  }
  
  /**
   * 获取带签名者的合约实例
   * @returns {ethers.Contract} 带签名者的合约实例
   */
  getContractWithSigner() {
    if (this._useMock) {
      // 在模拟模式下，返回模拟合约实例
      return this._getMockContract();
    }
    
    if (!this.contract || !this.signer) {
      throw new ApiError(500, '合约或签名者未初始化');
    }
    
    return this.contract.connect(this.signer);
  }
  
  /**
   * 等待交易被确认
   * @param {ethers.providers.TransactionResponse} tx 交易响应
   * @param {number} [confirmations=1] 确认区块数
   * @returns {Promise<ethers.providers.TransactionReceipt>} 交易收据
   */
  async waitForTransaction(tx, confirmations = 1) {
    if (this._useMock) {
      // 在模拟模式下，返回一个模拟的交易收据
      return {
        transactionHash: `0x${'a'.repeat(64)}`,
        blockNumber: 12345678,
        status: 1
      };
    }
    
    try {
      logger.info(`Waiting for transaction ${tx.hash} to be confirmed...`);
      const receipt = await tx.wait(confirmations);
      logger.info(`Transaction ${tx.hash} confirmed in block ${receipt.blockNumber}`);
      return receipt;
    } catch (error) {
      logger.error(`Transaction ${tx.hash} failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 执行合约写入操作
   * @param {string} methodName 方法名称
   * @param {Array} args 方法参数
   * @param {object} options 选项
   * @param {string} options.operationName 操作名称，用于确定使用哪个角色
   * @param {number} options.gasLimit Gas限制
   * @param {ethers.BigNumber} options.value 发送的以太币数量
   * @returns {Promise<ethers.providers.TransactionReceipt>} 交易收据
   */
  async executeWrite(methodName, args = [], options = {}) {
    if (this._useMock) {
      // 在模拟模式下，返回一个模拟的交易收据
      logger.info(`[模拟] 执行写入方法 ${methodName} 参数:`, args);
      return {
        transactionHash: `0x${'a'.repeat(64)}`,
        blockNumber: 12345678,
        status: 1
      };
    }
    
    try {
      const contract = this.getContractWithSigner();
      logger.info(`Executing write method ${methodName} with args:`, args);
      
      if (!contract[methodName]) {
        throw new ApiError(500, `合约方法不存在 - method: ${methodName}`);
      }
      
      const gasPrice = await this.provider.getGasPrice();
      logger.info(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
      
      const txOptions = {
        gasLimit: options.gasLimit || 3000000,
        gasPrice: gasPrice.mul(12).div(10),
        ...options
      };
      
      const tx = await contract[methodName](...args, txOptions);
      logger.info(`Write method ${methodName} transaction sent: ${tx.hash}`);
      
      const receipt = await this.waitForTransaction(tx, options.confirmations);
      logger.info(`Write method ${methodName} completed successfully`);
      
      return receipt;
    } catch (error) {
      logger.error(`Write method ${methodName} failed:`, error);
      
      if (error.code === 'NETWORK_ERROR') {
        throw new ApiError(503, '网络连接失败', error.message);
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new ApiError(400, '余额不足', error.message);
      } else if (error.code === 'NONCE_EXPIRED') {
        throw new ApiError(400, '交易nonce已过期', error.message);
      } else if (error.code === 'REPLACEMENT_TRANSACTION_UNDERPRICED') {
        throw new ApiError(400, '替换交易价格过低', error.message);
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new ApiError(400, '无法预测gas限制', error.message);
      } else if (error.code === 'ACTION_REJECTED') {
        throw new ApiError(400, '交易被拒绝', error.message);
      }
      
      throw new ApiError(500, '交易执行失败', error.message);
    }
  }
  
  /**
   * 执行合约只读操作
   * @param {string} methodName 方法名称
   * @param {Array} args 方法参数
   * @returns {Promise<any>} 方法返回值
   */
  async executeRead(methodName, args = []) {
    if (this._useMock) {
      // 在模拟模式下，返回模拟数据
      logger.info(`[模拟] 执行读取方法 ${methodName} 参数:`, args);
      return this._getMockReadResult(methodName, args);
    }
    
    try {
      const contract = this.getContract();
      logger.info(`Executing read method ${methodName} with args:`, args);
      
      if (!contract[methodName]) {
        throw new ApiError(500, `合约方法不存在 - method: ${methodName}`);
      }
      
      const result = await contract[methodName](...args);
      logger.info(`Read method ${methodName} completed successfully`);
      
      return result;
    } catch (error) {
      logger.error(`Read method ${methodName} failed:`, error);
      
      if (error.code === 'NETWORK_ERROR') {
        throw new ApiError(503, '网络连接失败', error.message);
      } else if (error.code === 'CALL_EXCEPTION') {
        throw new ApiError(400, '合约调用失败', error.message);
      }
      
      throw new ApiError(500, '合约调用失败', error.message);
    }
  }
  
  /**
   * 获取模拟合约
   * @returns {Object} 模拟合约
   * @private
   */
  _getMockContract() {
    return {
      // 添加模拟方法
      registerProperty: async () => ({ hash: '0x' + 'a'.repeat(64) }),
      getProperty: async () => ({ exists: true, country: 'JP', metadataURI: 'ipfs://...' }),
      getAllProperties: async () => ['PROP001', 'PROP002'],
      // ... 其他模拟方法
    };
  }
  
  /**
   * 获取模拟读取结果
   * @param {string} methodName 方法名称
   * @param {Array} args 方法参数
   * @returns {any} 模拟结果
   * @private
   */
  _getMockReadResult(methodName, args) {
    if (this.contractName === 'PropertyRegistry') {
      if (methodName === 'getPropertyCount') {
        return 3; // 模拟有3个房产
      }
      
      if (methodName === 'propertyIds') {
        const index = args[0];
        return `PROP${(index + 1).toString().padStart(3, '0')}`; // 返回 PROP001, PROP002, PROP003
      }
      
      if (methodName === 'properties') {
        const propertyId = args[0];
        
        if (propertyId.startsWith('PROP')) {
          const timestamp = Math.floor(Date.now() / 1000);
          return {
            exists: true,
            country: 'JP',
            metadataURI: `ipfs://mock-uri-${propertyId}`,
            status: Math.floor(Math.random() * 4), // 随机状态 0-3
            createdAt: timestamp - 86400, // 一天前
            updatedAt: timestamp
          };
        }
        
        return { exists: false }; // 未找到的房产
      }
    }
    
    if (this.contractName === 'TokenFactory') {
      if (methodName === 'getRealEstateToken') {
        const propertyId = args[0];
        
        if (propertyId.startsWith('PROP')) {
          return `0x${'2'.repeat(40)}`; // 模拟代币地址
        }
        
        return ethers.constants.AddressZero; // 未找到的代币
      }
      
      if (methodName === 'getAllTokens') {
        // 模拟代币列表
        return [
          { propertyId: 'PROP001', tokenAddress: `0x${'2'.repeat(40)}` },
          { propertyId: 'PROP002', tokenAddress: `0x${'3'.repeat(40)}` }
        ];
      }
    }
    
    // 其他合约和方法可以在这里添加
    
    // 默认返回空数组
    return [];
  }
}

module.exports = BaseContractService; 