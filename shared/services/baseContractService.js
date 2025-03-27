const { ethers } = require('ethers');
const { getContractAddresses } = require('../config/contracts');
const { getProvider, getSigner } = require('../utils/blockchain');
const { getAbi } = require('../utils/getAbis');
const { logger } = require('../utils/logger');
const { ApiError } = require('../utils/errors');

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
  }
  
  /**
   * 获取合约地址
   * @returns {string} 合约地址
   * @throws {ApiError} 当合约地址未找到时
   */
  getContractAddress() {
    const addresses = getContractAddresses();
    const address = addresses[this.addressKey];
    
    if (!address) {
      throw new ApiError({
        message: `Contract address not found for ${this.addressKey}`,
        code: 'CONTRACT_ADDRESS_NOT_FOUND'
      });
    }
    
    return address;
  }
  
  /**
   * 获取合约ABI
   * @returns {object} 合约ABI
   * @throws {ApiError} 当ABI未找到时
   */
  getContractAbi() {
    const abi = getAbi(this.contractName);
    if (!abi) {
      throw new ApiError({
        message: `Contract ABI not found for ${this.contractName}`,
        code: 'CONTRACT_ABI_NOT_FOUND'
      });
    }
    return abi;
  }
  
  /**
   * 获取只读合约实例
   * @returns {ethers.Contract} 合约实例
   */
  async getContract() {
    if (!this._contract) {
      const address = this.getContractAddress();
      const abi = this.getContractAbi();
      const provider = await getProvider();
      
      this._contract = new ethers.Contract(address, abi, provider);
    }
    
    return this._contract;
  }
  
  /**
   * 获取带签名者的合约实例
   * @param {string} [operationName] 操作名称，用于确定使用哪个角色
   * @returns {Promise<ethers.Contract>} 带签名者的合约实例
   * @throws {ApiError} 当操作未定义角色时
   */
  async getContractWithSigner(operationName) {
    const requiredRole = operationRoles[operationName];
    
    if (!requiredRole) {
      throw new ApiError({
        message: `No role defined for operation: ${operationName}`,
        code: 'OPERATION_ROLE_NOT_DEFINED'
      });
    }
    
    const contract = await this.getContract();
    const signer = await getSigner();
    
    return contract.connect(signer);
  }
  
  /**
   * 等待交易被确认
   * @param {ethers.TransactionResponse} tx 交易响应
   * @param {number} [confirmations=1] 确认区块数
   * @returns {Promise<ethers.TransactionReceipt>} 交易收据
   * @throws {ApiError} 当交易失败时
   */
  async waitForTransaction(tx, confirmations = 1) {
    try {
      logger.info(`Waiting for transaction ${tx.hash} to be confirmed...`);
      const receipt = await tx.wait(confirmations);
      logger.info(`Transaction ${tx.hash} confirmed in block ${receipt.blockNumber}`);
      return receipt;
    } catch (error) {
      logger.error(`Transaction ${tx.hash} failed: ${error.message}`);
      throw new ApiError({
        message: `Transaction failed: ${error.message}`,
        code: 'TRANSACTION_FAILED',
        details: error
      });
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
   * @returns {Promise<ethers.TransactionReceipt>} 交易收据
   * @throws {ApiError} 当方法执行失败时
   */
  async executeWrite(methodName, args = [], options = {}) {
    try {
      const contract = await this.getContractWithSigner(options.operationName || methodName);
      logger.info(`Executing write method ${methodName} with args:`, args);
      
      const overrides = {};
      if (options.gasLimit) overrides.gasLimit = options.gasLimit;
      if (options.value) overrides.value = options.value;
      
      const tx = await contract[methodName](...args, overrides);
      logger.info(`Write method ${methodName} transaction sent: ${tx.hash}`);
      
      const receipt = await this.waitForTransaction(tx, options.confirmations);
      logger.info(`Write method ${methodName} completed successfully`);
      
      return receipt;
    } catch (error) {
      logger.error(`Write method ${methodName} failed: ${error.message}`);
      throw new ApiError({
        message: `Write method failed: ${error.message}`,
        code: 'WRITE_METHOD_FAILED',
        details: error
      });
    }
  }
  
  /**
   * 执行合约只读操作
   * @param {string} methodName 方法名称
   * @param {Array} args 方法参数
   * @returns {Promise<any>} 方法返回值
   * @throws {ApiError} 当方法执行失败时
   */
  async executeRead(methodName, args = []) {
    try {
      const contract = await this.getContract();
      logger.info(`Executing read method ${methodName} with args:`, args);
      
      const result = await contract[methodName](...args);
      logger.info(`Read method ${methodName} completed successfully`);
      
      return result;
    } catch (error) {
      logger.error(`Read method ${methodName} failed: ${error.message}`);
      throw new ApiError({
        message: `Read method failed: ${error.message}`,
        code: 'READ_METHOD_FAILED',
        details: error
      });
    }
  }

  /**
   * 验证参数
   * @param {Array} args 参数列表
   * @param {Array} validators 验证器列表
   * @throws {ApiError} 当参数验证失败时
   */
  validateArgs(args, validators) {
    for (let i = 0; i < args.length; i++) {
      if (validators[i] && !validators[i](args[i])) {
        throw new ApiError({
          message: `Invalid argument at index ${i}`,
          code: 'INVALID_ARGUMENT'
        });
      }
    }
  }
}

module.exports = BaseContractService; 