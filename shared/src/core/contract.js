const { ethers } = require('ethers');
const { ContractError } = require('../utils/errors');
const Logger = require('../utils/logger');
const { Validation } = require('../utils/validation');
const EnvConfig = require('../config/env');
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
   * @param {string} options.address - 合约地址
   * @param {string} options.abi - 合约 ABI
   * @param {Object} [options.provider] - Provider 实例
   * @param {Object} [options.signer] - 签名者实例
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  static async create(options = {}) {
    try {
      // 获取配置
      const networkConfig = EnvConfig.getNetworkConfig();
      const contractConfig = EnvConfig.getContractConfig();

      // 设置默认值
      const address = options.address || contractConfig.address;
      const abi = options.abi || contractConfig.abi;
      const provider = options.provider || await Provider.create(networkConfig);
      const signer = options.signer || await Wallet.create();

      // 验证参数
      Validation.validate(
        Validation.isValidAddress(address),
        '无效的合约地址'
      );

      Validation.validate(
        Validation.isValidAbi(abi),
        '无效的合约 ABI'
      );

      // 创建合约实例
      const contract = new ethers.Contract(address, abi, signer || provider);
      
      // 记录日志
      Logger.info(`合约实例创建成功: ${address}`, { module: 'contract' });
      
      return contract;
    } catch (error) {
      throw new ContractError(`创建合约实例失败: ${error.message}`);
    }
  }

  /**
   * 调用合约只读方法
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} method - 方法名
   * @param {Array} args - 方法参数
   * @returns {Promise<any>} 方法返回值
   */
  static async call(contract, method, args = []) {
    try {
      // 验证参数
      Validation.validate(
        Validation.isValidContract(contract),
        '无效的合约实例'
      );

      Validation.validate(
        Validation.isValidString(method),
        '无效的方法名'
      );

      // 调用方法
      const result = await contract[method](...args);
      
      // 记录日志
      Logger.debug(`合约方法调用成功: ${method}(${args.join(', ')})`);
      
      return result;
    } catch (error) {
      throw new ContractError(`调用合约方法失败: ${error.message}`);
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
      Validation.validate(
        Validation.isValidContract(contract),
        '无效的合约实例'
      );

      Validation.validate(
        Validation.isValidString(method),
        '无效的方法名'
      );

      // 发送交易
      const tx = await contract[method](...args, options);
      
      // 记录日志
      Logger.info(`合约交易已发送: ${method}(${args.join(', ')})`);
      
      return tx;
    } catch (error) {
      throw new ContractError(`发送合约交易失败: ${error.message}`);
    }
  }

  /**
   * 监听合约事件
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} event - 事件名
   * @param {Object} [filter] - 事件过滤器
   * @param {Function} callback - 回调函数
   * @returns {Promise<ethers.ContractEvent>} 事件监听器
   */
  static async on(contract, event, filter = {}, callback) {
    try {
      // 验证参数
      Validation.validate(
        Validation.isValidContract(contract),
        '无效的合约实例'
      );

      Validation.validate(
        Validation.isValidString(event),
        '无效的事件名'
      );

      Validation.validate(
        Validation.isValidObject(filter),
        '无效的事件过滤器'
      );

      Validation.validate(
        Validation.isValidFunction(callback),
        '无效的回调函数'
      );

      // 设置事件监听
      const listener = contract.on(event, filter, callback);
      
      // 记录日志
      Logger.info(`事件监听已启动: ${event}`);
      
      return listener;
    } catch (error) {
      throw new ContractError(`监听合约事件失败: ${error.message}`);
    }
  }

  /**
   * 查询合约事件
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} event - 事件名
   * @param {Object} [filter] - 事件过滤器
   * @param {Object} [options] - 查询选项
   * @returns {Promise<Array>} 事件日志
   */
  static async queryFilter(contract, event, filter = {}, options = {}) {
    try {
      // 验证参数
      Validation.validate(
        Validation.isValidContract(contract),
        '无效的合约实例'
      );

      Validation.validate(
        Validation.isValidString(event),
        '无效的事件名'
      );

      Validation.validate(
        Validation.isValidObject(filter),
        '无效的事件过滤器'
      );

      // 查询事件
      const logs = await contract.queryFilter(event, filter, options);
      
      // 记录日志
      Logger.debug(`事件查询成功: ${event}`);
      
      return logs;
    } catch (error) {
      throw new ContractError(`查询合约事件失败: ${error.message}`);
    }
  }

  /**
   * 获取合约字节码
   * @param {ethers.Contract} contract - 合约实例
   * @returns {string} 合约字节码
   */
  static async getBytecode(contract) {
    try {
      // 验证参数
      Validation.validate(
        Validation.isValidContract(contract),
        '无效的合约实例'
      );

      // 获取字节码
      const bytecode = await contract.runner.provider.getCode(contract.target);
      
      // 记录日志
      Logger.debug(`获取合约字节码成功`);
      
      return bytecode;
    } catch (error) {
      throw new ContractError(`获取合约字节码失败: ${error.message}`);
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
      Validation.validate(
        Validation.isValidContract(contract),
        '无效的合约实例'
      );

      // 获取接口
      const iface = contract.interface;
      
      // 记录日志
      Logger.debug(`获取合约接口成功`);
      
      return iface;
    } catch (error) {
      throw new ContractError(`获取合约接口失败: ${error.message}`);
    }
  }
}

module.exports = Contract; 