const path = require('path');
const fs = require('fs');
const { Validation } = require('../utils/validation');
const { ConfigError } = require('../utils/errors');

/**
 * ABI配置类
 */
class ABIConfig {
  /**
   * 加载ABI配置
   * @param {Object} envConfig - 环境变量配置
   * @returns {Object} ABI配置
   */
  static load(envConfig) {
    try {
      // 验证ABI配置
      this._validateABIConfig(envConfig);

      // 加载ABI文件
      const abi = this._loadABI(envConfig.CONTRACT_ABI_PATH);

      return {
        path: envConfig.CONTRACT_ABI_PATH,
        abi
      };
    } catch (error) {
      throw new ConfigError(`加载ABI配置失败: ${error.message}`);
    }
  }

  /**
   * 验证ABI配置
   * @private
   * @param {Object} envConfig - 环境变量配置
   */
  static _validateABIConfig(envConfig) {
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
      const abi = JSON.parse(abiContent);

      // 验证ABI格式
      Validation.validate(
        Array.isArray(abi),
        '无效的ABI格式'
      );

      return abi;
    } catch (error) {
      throw new ConfigError(`加载ABI文件失败: ${error.message}`);
    }
  }

  /**
   * 获取合约方法ABI
   * @param {string} methodName - 方法名称
   * @param {Array} abi - ABI数组
   * @returns {Object} 方法ABI
   */
  static getMethodABI(methodName, abi) {
    const method = abi.find(item => 
      item.type === 'function' && 
      item.name === methodName
    );

    if (!method) {
      throw new ConfigError(`未找到方法: ${methodName}`);
    }

    return method;
  }

  /**
   * 获取合约事件ABI
   * @param {string} eventName - 事件名称
   * @param {Array} abi - ABI数组
   * @returns {Object} 事件ABI
   */
  static getEventABI(eventName, abi) {
    const event = abi.find(item => 
      item.type === 'event' && 
      item.name === eventName
    );

    if (!event) {
      throw new ConfigError(`未找到事件: ${eventName}`);
    }

    return event;
  }
}

module.exports = ABIConfig; 