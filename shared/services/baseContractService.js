const { ethers } = require('ethers');
const { getContractAddresses } = require('../config/contracts');
const { provider, getSigner } = require('../utils/blockchain');
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
      throw new ApiError(`Contract address not found for ${this.addressKey}`, 'CONTRACT_ADDRESS_NOT_FOUND');
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
      throw new ApiError(`Contract ABI not found for ${this.contractName}`, 'CONTRACT_ABI_NOT_FOUND');
    }
    return abi;
  }
  
  /**
   * 获取只读合约实例
   * @returns {ethers.Contract} 合约实例
   */
  getContract() {
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
   * @throws {ApiError} 当操作未定义角色时
   */
  getContractWithSigner(operationName) {
    const requiredRole = operationRoles[operationName];
    
    if (!requiredRole) {
      throw new ApiError(`No role defined for operation: ${operationName}`, 'OPERATION_ROLE_NOT_DEFINED');
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
      throw new ApiError(`Transaction failed: ${error.message}`, 'TRANSACTION_FAILED', error);
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
   * @throws {ApiError} 当方法执行失败时
   */
  async executeWrite(methodName, args = [], options = {}) {
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
      throw new ApiError(`Write method failed: ${error.message}`, 'WRITE_METHOD_FAILED', error);
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
      const contract = this.getContract();
      logger.info(`Executing read method ${methodName} with args:`, args);
      
      const result = await contract[methodName](...args);
      logger.info(`Read method ${methodName} completed successfully`);
      
      return result;
    } catch (error) {
      logger.error(`Read method ${methodName} failed: ${error.message}`);
      throw new ApiError(`Read method failed: ${error.message}`, 'READ_METHOD_FAILED', error);
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
        throw new ApiError(`Invalid argument at index ${i}`, 'INVALID_ARGUMENT');
      }
    }
  }
}

module.exports = BaseContractService; 