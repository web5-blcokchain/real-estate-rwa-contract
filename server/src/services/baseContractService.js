const { ethers } = require('ethers');
const { getContractAddresses } = require('../../../shared/config/contracts');
const { provider, getSigner } = require('../../../shared/utils/blockchain');
const { getAbi } = require('../../../shared/utils/getAbis');
const logger = require('../utils/logger');

// 开发环境中使用模拟模式
const USE_MOCK = process.env.NODE_ENV === 'development' && !process.env.DISABLE_MOCK;

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
    this._contract = null;
    this._contractWithSigner = {};
    this._useMock = USE_MOCK;
    
    if (this._useMock) {
      logger.warn(`使用模拟模式 - 合约: ${contractName}`);
    }
  }
  
  /**
   * 获取合约地址
   * @returns {string} 合约地址
   */
  getContractAddress() {
    const addresses = getContractAddresses();
    const address = addresses[this.addressKey];
    
    if (!address) {
      if (this._useMock) {
        // 在模拟模式下，返回一个假地址
        const mockAddress = `0x${'1'.repeat(40)}`;
        logger.warn(`在模拟模式下使用地址: ${mockAddress} 用于 ${this.addressKey}`);
        return mockAddress;
      }
      throw new Error(`Contract address not found for ${this.addressKey}`);
    }
    
    return address;
  }
  
  /**
   * 获取合约ABI
   * @returns {object} 合约ABI
   */
  getContractAbi() {
    try {
      return getAbi(this.contractName);
    } catch (error) {
      if (this._useMock) {
        // 在模拟模式下，返回一个简单的 ABI
        logger.warn(`在模拟模式下使用默认 ABI 用于 ${this.contractName}`);
        return [];
      }
      throw error;
    }
  }
  
  /**
   * 获取只读合约实例
   * @returns {ethers.Contract} 合约实例
   */
  getContract() {
    if (this._useMock) {
      // 在模拟模式下，返回一个带有模拟方法的对象
      logger.warn(`在模拟模式下使用模拟合约实例 用于 ${this.contractName}`);
      return this._getMockContract();
    }
    
    if (!this._contract) {
      const address = this.getContractAddress();
      const abi = this.getContractAbi();
      
      this._contract = new ethers.Contract(address, abi, provider);
    }
    
    return this._contract;
  }
  
  /**
   * 获取带签名者的合约实例
   * @param {string} [operationName] 操作名称，用于确定使用哪个角色
   * @returns {ethers.Contract} 带签名者的合约实例
   */
  getContractWithSigner(operationName) {
    if (this._useMock) {
      // 在模拟模式下，返回模拟合约实例
      return this._getMockContract();
    }
    
    const requiredRole = operationRoles[operationName];
    
    if (!requiredRole) {
      throw new Error(`No role defined for operation: ${operationName}`);
    }
    
    const contract = this.getContract();
    const signer = getSigner();
    
    return contract.connect(signer);
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
      const contract = this.getContractWithSigner(methodName);
      logger.info(`Executing write method ${methodName} with args:`, args);
      
      const tx = await contract[methodName](...args, options);
      logger.info(`Write method ${methodName} transaction sent: ${tx.hash}`);
      
      const receipt = await this.waitForTransaction(tx, options.confirmations);
      logger.info(`Write method ${methodName} completed successfully`);
      
      return receipt;
    } catch (error) {
      logger.error(`Write method ${methodName} failed: ${error.message}`);
      throw error;
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
      return this._getMockReadResult(methodName, args);
    }
    
    try {
      const contract = this.getContract();
      logger.info(`Executing read method ${methodName} with args:`, args);
      
      const result = await contract[methodName](...args);
      logger.info(`Read method ${methodName} completed successfully`);
      
      return result;
    } catch (error) {
      logger.error(`Read method ${methodName} failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取模拟合约
   * @returns {Object} 模拟合约
   * @private
   */
  _getMockContract() {
    return {
      // 模拟的合约方法，根据实际需要添加
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