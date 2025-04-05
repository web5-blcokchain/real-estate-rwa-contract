/**
 * 合约服务
 * 提供智能合约交互的通用服务
 */
const { Logger, ErrorHandler, Validation, Contract } = require('../lib/shared');
const config = require('../config');
const blockchainService = require('./BlockchainService');
const path = require('path');
const fs = require('fs');

/**
 * 合约服务
 */
class ContractService {
  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称
   * @returns {string|null} - 合约地址或null
   */
  getContractAddress(contractName) {
    try {
      Validation.validate(
        Validation.isNotEmpty(contractName),
        '合约名称不能为空'
      );
      
      // 从配置获取合约地址
      const addresses = config.getContractAddresses();
      const address = addresses[contractName];
      
      if (address) {
        return address;
      }

      // 从环境变量获取
      const envKey = `CONTRACT_${contractName.toUpperCase()}_ADDRESS`;
      const envAddress = process.env[envKey];
      
      if (envAddress) {
        return envAddress;
      }
      
      Logger.warn(`找不到合约 ${contractName} 的地址`);
      return null;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getContractAddress', contractName }
      });
      Logger.error(`获取合约地址失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取所有合约地址
   * @returns {Object} - 合约地址映射
   */
  getAllContractAddresses() {
    try {
      return config.getContractAddresses();
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getAllContractAddresses' }
      });
      Logger.error(`获取所有合约地址失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取合约ABI
   * @param {string} contractName - 合约名称
   * @returns {Object|null} - 合约ABI或null
   */
  getContractABI(contractName) {
    try {
      Validation.validate(
        Validation.isNotEmpty(contractName),
        '合约名称不能为空'
      );
      
      return config.getContractABI(contractName);
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getContractABI', contractName }
      });
      Logger.error(`获取合约ABI失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 创建合约实例
   * @param {string} contractName - 合约名称
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} - 合约实例
   */
  async createContractInstance(contractName, options = {}) {
    try {
      Validation.validate(
        Validation.isNotEmpty(contractName),
        '合约名称不能为空'
      );

      // 获取合约ABI
      const abi = options.abi || this.getContractABI(contractName);
      if (!abi) {
        throw new Error(`找不到合约 ${contractName} 的ABI`);
      }
      
      // 获取合约地址
      const address = options.address || this.getContractAddress(contractName);
      if (!address) {
        throw new Error(`找不到合约 ${contractName} 的地址`);
      }
      
      // 获取Provider
      const provider = options.provider || blockchainService.provider;
      if (!provider) {
        throw new Error('Provider不可用');
      }
      
      // 创建合约实例
      return await Contract.create({
        abi,
        address,
        provider,
        wallet: options.wallet
      });
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'createContractInstance', contractName }
      });
      Logger.error(`创建合约实例失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }
}

// 导出合约服务实例
module.exports = new ContractService(); 