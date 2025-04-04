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
      let abiPath = options.abiPath || '';
      
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
            
            // 记录ABI路径
            abiPath = contractConfig.abiPath || `contracts/${options.contractName}.json`;
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
      
      // 存储合约元数据
      contract._metadata = {
        contractName: options.contractName || '未命名合约',
        address,
        networkType: networkType || '默认网络',
        abiPath,
        createdAt: new Date().toISOString()
      };
      
      // 记录日志
      Logger.info('合约实例创建成功', { 
        contractName: options.contractName || '未命名合约',
        address,
        networkType: networkType || '默认网络',
        abiPath
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

      // 获取合约元数据
      const metadata = contract._metadata || {
        contractName: '未命名合约',
        address: contract.address
      };
      
      // 调用合约方法
      const result = await contract[method](...args);
      
      // 记录合约调用详细日志
      Logger.logContractCall({
        contractName: metadata.contractName,
        contractAddress: contract.address,
        method,
        args,
        abiPath: metadata.abiPath,
        result,
        isWrite: false,
        module: options.logModule || 'contract'
      });
      
      return result;
    } catch (error) {
      // 获取合约元数据
      const metadata = contract._metadata || {
        contractName: '未命名合约',
        address: contract.address
      };
      
      // 记录错误日志
      Logger.logContractCall({
        contractName: metadata.contractName,
        contractAddress: contract.address,
        method,
        args,
        abiPath: metadata.abiPath,
        error,
        isWrite: false,
        module: options.logModule || 'contract'
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

      // 获取合约元数据
      const metadata = contract._metadata || {
        contractName: '未命名合约',
        address: contract.address
      };
      
      // 发送交易
      const txOptions = { ...options };
      delete txOptions.logModule; // 移除非交易选项
      
      const tx = await contract[method](...args, txOptions);
      
      // 记录交易发送日志
      Logger.info('合约交易已发送', {
        contractName: metadata.contractName,
        method,
        args: JSON.stringify(args),
        address: contract.address,
        txHash: tx.hash,
        networkType: metadata.networkType
      });
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      // 记录详细合约调用日志
      Logger.logContractCall({
        contractName: metadata.contractName,
        contractAddress: contract.address,
        method,
        args,
        abiPath: metadata.abiPath,
        result: receipt,
        isWrite: true,
        gasUsed: receipt.gasUsed?.toString(),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        module: options.logModule || 'contract'
      });
      
      return receipt;
    } catch (error) {
      // 获取合约元数据
      const metadata = contract._metadata || {
        contractName: '未命名合约',
        address: contract.address
      };
      
      // 记录错误日志
      Logger.logContractCall({
        contractName: metadata.contractName,
        contractAddress: contract.address,
        method,
        args,
        abiPath: metadata.abiPath,
        error,
        isWrite: true,
        module: options.logModule || 'contract'
      });
      
      throw new ContractError(`调用合约方法 ${method} 失败: ${error.message}`);
    }
  }

  /**
   * 监听合约事件
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @param {Object} [options] - 选项
   * @returns {Object} 事件过滤器
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
        throw new ContractError('回调必须是函数');
      }

      // 获取合约元数据
      const metadata = contract._metadata || {
        contractName: '未命名合约',
        address: contract.address
      };

      // 创建过滤器参数
      const filterParams = [];
      if (options.filter) {
        for (const key in options.filter) {
          filterParams.push(options.filter[key]);
        }
      }

      // 创建事件过滤器
      const filter = contract.filters[event](...filterParams);
      
      // 添加日志修饰的回调函数
      const wrappedCallback = (...eventArgs) => {
        const eventObj = eventArgs[eventArgs.length - 1];
        
        // 记录事件日志
        Logger.info(`合约事件触发: ${event}`, {
          contractName: metadata.contractName,
          address: contract.address,
          event,
          blockNumber: eventObj.blockNumber,
          txHash: eventObj.transactionHash,
          args: eventArgs.slice(0, -1)
        });
        
        // 调用原始回调
        callback(...eventArgs);
      };

      // 监听事件
      contract.on(filter, wrappedCallback);
      
      // 记录日志
      Logger.info(`开始监听合约事件: ${event}`, {
        contractName: metadata.contractName,
        address: contract.address,
        event,
        filter: options.filter
      });
      
      // 返回带有引用的过滤器，以便后续可以停止监听
      return {
        filter,
        callback: wrappedCallback
      };
    } catch (error) {
      Logger.error(`监听合约事件失败: ${event}`, {
        error: error.message,
        stack: error.stack,
        address: contract.address
      });
      
      throw new ContractError(`监听合约事件 ${event} 失败: ${error.message}`);
    }
  }

  /**
   * 停止监听合约事件
   * @param {ethers.Contract} contract - 合约实例
   * @param {Object} eventOrFilter - 事件过滤器或事件名
   */
  static stopListening(contract, eventOrFilter) {
    try {
      // 验证参数
      if (!Validation.isValidContract(contract)) {
        throw new ContractError('无效的合约实例');
      }

      // 获取合约元数据
      const metadata = contract._metadata || {
        contractName: '未命名合约',
        address: contract.address
      };

      // 根据传入参数类型决定如何移除监听器
      if (typeof eventOrFilter === 'string') {
        // 如果是事件名称，移除该事件的所有监听器
        contract.removeAllListeners(eventOrFilter);
        
        Logger.info(`已停止监听合约事件: ${eventOrFilter}`, {
          contractName: metadata.contractName,
          address: contract.address
        });
      } else if (eventOrFilter && eventOrFilter.filter) {
        // 如果是由listen方法返回的对象，使用存储的回调
        contract.off(eventOrFilter.filter, eventOrFilter.callback);
        
        Logger.info('已停止监听合约事件', {
          contractName: metadata.contractName,
          address: contract.address,
          filter: JSON.stringify(eventOrFilter.filter)
        });
      } else {
        // 否则移除所有监听器
        contract.removeAllListeners();
        
        Logger.info('已停止监听所有合约事件', {
          contractName: metadata.contractName,
          address: contract.address
        });
      }
    } catch (error) {
      Logger.error('停止监听合约事件失败', {
        error: error.message,
        stack: error.stack,
        address: contract.address
      });
      
      throw new ContractError(`停止监听合约事件失败: ${error.message}`);
    }
  }

  /**
   * 获取合约接口
   * @param {ethers.Contract} contract - 合约实例
   * @returns {ethers.utils.Interface} 合约接口
   */
  static getInterface(contract) {
    if (!Validation.isValidContract(contract)) {
      throw new ContractError('无效的合约实例');
    }
    
    return contract.interface;
  }
}

module.exports = Contract; 