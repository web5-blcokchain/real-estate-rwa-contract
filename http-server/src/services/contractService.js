/**
 * 合约服务
 * 处理与智能合约的交互
 */

const { ethers } = require('ethers');
const { logger } = require('../utils/logger');
const blockchain = require('../utils/blockchain');
const abiService = require('./abiService');

/**
 * 合约服务类
 */
class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.initialized = false;
  }

  /**
   * 初始化合约服务
   */
  async initialize() {
    try {
      // 获取以太坊提供者
      this.provider = await blockchain.getProvider();
      
      // 使用提供者的默认签名者 (仅用于测试，生产环境需要其他方案)
      this.signer = this.provider;
      
      this.initialized = true;
      logger.info('合约服务初始化成功');
      
      return true;
    } catch (error) {
      logger.error('合约服务初始化失败:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * 检查区块链连接状态
   * @returns {boolean} 是否连接到区块链
   */
  isBlockchainConnected() {
    return this.initialized && this.provider !== null;
  }

  /**
   * 获取合约实例
   * @param {string} contractName 合约名称
   * @param {boolean} withSigner 是否需要签名者
   * @returns {ethers.Contract} 合约实例
   */
  getContractInstance(contractName, withSigner = false) {
    const contractInfo = abiService.getContract(contractName);
    if (!contractInfo) {
      throw new Error(`找不到合约: ${contractName}`);
    }

    if (!this.provider) {
      throw new Error('未初始化以太坊提供者');
    }

    // 创建合约实例
    const contract = new ethers.Contract(
      contractInfo.address,
      contractInfo.abi,
      withSigner ? this.signer : this.provider
    );

    return contract;
  }

  /**
   * 执行合约的只读函数
   * @param {string} contractName 合约名称
   * @param {string} functionName 函数名称
   * @param {Array} args 函数参数
   * @returns {Promise<any>} 函数执行结果
   */
  async executeReadFunction(contractName, functionName, args = []) {
    try {
      logger.debug(`执行只读函数 ${contractName}.${functionName}(${args.join(', ')})`);
      
      // 获取合约实例 (不需要签名者)
      const contract = this.getContractInstance(contractName, false);
      
      // 确保函数存在
      if (typeof contract[functionName] !== 'function') {
        throw new Error(`函数 ${functionName} 在合约 ${contractName} 中不存在`);
      }
      
      // 执行函数调用
      const result = await contract[functionName](...args);
      
      // 处理结果 (转换BigNumber等)
      const processedResult = this.processResult(result);
      
      logger.debug(`函数 ${functionName} 执行结果:`, processedResult);
      return processedResult;
    } catch (error) {
      logger.error(`执行只读函数 ${contractName}.${functionName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 执行合约的写入函数
   * @param {string} contractName 合约名称
   * @param {string} functionName 函数名称
   * @param {Array} args 函数参数
   * @returns {Promise<ethers.TransactionReceipt>} 交易收据
   */
  async executeWriteFunction(contractName, functionName, args = []) {
    try {
      logger.debug(`执行写入函数 ${contractName}.${functionName}(${args.join(', ')})`);
      
      // 获取合约实例 (需要签名者)
      const contract = this.getContractInstance(contractName, true);
      
      // 确保函数存在
      if (typeof contract[functionName] !== 'function') {
        throw new Error(`函数 ${functionName} 在合约 ${contractName} 中不存在`);
      }
      
      // 执行函数调用
      const tx = await contract[functionName](...args);
      
      // 等待交易被挖出
      logger.debug(`交易已提交，hash: ${tx.hash}，等待确认...`);
      const receipt = await tx.wait();
      
      // 处理收据
      const processedReceipt = this.processTransactionReceipt(receipt);
      
      logger.debug(`函数 ${functionName} 执行成功，交易hash: ${receipt.hash}`);
      return processedReceipt;
    } catch (error) {
      logger.error(`执行写入函数 ${contractName}.${functionName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 处理交易收据
   * @param {ethers.TransactionReceipt} receipt 交易收据
   * @returns {Object} 处理后的收据
   */
  processTransactionReceipt(receipt) {
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      from: receipt.from,
      to: receipt.to,
      status: receipt.status === 1 ? '成功' : '失败',
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data
      }))
    };
  }

  /**
   * 处理合约返回结果
   * @param {any} result 原始结果
   * @returns {any} 处理后的结果
   */
  processResult(result) {
    // 如果是数组，处理数组中的每个元素
    if (Array.isArray(result)) {
      return result.map(item => this.processResult(item));
    }
    
    // 如果是对象，检查是否是BigNumber或类似类型
    if (result && typeof result === 'object') {
      // 如果对象有toNumber方法，尝试转换为数字或字符串
      if (typeof result.toNumber === 'function') {
        try {
          return result.toNumber();
        } catch (e) {
          // 如果toNumber溢出，则转为字符串
          return result.toString();
        }
      }
      
      // 如果对象有toString方法并且不是标准对象的toString
      if (typeof result.toString === 'function' && 
          Object.prototype.toString.call(result) !== '[object Object]') {
        return result.toString();
      }
      
      // 递归处理对象的每个属性
      const processedObj = {};
      for (const key in result) {
        if (Object.prototype.hasOwnProperty.call(result, key) && 
            !key.startsWith('_') && 
            typeof result[key] !== 'function') {
          processedObj[key] = this.processResult(result[key]);
        }
      }
      return processedObj;
    }
    
    // 返回原始值
    return result;
  }
}

// 创建单例实例
const contractService = new ContractService();

module.exports = contractService; 