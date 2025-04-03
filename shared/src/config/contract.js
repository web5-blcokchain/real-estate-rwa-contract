const path = require('path');
const fs = require('fs');
const { Validation } = require('../utils/validation');
const { ConfigError } = require('../utils/errors');
const EnvConfig = require('./env');
const AbiConfig = require('./abi');

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

    // 构造环境变量键名
    const envKey = `${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${contractName.toUpperCase()}${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
    const address = EnvConfig.getEnv(envKey);
    
    if (!address) {
      throw new ConfigError(`未找到合约 ${contractName} 的地址`);
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
    for (const key in process.env) {
      const pattern = new RegExp(`^${prefix}([A-Z0-9_]+)${suffix}$`);
      const match = key.match(pattern);
      if (match) {
        const contractName = match[1];
        const address = EnvConfig.getEnv(key);
        if (address) {
          addresses[contractName] = address;
        }
      }
    }
    
    return addresses;
  }

  /**
   * 获取合约实例配置
   * @param {string} contractName - 合约名称
   * @returns {Object} 合约配置 {address, abi}
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
    
    return {
      name: contractName,
      address,
      abi: contractInfo.abi,
      functions: contractInfo.functions,
      events: contractInfo.events
    };
  }

  /**
   * 获取所有合约配置
   * @returns {Object} 所有合约配置
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
            functions: contractInfo.functions,
            events: contractInfo.events
          };
        }
      } catch (error) {
        // 忽略不存在ABI的合约
        console.warn(`未找到合约 ${contractName} 的ABI信息`);
      }
    }
    
    return contracts;
  }
}

module.exports = ContractConfig; 