const { Validation } = require('../utils/validation');
const { ConfigError } = require('../utils/errors');

/**
 * 钱包配置类
 */
class WalletConfig {
  /**
   * 加载钱包配置
   * @param {Object} envConfig - 环境变量配置
   * @returns {Object} 钱包配置
   */
  static load(envConfig) {
    try {
      // 验证钱包配置
      this._validateWalletConfig(envConfig);

      return {
        admin: {
          privateKey: envConfig.ADMIN_PRIVATE_KEY
        },
        manager: {
          privateKey: envConfig.MANAGER_PRIVATE_KEY
        },
        propertyManager: {
          privateKey: envConfig.PROPERTY_MANAGER_PRIVATE_KEY
        }
      };
    } catch (error) {
      throw new ConfigError(`加载钱包配置失败: ${error.message}`);
    }
  }

  /**
   * 验证钱包配置
   * @private
   * @param {Object} envConfig - 环境变量配置
   */
  static _validateWalletConfig(envConfig) {
    // 验证管理员私钥
    Validation.validate(
      Validation.isValidPrivateKey(envConfig.ADMIN_PRIVATE_KEY),
      '无效的管理员私钥格式'
    );

    // 验证管理者私钥
    Validation.validate(
      Validation.isValidPrivateKey(envConfig.MANAGER_PRIVATE_KEY),
      '无效的管理者私钥格式'
    );

    // 验证物业管理者私钥
    Validation.validate(
      Validation.isValidPrivateKey(envConfig.PROPERTY_MANAGER_PRIVATE_KEY),
      '无效的物业管理者私钥格式'
    );
  }
}

module.exports = WalletConfig; 