const { ethers } = require('ethers');
const { contractAddresses, operationRoles } = require('../config');
const { getProvider, getSigner } = require('../utils/web3Provider');
const { getAbi } = require('../utils/getAbis');
const logger = require('../utils/logger');

/**
 * 合约服务基类
 * 提供连接合约的共通方法
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
   */
  getContractAddress() {
    const address = contractAddresses[this.addressKey];
    if (!address) {
      throw new Error(`未找到 ${this.contractName} 合约地址，请检查配置`);
    }
    return address;
  }
  
  /**
   * 获取合约ABI
   * @returns {object} 合约ABI
   */
  getContractAbi() {
    return getAbi(this.contractName);
  }
  
  /**
   * 获取只读合约实例
   * @returns {ethers.Contract} 合约实例
   */
  getContract() {
    if (!this._contract) {
      const address = this.getContractAddress();
      const abi = this.getContractAbi();
      const provider = getProvider();
      
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
    const role = operationName ? operationRoles[operationName] || 'admin' : 'admin';
    
    // 如果已有对应角色的合约实例，直接返回
    if (this._contractWithSigner[role]) {
      return this._contractWithSigner[role];
    }
    
    const contract = this.getContract();
    const signer = getSigner(role);
    
    // 记录操作角色
    logger.debug(`使用角色 "${role}" (${signer.address}) 连接 ${this.contractName} 合约`);
    
    // 创建并缓存带签名者的合约实例
    this._contractWithSigner[role] = contract.connect(signer);
    
    return this._contractWithSigner[role];
  }
  
  /**
   * 等待交易被确认
   * @param {ethers.providers.TransactionResponse} tx 交易响应
   * @param {number} [confirmations=1] 确认区块数
   * @returns {Promise<ethers.providers.TransactionReceipt>} 交易收据
   */
  async waitForTransaction(tx, confirmations = 1) {
    try {
      logger.debug(`等待交易 ${tx.hash} 被确认...`);
      const receipt = await tx.wait(confirmations);
      logger.debug(`交易 ${tx.hash} 已确认，区块号: ${receipt.blockNumber}`);
      return receipt;
    } catch (error) {
      logger.error(`交易 ${tx.hash} 确认失败: ${error.message}`);
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
    const { operationName, gasLimit, value } = options;
    
    try {
      const contract = this.getContractWithSigner(operationName);
      
      // 准备交易选项
      const txOptions = {};
      if (gasLimit) txOptions.gasLimit = gasLimit;
      if (value) txOptions.value = value;
      
      // 发送交易
      logger.debug(`执行 ${this.contractName}.${methodName}(${args.join(', ')})${operationName ? ` [${operationName}]` : ''}`);
      const tx = await contract[methodName](...args, txOptions);
      
      // 等待交易确认
      return await this.waitForTransaction(tx);
    } catch (error) {
      logger.error(`执行 ${this.contractName}.${methodName} 失败: ${error.message}`);
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
    try {
      const contract = this.getContract();
      logger.debug(`调用 ${this.contractName}.${methodName}(${args.join(', ')})`);
      return await contract[methodName](...args);
    } catch (error) {
      logger.error(`调用 ${this.contractName}.${methodName} 失败: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BaseContractService; 