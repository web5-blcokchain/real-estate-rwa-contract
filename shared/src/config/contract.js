const path = require('path');
const fs = require('fs');
const { Validation } = require('../utils/validation');
const { ConfigError } = require('../utils/errors');
const EnvConfig = require('./env');
const AbiConfig = require('./abi');
const NetworkConfig = require('./network');

/**
 * 合约配置类
 */
class ContractConfig {
  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称
   * @returns {string} 合约地址
   */
  static getContractAddress(contractName) {
    if (!contractName) {
      throw new ConfigError('合约名称不能为空');
    }

    // 构造合约地址的环境变量键名
    const key = `${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${contractName}${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
    const address = EnvConfig.getEnv(key);
    
    if (!address) {
      throw new ConfigError(`合约 ${contractName} 的地址未配置，请检查环境变量: ${key}`);
    }
    
    if (!Validation.isValidAddress(address)) {
      throw new ConfigError(`合约 ${contractName} 的地址格式无效: ${address}`);
    }
    
    return address;
  }

  /**
   * 获取所有合约地址
   * @returns {Object} 合约名称和地址的映射
   */
  static getAllContractAddresses() {
    const addresses = {};
    const prefix = EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_PREFIX;
    const suffix = EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_SUFFIX;
    
    // 获取所有环境变量
    const envVars = EnvConfig.getAllEnv();
    
    // 遍历环境变量，查找合约地址
    for (const key in envVars) {
      const pattern = new RegExp(`^${prefix}([A-Z0-9_]+)${suffix}$`);
      const match = key.match(pattern);
      if (match) {
        const contractName = match[1];
        const address = envVars[key];
        if (address && Validation.isValidAddress(address)) {
          addresses[contractName] = address;
        }
      }
    }
    
    return addresses;
  }

  /**
   * 获取合约完整配置（地址和ABI）
   * @param {string} contractName - 合约名称
   * @returns {Object} 合约配置 {name, address, abi, functions, events}
   * @throws {ConfigError} 配置错误
   */
  static getContractConfig(contractName) {
    if (!contractName) {
      throw new ConfigError('合约名称不能为空');
    }
    
    try {
      // 获取合约地址
      const address = this.getContractAddress(contractName);
      
      // 获取合约ABI
      const contractInfo = AbiConfig.getContractAbi(contractName);
      if (!contractInfo || !contractInfo.abi) {
        throw new ConfigError(`未找到合约 ${contractName} 的ABI信息`);
      }
      
      // 返回完整配置
      return {
        name: contractName,
        address,
        abi: contractInfo.abi,
        functions: contractInfo.functions || {},
        events: contractInfo.events || {}
      };
    } catch (error) {
      throw new ConfigError(`获取合约 ${contractName} 配置失败: ${error.message}`);
    }
  }

  /**
   * 获取所有合约配置
   * @returns {Object} 所有合约配置的映射
   */
  static getAllContractConfigs() {
    const addresses = this.getAllContractAddresses();
    const contracts = {};
    
    for (const [contractName, address] of Object.entries(addresses)) {
      try {
        const contractInfo = AbiConfig.getContractAbi(contractName);
        if (contractInfo && contractInfo.abi) {
          contracts[contractName] = {
            name: contractName,
            address,
            abi: contractInfo.abi,
            functions: contractInfo.functions || {},
            events: contractInfo.events || {}
          };
        }
      } catch (error) {
        // 忽略不存在ABI的合约，但记录警告日志
        console.warn(`未找到合约 ${contractName} 的ABI信息: ${error.message}`);
      }
    }
    
    return contracts;
  }
  
  /**
   * 验证合约配置完整性
   * @param {string} contractName - 合约名称
   * @returns {boolean} 是否配置完整
   */
  static validateContractConfig(contractName) {
    try {
      if (!contractName) return false;
      
      // 验证合约地址
      const address = this.getContractAddress(contractName);
      if (!address || !Validation.isValidAddress(address)) return false;
      
      // 验证合约ABI
      const contractInfo = AbiConfig.getContractAbi(contractName);
      if (!contractInfo || !contractInfo.abi) return false;
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 根据网络类型获取对应网络的合约地址
   * @param {string} contractName - 合约名称
   * @param {string} [networkType] - 网络类型，默认使用当前环境配置的网络类型
   * @returns {string} 合约地址
   */
  static getNetworkSpecificContractAddress(contractName, networkType) {
    if (!contractName) {
      throw new ConfigError('合约名称不能为空');
    }
    
    // 如果未指定网络类型，使用当前环境配置的网络类型
    const network = networkType || NetworkConfig.getNetworkType();
    const normalizedNetwork = NetworkConfig.normalizeNetworkType(network);
    
    // 构造特定网络的合约地址键名
    const key = `${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${contractName}_${normalizedNetwork}${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
    const address = EnvConfig.getEnv(key);
    
    if (!address) {
      // 尝试获取通用合约地址
      return this.getContractAddress(contractName);
    }
    
    if (!Validation.isValidAddress(address)) {
      throw new ConfigError(`网络 ${normalizedNetwork} 上合约 ${contractName} 的地址格式无效: ${address}`);
    }
    
    return address;
  }
}

module.exports = ContractConfig; 