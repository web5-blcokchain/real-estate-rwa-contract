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

    // 使用规范化的方式获取合约地址
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
   * 获取网络特定的合约地址
   * @param {string} contractName - 合约名称 
   * @param {string} networkType - 网络类型
   * @returns {string} 合约地址
   */
  static getNetworkSpecificContractAddress(contractName, networkType) {
    if (!contractName) {
      throw new ConfigError('合约名称不能为空');
    }

    if (!networkType) {
      throw new ConfigError('网络类型不能为空');
    }

    // 规范化网络类型
    const normalizedNetworkType = NetworkConfig.normalizeNetworkType(networkType);
    
    // 构造网络特定环境变量键名
    const key = `${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${normalizedNetworkType}_${contractName}${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
    const address = EnvConfig.getEnv(key);
    
    if (!address) {
      // 如果找不到网络特定地址，回退到默认地址
      return this.getContractAddress(contractName);
    }
    
    if (!Validation.isValidAddress(address)) {
      throw new ConfigError(`网络 ${networkType} 下合约 ${contractName} 的地址格式无效: ${address}`);
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
    
    // 遍历环境变量，查找合约地址
    const allEnv = EnvConfig.getAllEnv();
    for (const key in allEnv) {
      const pattern = new RegExp(`^${prefix}([A-Z0-9_]+)${suffix}$`);
      const match = key.match(pattern);
      if (match) {
        const contractName = match[1];
        const address = allEnv[key];
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
        // 忽略不存在ABI的合约
        console.warn(`未找到合约 ${contractName} 的ABI信息`);
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
}

module.exports = ContractConfig; 