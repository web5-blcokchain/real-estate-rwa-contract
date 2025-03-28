const { ethers } = require('ethers');
const { getProvider, getSigner } = require('./web3Provider');
const { getAbi } = require('./getAbis');

/**
 * 合约服务基础类
 */
class ContractService {
  constructor(contractAddress, contractName, signer) {
    this.contractAddress = contractAddress;
    this.contractName = contractName;
    this.abi = getAbi(contractName);
    this.provider = getProvider();
    this.signer = signer || getSigner();
    this.contract = new ethers.Contract(contractAddress, this.abi, this.signer);
  }

  /**
   * 执行只读操作
   * @param {string} method 方法名
   * @param {Array} args 参数数组
   * @returns {Promise<any>} 执行结果
   */
  async executeRead(method, ...args) {
    try {
      return await this.contract[method](...args);
    } catch (error) {
      console.error(`执行只读操作 ${method} 失败:`, error);
      throw error;
    }
  }

  /**
   * 执行写入操作
   * @param {string} method 方法名
   * @param {Array} args 参数数组
   * @returns {Promise<ethers.ContractTransaction>} 交易对象
   */
  async executeWrite(method, ...args) {
    try {
      const tx = await this.contract[method](...args);
      return await tx.wait();
    } catch (error) {
      console.error(`执行写入操作 ${method} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取合约实例
   * @returns {ethers.Contract} 合约实例
   */
  getContract() {
    return this.contract;
  }

  /**
   * 获取合约地址
   * @returns {string} 合约地址
   */
  getAddress() {
    return this.contractAddress;
  }
}

/**
 * 创建合约服务实例
 * @param {string} contractAddress 合约地址
 * @param {string} contractName 合约名称
 * @param {ethers.Signer} signer 可选的签名者
 * @returns {ContractService} 合约服务实例
 */
function createContractService(contractAddress, contractName, signer) {
  return new ContractService(contractAddress, contractName, signer);
}

module.exports = {
  ContractService,
  createContractService,
  contractService: {
    createContractService
  }
}; 