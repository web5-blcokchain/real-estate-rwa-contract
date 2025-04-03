const { ethers } = require('ethers');
const { ContractError } = require('../utils/errors');
const Logger = require('../utils/logger');
const Validation = require('../utils/validation');
const { ContractConfig } = require('../config');
const Provider = require('./provider');
const Wallet = require('./wallet');

/**
 * Contract 管理器类
 * 提供合约实例的创建、方法调用、事件监听等功能
 */
class Contract {
  /**
   * 创建合约实例
   * @param {Object} options - 配置选项
   * @param {string} [options.contractName] - 合约名称
   * @param {string} [options.address] - 合约地址
   * @param {string|Array} [options.abi] - 合约 ABI
   * @param {Object} [options.provider] - Provider 实例
   * @param {Object} [options.signer] - 签名者实例
   * @param {string} [options.privateKey] - 私钥
   * @param {string} [options.keyType] - 私钥类型，例如：'ADMIN', 'MANAGER', 'OPERATOR'等
   * @param {string} [options.networkType] - 网络类型
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  static async create(options = {}) {
    try {
      let address = options.address;
      let abi = options.abi;
      const networkType = options.networkType;
      
      // 如果提供了合约名称，使用ContractConfig获取地址和ABI
      if (options.contractName) {
        try {
          if (!address) {
            if (networkType) {
              // 获取特定网络的合约地址
              address = ContractConfig.getNetworkSpecificContractAddress(
                options.contractName, 
                networkType
              );
            } else {
              // 获取默认合约地址
              address = ContractConfig.getContractAddress(options.contractName);
            }
          }
          
          if (!abi) {
            // 获取合约ABI
            const contractConfig = ContractConfig.getContractConfig(options.contractName);
            abi = contractConfig.abi;
          }
        } catch (error) {
          throw new ContractError(`获取合约${options.contractName}配置失败: ${error.message}`);
        }
      }
      
      // 验证必要参数
      if (!address) {
        throw new ContractError('未提供合约地址或合约名称');
      }
      
      if (!abi) {
        throw new ContractError('未提供合约ABI或合约名称');
      }

      // 验证参数格式
      if (!Validation.isValidAddress(address)) {
        throw new ContractError('无效的合约地址');
      }

      if (!Validation.isValidAbi(abi)) {
        throw new ContractError('无效的合约 ABI');
      }

      // 创建Provider
      const provider = options.provider || await Provider.create({
        networkType: networkType
      });
      
      // 创建签名者
      let signer = options.signer;
      if (!signer) {
        if (options.privateKey) {
          // 使用私钥创建签名者
          signer = new ethers.Wallet(options.privateKey, provider);
        } else if (options.keyType) {
          // 使用密钥类型创建钱包
          const wallet = await Wallet.create({ 
            keyType: options.keyType, 
            provider 
          });
          signer = wallet;
        }
      }

      // 创建合约实例
      const contract = new ethers.Contract(address, abi, signer || provider);
      
      // 记录日志
      Logger.info('合约实例创建成功', { 
        contractName: options.contractName || '未命名合约',
        address,
        networkType: networkType || '默认网络'
      });
      
      return contract;
    } catch (error) {
      Logger.error('创建合约实例失败', { 
        error: error.message, 
        stack: error.stack,
        contractName: options.contractName 
      });
      
      if (error instanceof ContractError) {
        throw error;
      }
      throw new ContractError(`创建合约实例失败: ${error.message}`);
    }
  }

  /**
   * 调用合约只读方法
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} method - 方法名
   * @param {Array} args - 方法参数
   * @param {Object} [options] - 选项 
   * @returns {Promise<any>} 调用结果
   */
  static async call(contract, method, args = [], options = {}) {
    try {
      // 验证参数
      if (!Validation.isValidContract(contract)) {
        throw new ContractError('无效的合约实例');
      }

      if (!Validation.isValidString(method)) {
        throw new ContractError('无效的方法名');
      }

      // 调用合约方法
      const result = await contract[method](...args);
      
      // 记录日志
      Logger.debug('合约方法调用成功', {
        method,
        args: JSON.stringify(args),
        address: contract.address
      });
      
      return result;
    } catch (error) {
      Logger.error('调用合约方法失败', {
        method,
        args: JSON.stringify(args),
        error: error.message,
        stack: error.stack
      });
      
      throw new ContractError(`调用合约方法 ${method} 失败: ${error.message}`);
    }
  }

  /**
   * 调用合约写入方法
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} method - 方法名
   * @param {Array} args - 方法参数
   * @param {Object} [options] - 交易选项
   * @returns {Promise<Object>} 交易结果
   */
  static async send(contract, method, args = [], options = {}) {
    try {
      // 验证参数
      if (!Validation.isValidContract(contract)) {
        throw new ContractError('无效的合约实例');
      }

      if (!Validation.isValidString(method)) {
        throw new ContractError('无效的方法名');
      }

      // 检查合约是否有签名者
      if (!contract.signer) {
        throw new ContractError('合约实例没有签名者，无法发送交易');
      }

      // 确保方法存在且是函数
      if (typeof contract[method] !== 'function') {
        throw new ContractError(`合约不存在方法: ${method}`);
      }

      // 发送交易
      const tx = await contract[method](...args, options);
      
      // 记录日志
      Logger.info('合约交易已发送', {
        method,
        args: JSON.stringify(args),
        hash: tx.hash,
        address: contract.address
      });
      
      return tx;
    } catch (error) {
      Logger.error('发送合约交易失败', {
        method,
        args: JSON.stringify(args),
        error: error.message,
        stack: error.stack
      });
      
      throw new ContractError(`发送合约交易 ${method} 失败: ${error.message}`);
    }
  }

  /**
   * 监听合约事件
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @param {Object} [options] - 选项
   * @returns {ethers.EventFilter} 事件过滤器
   */
  static listen(contract, event, callback, options = {}) {
    try {
      // 验证参数
      if (!Validation.isValidContract(contract)) {
        throw new ContractError('无效的合约实例');
      }

      if (!Validation.isValidString(event)) {
        throw new ContractError('无效的事件名');
      }

      if (typeof callback !== 'function') {
        throw new ContractError('无效的回调函数');
      }

      // 验证事件是否存在
      if (!contract.interface.events[event]) {
        throw new ContractError(`合约不存在事件: ${event}`);
      }

      // 创建事件监听器
      const filter = contract.filters[event](...(options.filters || []));
      contract.on(filter, (...args) => {
        const eventData = args[args.length - 1];
        const eventArgs = {};
        
        // 解析事件参数
        if (eventData && eventData.args) {
          for (const [key, value] of Object.entries(eventData.args)) {
            if (isNaN(parseInt(key))) {
              eventArgs[key] = value;
            }
          }
        }
        
        // 调用回调函数
        callback({
          event,
          args: eventArgs,
          transactionHash: eventData.transactionHash,
          blockNumber: eventData.blockNumber,
          timestamp: Date.now()
        });
      });
      
      // 记录日志
      Logger.info('开始监听合约事件', {
        event,
        address: contract.address,
        filters: options.filters ? JSON.stringify(options.filters) : '无'
      });
      
      return filter;
    } catch (error) {
      Logger.error('监听合约事件失败', {
        event,
        error: error.message,
        stack: error.stack
      });
      
      throw new ContractError(`监听合约事件 ${event} 失败: ${error.message}`);
    }
  }

  /**
   * 停止监听合约事件
   * @param {ethers.Contract} contract - 合约实例
   * @param {string|ethers.EventFilter} eventOrFilter - 事件名称或事件过滤器
   */
  static stopListening(contract, eventOrFilter) {
    try {
      // 验证参数
      if (!Validation.isValidContract(contract)) {
        throw new ContractError('无效的合约实例');
      }

      // 停止监听
      contract.removeAllListeners(eventOrFilter);
      
      // 记录日志
      Logger.info('停止监听合约事件', {
        event: typeof eventOrFilter === 'string' ? eventOrFilter : '(使用过滤器)',
        address: contract.address
      });
    } catch (error) {
      Logger.error('停止监听合约事件失败', {
        error: error.message,
        stack: error.stack
      });
      
      throw new ContractError(`停止监听合约事件失败: ${error.message}`);
    }
  }

  /**
   * 获取合约接口
   * @param {ethers.Contract} contract - 合约实例
   * @returns {Object} 合约接口
   */
  static getInterface(contract) {
    try {
      // 验证参数
      if (!Validation.isValidContract(contract)) {
        throw new ContractError('无效的合约实例');
      }

      // 获取接口信息
      const functions = {};
      const events = {};
      
      // 获取所有函数
      for (const fnFragment of Object.values(contract.interface.functions)) {
        functions[fnFragment.name] = {
          name: fnFragment.name,
          type: fnFragment.type,
          inputs: fnFragment.inputs,
          outputs: fnFragment.outputs,
          stateMutability: fnFragment.stateMutability
        };
      }
      
      // 获取所有事件
      for (const eventFragment of Object.values(contract.interface.events)) {
        events[eventFragment.name] = {
          name: eventFragment.name,
          inputs: eventFragment.inputs
        };
      }
      
      const result = {
        address: contract.address,
        functions,
        events
      };
      
      // 记录日志
      Logger.debug('获取合约接口成功', { address: contract.address });
      
      return result;
    } catch (error) {
      Logger.error('获取合约接口失败', {
        error: error.message,
        stack: error.stack
      });
      
      throw new ContractError(`获取合约接口失败: ${error.message}`);
    }
  }
}

module.exports = Contract; 