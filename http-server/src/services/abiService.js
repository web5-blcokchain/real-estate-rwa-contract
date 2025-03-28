/**
 * ABI分析服务
 * 用于提取和分析智能合约ABI
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { getAbi } = require('../../../shared/utils/getAbis');
const { getContractAddresses } = require('../../../shared/config/contracts');
const { initializeAbis } = require('../../../shared/utils/initializeAbis');

/**
 * 分析ABI并返回函数和事件信息
 */
class AbiService {
  constructor() {
    this.contractData = new Map();
    this.initialized = false;
    this.initializationAttempted = false;
  }

  /**
   * 初始化服务，加载所有合约的ABI
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    this.initializationAttempted = true;

    try {
      logger.info('初始化ABI服务...');
      
      // 初始化ABI
      await initializeAbis(logger);
      
      // 获取所有部署的合约地址
      let contractAddresses = {};
      try {
        contractAddresses = getContractAddresses();
        logger.debug(`已找到 ${Object.keys(contractAddresses).length} 个部署的合约`);
      } catch (error) {
        logger.warn('无法获取合约地址:', error);
        // 继续执行，尝试使用其他方法获取ABI
      }
      
      // 为每个合约解析ABI
      for (const [contractName, contractAddress] of Object.entries(contractAddresses)) {
        try {
          // 跳过特殊字段
          if (contractName === 'RealEstateTokenImplementation') {
            continue;
          }
          
          // 获取合约ABI
          let abi = [];
          try {
            abi = getAbi(contractName);
          } catch (error) {
            logger.warn(`无法获取 ${contractName} 的ABI: ${error.message}`);
            // 继续尝试解析其他合约
            continue;
          }
          
          // 解析ABI，将函数和事件分开
          const { functions, events, readFunctions, writeFunctions } = this.parseAbi(abi);
          
          // 保存合约数据
          this.contractData.set(contractName, {
            name: contractName,
            address: contractAddress,
            abi,
            functions,
            events,
            readFunctions,
            writeFunctions
          });
          
          logger.debug(`已解析 ${contractName} 的ABI: ${functions.length} 函数, ${events.length} 事件`);
        } catch (error) {
          logger.warn(`解析 ${contractName} 的ABI时出错:`, error);
          // 继续处理其他合约
        }
      }
      
      this.initialized = this.contractData.size > 0;
      
      if (this.initialized) {
        logger.info(`ABI服务初始化完成，已加载 ${this.contractData.size} 个合约`);
      } else {
        logger.warn('ABI服务初始化未完全成功，没有加载任何合约');
      }
    } catch (error) {
      logger.error('初始化ABI服务失败:', error);
      throw error;
    }
  }

  /**
   * 解析ABI，将函数和事件分开
   * @param {Array} abi 合约ABI
   * @returns {Object} 包含函数和事件的对象
   */
  parseAbi(abi) {
    const functions = [];
    const events = [];
    const readFunctions = [];
    const writeFunctions = [];
    
    if (!Array.isArray(abi)) {
      logger.warn('ABI不是数组，无法解析');
      return { functions, events, readFunctions, writeFunctions };
    }
    
    // 遍历ABI项
    for (const item of abi) {
      if (item.type === 'function') {
        // 函数
        const isReadFunction = ['view', 'pure'].includes(item.stateMutability);
        
        // 构建函数对象
        const func = {
          name: item.name,
          inputs: item.inputs || [],
          outputs: item.outputs || [],
          stateMutability: item.stateMutability,
          isRead: isReadFunction,
          signature: this.generateFunctionSignature(item)
        };
        
        functions.push(func);
        
        // 根据类型分类
        if (isReadFunction) {
          readFunctions.push(func);
        } else {
          writeFunctions.push(func);
        }
      } else if (item.type === 'event') {
        // 事件
        events.push({
          name: item.name,
          inputs: item.inputs || [],
          anonymous: item.anonymous || false
        });
      }
    }
    
    return { functions, events, readFunctions, writeFunctions };
  }

  /**
   * 生成函数签名
   * @param {Object} funcAbi 函数ABI
   * @returns {string} 函数签名
   */
  generateFunctionSignature(funcAbi) {
    const inputTypes = (funcAbi.inputs || [])
      .map(input => input.type)
      .join(',');
    
    return `${funcAbi.name}(${inputTypes})`;
  }

  /**
   * 获取所有合约
   * @returns {Array} 所有合约信息
   */
  getAllContracts() {
    // 如果尚未初始化，尝试初始化
    if (!this.initializationAttempted) {
      logger.warn('ABI服务尚未初始化，尝试延迟初始化');
      // 不等待结果，返回空数组
      this.initialize().catch(error => {
        logger.error('延迟初始化ABI服务失败:', error);
      });
      return [];
    }
    
    return Array.from(this.contractData.values());
  }

  /**
   * 获取特定合约
   * @param {string} contractName 合约名称
   * @returns {Object} 合约信息
   */
  getContract(contractName) {
    // 如果尚未初始化，尝试初始化
    if (!this.initializationAttempted) {
      logger.warn('ABI服务尚未初始化，尝试延迟初始化');
      // 不等待结果，返回null
      this.initialize().catch(error => {
        logger.error('延迟初始化ABI服务失败:', error);
      });
      return null;
    }
    
    return this.contractData.get(contractName);
  }

  /**
   * 获取合约的所有函数
   * @param {string} contractName 合约名称
   * @returns {Array} 合约函数列表
   */
  getContractFunctions(contractName) {
    const contract = this.getContract(contractName);
    return contract ? contract.functions : [];
  }

  /**
   * 获取合约的只读函数
   * @param {string} contractName 合约名称
   * @returns {Array} 合约只读函数列表
   */
  getContractReadFunctions(contractName) {
    const contract = this.getContract(contractName);
    return contract ? contract.readFunctions : [];
  }

  /**
   * 获取合约的写入函数
   * @param {string} contractName 合约名称
   * @returns {Array} 合约写入函数列表
   */
  getContractWriteFunctions(contractName) {
    const contract = this.getContract(contractName);
    return contract ? contract.writeFunctions : [];
  }
  
  /**
   * 获取合约的特定函数
   * @param {string} contractName 合约名称
   * @param {string} functionName 函数名称
   * @returns {Object} 函数信息
   */
  getContractFunction(contractName, functionName) {
    const contract = this.getContract(contractName);
    if (!contract) return null;
    
    return contract.functions.find(f => f.name === functionName);
  }
}

// 创建单例实例
const abiService = new AbiService();

module.exports = abiService; 