/**
 * 地址工具类
 * 提供以太坊地址相关的工具方法
 */
const { ethers } = require('ethers');
const Logger = require('../logger');

/**
 * 地址工具类
 */
class AddressUtils {
  /**
   * 检查地址是否有效
   * @param {string} address - 以太坊地址
   * @returns {boolean} 是否有效
   */
  static isValid(address) {
    try {
      return ethers.isAddress(address);
    } catch (error) {
      Logger.error('地址验证失败', { address, error: error.message });
      return false;
    }
  }

  /**
   * 获取地址的校验和格式
   * @param {string} address - 以太坊地址
   * @returns {string} 校验和格式的地址
   * @throws {Error} 当地址无效时抛出错误
   */
  static toChecksum(address) {
    try {
      return ethers.getAddress(address);
    } catch (error) {
      Logger.error('地址格式化失败', { address, error: error.message });
      throw new Error(`地址格式化失败: ${error.message}`);
    }
  }

  /**
   * 比较两个地址是否相等（不区分大小写）
   * @param {string} address1 - 第一个地址
   * @param {string} address2 - 第二个地址
   * @returns {boolean} 是否相等
   */
  static equals(address1, address2) {
    try {
      return ethers.getAddress(address1) === ethers.getAddress(address2);
    } catch (error) {
      Logger.error('地址比较失败', { address1, address2, error: error.message });
      return false;
    }
  }

  /**
   * 将地址转为小写形式（注意：只用于内部比较，非EIP-55校验和形式）
   * @param {string} address - 以太坊地址
   * @returns {string} 小写形式的地址
   */
  static toLowerCase(address) {
    try {
      if (!this.isValid(address)) {
        throw new Error('无效的以太坊地址');
      }
      return address.toLowerCase();
    } catch (error) {
      Logger.error('地址转换失败', { address, error: error.message });
      throw new Error(`地址转换失败: ${error.message}`);
    }
  }
}

module.exports = AddressUtils; 