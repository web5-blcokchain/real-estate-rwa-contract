const path = require('path');
const fs = require('fs');
const { Validation } = require('../utils/validation');
const { ConfigError } = require('../utils/errors');

/**
 * 合约配置类
 */
class ContractConfig {
  /**
   * 加载合约配置
   * @param {Object} envConfig - 环境变量配置
   * @returns {Object} 合约配置
   */
  static load(envConfig) {
    try {
      // 验证合约配置
      this._validateContractConfig(envConfig);

      // 加载ABI文件
      const abi = this._loadABI(envConfig.CONTRACT_ABI_PATH);

      return {
        address: envConfig.CONTRACT_ADDRESS,
        abiPath: envConfig.CONTRACT_ABI_PATH,
        abi
      };
    } catch (error) {
      throw new ConfigError(`加载合约配置失败: ${error.message}`);
    }
  }

  /**
   * 验证合约配置
   * @private
   * @param {Object} envConfig - 环境变量配置
   */
  static _validateContractConfig(envConfig) {
    // 验证合约地址
    Validation.validate(
      Validation.isValidAddress(envConfig.CONTRACT_ADDRESS),
      '无效的合约地址格式'
    );

    // 验证ABI文件路径
    Validation.validate(
      typeof envConfig.CONTRACT_ABI_PATH === 'string' && envConfig.CONTRACT_ABI_PATH.length > 0,
      '无效的ABI文件路径'
    );

    // 验证ABI文件是否存在
    const abiPath = path.resolve(process.cwd(), envConfig.CONTRACT_ABI_PATH);
    Validation.validate(
      fs.existsSync(abiPath),
      'ABI文件不存在'
    );
  }

  /**
   * 加载ABI文件
   * @private
   * @param {string} abiPath - ABI文件路径
   * @returns {Array} ABI数组
   */
  static _loadABI(abiPath) {
    try {
      const absolutePath = path.resolve(process.cwd(), abiPath);
      const abiContent = fs.readFileSync(absolutePath, 'utf8');
      return JSON.parse(abiContent);
    } catch (error) {
      throw new ConfigError(`加载ABI文件失败: ${error.message}`);
    }
  }

  /**
   * 获取合约ABI
   * @param {string} contractName - 合约名称
   * @returns {Object} 合约ABI
   */
  static getContractABI(contractName) {
    try {
      const abiPath = path.join(process.cwd(), 'config', 'contracts.json');
      if (!fs.existsSync(abiPath)) {
        throw new ConfigError('合约ABI文件不存在');
      }

      const abis = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      if (!abis[contractName]) {
        throw new ConfigError(`未找到合约 ${contractName} 的ABI`);
      }

      return abis[contractName];
    } catch (error) {
      throw new ConfigError(`获取合约ABI失败: ${error.message}`);
    }
  }

  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称
   * @returns {string} 合约地址
   */
  static getContractAddress(contractName) {
    try {
      const configPath = path.join(process.cwd(), 'config', 'contracts.js');
      if (!fs.existsSync(configPath)) {
        throw new ConfigError('合约配置文件不存在');
      }

      const config = require(configPath);
      if (!config[contractName]) {
        throw new ConfigError(`未找到合约 ${contractName} 的地址`);
      }

      return config[contractName];
    } catch (error) {
      throw new ConfigError(`获取合约地址失败: ${error.message}`);
    }
  }

  /**
   * 获取合约实例配置
   * @param {string} contractName - 合约名称
   * @returns {Object} 合约配置
   */
  static getContractConfig(contractName) {
    return {
      address: this.getContractAddress(contractName),
      abi: this.getContractABI(contractName)
    };
  }
}

module.exports = ContractConfig; 