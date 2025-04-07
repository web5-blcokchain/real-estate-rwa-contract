/**
 * 合约地址管理工具
 * 用于从环境变量加载合约地址
 */
const Logger = require('./logger');
const Validation = require('./validation');
const { ContractError } = require('./errors');

/**
 * 合约地址管理类
 */
class ContractAddress {
  /**
   * 缓存的合约地址
   * @private
   */
  static _cachedAddresses = {};

  /**
   * 合约名称别名映射
   * @private
   */
  static _contractAliases = {
    'RealEstateFacade': 'Facade',
    'RealEstateSystem': 'System'
  };

  /**
   * 从环境变量获取合约地址
   * @param {string} contractName - 合约名称
   * @returns {string} 合约地址
   */
  static getAddress(contractName) {
    try {
      // 参数验证
      if (!contractName) {
        throw new ContractError('合约名称不能为空');
      }
      
      // 检查缓存
      if (this._cachedAddresses[contractName]) {
        return this._cachedAddresses[contractName];
      }

      // 检查别名映射
      const aliasedName = this._contractAliases[contractName] || contractName;
      
      // 尝试不同格式的环境变量名
      const possibleEnvVars = [
        // 1. 合约名_ADDRESS (例如：REALESTATEFACADE_ADDRESS)
        `${contractName.toUpperCase()}_ADDRESS`,
        
        // 2. CONTRACT_合约名 (例如：CONTRACT_REALESTATEFACADE)
        `CONTRACT_${contractName.toUpperCase()}`,
        
        // 3. 合约名_CONTRACT_ADDRESS (例如：REALESTATEFACADE_CONTRACT_ADDRESS)
        `${contractName.toUpperCase()}_CONTRACT_ADDRESS`,
        
        // 4. CONTRACT_合约名_ADDRESS (例如：CONTRACT_REALESTATEFACADE_ADDRESS)
        `CONTRACT_${contractName.toUpperCase()}_ADDRESS`,
        
        // 5. 尝试别名 (如果有)
        ...(aliasedName !== contractName ? [
          `${aliasedName.toUpperCase()}_ADDRESS`,
          `CONTRACT_${aliasedName.toUpperCase()}`,
          `${aliasedName.toUpperCase()}_CONTRACT_ADDRESS`,
          `CONTRACT_${aliasedName.toUpperCase()}_ADDRESS`
        ] : [])
      ];
      
      // 尝试查找环境变量
      let address = null;
      for (const envVar of possibleEnvVars) {
        if (process.env[envVar]) {
          address = process.env[envVar];
          Logger.debug(`从环境变量 ${envVar} 加载合约地址`, { contractName, address });
          break;
        }
      }
      
      // 验证地址是否存在且有效
      if (!address) {
        throw new ContractError(`找不到合约 ${contractName} 的地址`);
      }
      
      if (!Validation.isValidAddress(address)) {
        throw new ContractError(`合约 ${contractName} 的地址格式无效: ${address}`);
      }
      
      // 保存到缓存
      this._cachedAddresses[contractName] = address;
      
      return address;
    } catch (error) {
      if (error instanceof ContractError) {
        throw error;
      }
      throw new ContractError(`获取合约地址失败: ${error.message}`);
    }
  }

  /**
   * 获取多个合约地址
   * @param {Array<string>} contractNames - 合约名称数组
   * @returns {Object} 合约地址映射
   */
  static getAddresses(contractNames) {
    const addresses = {};
    
    for (const contractName of contractNames) {
      try {
        addresses[contractName] = this.getAddress(contractName);
      } catch (error) {
        Logger.warn(`获取合约 ${contractName} 地址失败`, { error: error.message });
        // 继续下一个，而不是抛出错误
      }
    }
    
    return addresses;
  }

  /**
   * 设置合约地址（主要用于测试或动态更新）
   * @param {string} contractName - 合约名称
   * @param {string} address - 合约地址
   */
  static setAddress(contractName, address) {
    if (!contractName) {
      throw new ContractError('合约名称不能为空');
    }
    
    if (!Validation.isValidAddress(address)) {
      throw new ContractError(`无效的合约地址: ${address}`);
    }
    
    this._cachedAddresses[contractName] = address;
    
    Logger.info(`设置合约 ${contractName} 地址`, { 
      contractName, 
      address
    });
  }

  /**
   * 清除地址缓存
   */
  static clearCache() {
    this._cachedAddresses = {};
    Logger.debug('已清除合约地址缓存');
  }

  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称
   * @returns {string} 合约地址
   */
  static getContractAddress(contractName) {
    try {
      // 参数验证
      if (!contractName) {
        throw new ContractError('合约名称不能为空');
      }
      
      // 检查缓存
      const cacheKey = `${contractName}_CONTRACT`;
      if (this._cachedAddresses[cacheKey]) {
        return this._cachedAddresses[cacheKey];
      }

      // 检查别名映射
      const aliasedName = this._contractAliases[contractName] || contractName;
      
      // 尝试不同格式的环境变量名
      const possibleEnvVars = [
        // 1. 合约名_ADDRESS (例如：REALESTATEFACADE_ADDRESS)
        `${contractName.toUpperCase()}_ADDRESS`,
        
        // 2. CONTRACT_合约名 (例如：CONTRACT_REALESTATEFACADE)
        `CONTRACT_${contractName.toUpperCase()}`,
        
        // 3. 合约名_CONTRACT_ADDRESS (例如：REALESTATEFACADE_CONTRACT_ADDRESS)
        `${contractName.toUpperCase()}_CONTRACT_ADDRESS`,
        
        // 4. CONTRACT_合约名_ADDRESS (例如：CONTRACT_REALESTATEFACADE_ADDRESS)
        `CONTRACT_${contractName.toUpperCase()}_ADDRESS`,
        
        // 5. 尝试别名 (如果有)
        ...(aliasedName !== contractName ? [
          `${aliasedName.toUpperCase()}_ADDRESS`,
          `CONTRACT_${aliasedName.toUpperCase()}`,
          `${aliasedName.toUpperCase()}_CONTRACT_ADDRESS`,
          `CONTRACT_${aliasedName.toUpperCase()}_ADDRESS`
        ] : [])
      ];
      
      // 尝试查找环境变量
      let address = null;
      for (const envVar of possibleEnvVars) {
        if (process.env[envVar]) {
          address = process.env[envVar];
          Logger.debug(`从环境变量 ${envVar} 加载合约地址`, { contractName, address });
          break;
        }
      }
      
      // 验证地址是否存在且有效
      if (!address) {
        throw new ContractError(`找不到合约 ${contractName} 的地址`);
      }
      
      if (!Validation.isValidAddress(address)) {
        throw new ContractError(`合约 ${contractName} 的地址格式无效: ${address}`);
      }
      
      // 保存到缓存
      this._cachedAddresses[cacheKey] = address;
      
      return address;
    } catch (error) {
      if (error instanceof ContractError) {
        throw error;
      }
      throw new ContractError(`获取合约地址失败: ${error.message}`);
    }
  }

  /**
   * 获取合约实现地址
   * @param {string} contractName - 合约名称
   * @returns {string} 合约实现地址
   */
  static getImplementationAddress(contractName) {
    try {
      // 参数验证
      if (!contractName) {
        throw new ContractError('合约名称不能为空');
      }
      
      // 检查缓存
      const cacheKey = `${contractName}_IMPLEMENTATION`;
      if (this._cachedAddresses[cacheKey]) {
        return this._cachedAddresses[cacheKey];
      }

      // 检查别名映射
      const aliasedName = this._contractAliases[contractName] || contractName;
      
      // 尝试不同格式的环境变量名
      const possibleEnvVars = [
        // 1. 合约名_IMPLEMENTATION (例如：REALESTATEFACADE_IMPLEMENTATION)
        `${contractName.toUpperCase()}_IMPLEMENTATION`,
        
        // 2. CONTRACT_合约名_IMPLEMENTATION (例如：CONTRACT_REALESTATEFACADE_IMPLEMENTATION)
        `CONTRACT_${contractName.toUpperCase()}_IMPLEMENTATION`,
        
        // 3. 尝试别名 (如果有)
        ...(aliasedName !== contractName ? [
          `${aliasedName.toUpperCase()}_IMPLEMENTATION`,
          `CONTRACT_${aliasedName.toUpperCase()}_IMPLEMENTATION`
        ] : [])
      ];
      
      // 尝试查找环境变量
      let address = null;
      for (const envVar of possibleEnvVars) {
        if (process.env[envVar]) {
          address = process.env[envVar];
          Logger.debug(`从环境变量 ${envVar} 加载合约实现地址`, { contractName, address });
          break;
        }
      }
      
      // 验证地址是否存在且有效
      if (!address) {
        throw new ContractError(`找不到合约 ${contractName} 的实现地址`);
      }
      
      if (!Validation.isValidAddress(address)) {
        throw new ContractError(`合约 ${contractName} 的实现地址格式无效: ${address}`);
      }
      
      // 保存到缓存
      this._cachedAddresses[cacheKey] = address;
      
      return address;
    } catch (error) {
      if (error instanceof ContractError) {
        throw error;
      }
      throw new ContractError(`获取合约实现地址失败: ${error.message}`);
    }
  }

  /**
   * 获取所有合约地址和实现地址
   * @returns {Object} 包含合约地址和实现地址的对象
   */
  static getAllAddresses() {
    const contractNames = [
      'Facade', 'RealEstateFacade', 
      'System', 'RealEstateSystem', 
      'RoleManager', 
      'PropertyManager', 
      'TradingManager', 
      'RewardManager', 
      'PropertyToken'
    ];
    
    const result = {
      contracts: {},
      implementations: {}
    };
    
    // 获取合约地址
    for (const name of contractNames) {
      try {
        result.contracts[name] = this.getContractAddress(name);
      } catch (error) {
        Logger.debug(`获取合约 ${name} 地址失败: ${error.message}`);
        // 继续下一个，不抛出错误
      }
    }
    
    // 获取实现地址
    for (const name of contractNames) {
      try {
        result.implementations[name] = this.getImplementationAddress(name);
      } catch (error) {
        Logger.debug(`获取合约 ${name} 实现地址失败: ${error.message}`);
        // 继续下一个，不抛出错误
      }
    }
    
    return result;
  }
}

module.exports = ContractAddress; 