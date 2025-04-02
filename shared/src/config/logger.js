const path = require('path');
const fs = require('fs');
const { Validation } = require('../utils/validation');
const { ConfigError } = require('../utils/errors');

/**
 * 日志配置类
 */
class LoggerConfig {
  /**
   * 加载日志配置
   * @param {Object} envConfig - 环境变量配置
   * @returns {Object} 日志配置
   */
  static load(envConfig) {
    try {
      // 验证日志配置
      this._validateLoggerConfig(envConfig);

      // 创建日志目录
      this._createLogDir(envConfig.LOG_DIR);

      return {
        level: envConfig.LOG_LEVEL,
        dir: envConfig.LOG_DIR
      };
    } catch (error) {
      throw new ConfigError(`加载日志配置失败: ${error.message}`);
    }
  }

  /**
   * 验证日志配置
   * @private
   * @param {Object} envConfig - 环境变量配置
   */
  static _validateLoggerConfig(envConfig) {
    // 验证日志级别
    const validLevels = ['error', 'warn', 'info', 'debug'];
    Validation.validate(
      validLevels.includes(envConfig.LOG_LEVEL),
      '无效的日志级别'
    );

    // 验证日志目录
    Validation.validate(
      typeof envConfig.LOG_DIR === 'string' && envConfig.LOG_DIR.length > 0,
      '无效的日志目录'
    );
  }

  /**
   * 创建日志目录
   * @private
   * @param {string} logDir - 日志目录
   */
  static _createLogDir(logDir) {
    try {
      const absolutePath = path.resolve(process.cwd(), logDir);
      if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, { recursive: true });
      }
    } catch (error) {
      throw new ConfigError(`创建日志目录失败: ${error.message}`);
    }
  }
}

module.exports = LoggerConfig; 