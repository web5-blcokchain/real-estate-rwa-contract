const { ethers } = require('ethers');
const Logger = require('./logger');

/**
 * 通用工具类
 */
class Utils {
  /**
   * 等待交易确认
   * @param {Object} tx - 交易对象
   * @param {number} [confirmations=2] - 确认区块数
   * @returns {Object} 交易结果
   */
  static async waitForTransaction(tx, confirmations = 2) {
    try {
      Logger.info('等待交易确认', { hash: tx.hash });
      const receipt = await tx.wait(confirmations);
      Logger.info('交易已确认', { 
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      
      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      Logger.error('交易确认失败', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * 将字符串或数字转换为bigint（与parseEther相同但名称更直观）
   * @param {string|number} value - 原始值
   * @param {number} [decimals=18] - 小数位数
   * @returns {bigint} 转换后的值
   */
  static parseUnits(value, decimals = 18) {
    try {
      return ethers.parseUnits(value.toString(), decimals);
    } catch (error) {
      Logger.error('数值转换失败', { value, decimals, error: error.message });
      throw new Error(`数值转换失败: ${error.message}`);
    }
  }

  /**
   * 将bigint转换为字符串（与formatEther相同但名称更直观）
   * @param {bigint} value - 原始值
   * @param {number} [decimals=18] - 小数位数
   * @returns {string} 转换后的值
   */
  static formatUnits(value, decimals = 18) {
    try {
      return ethers.formatUnits(value, decimals);
    } catch (error) {
      Logger.error('数值转换失败', { value, decimals, error: error.message });
      throw new Error(`数值转换失败: ${error.message}`);
    }
  }
  
  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise} 等待承诺
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * 格式化日期时间
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 格式化的日期时间
   */
  static formatDateTime(date = new Date()) {
    return date.toISOString();
  }
}

module.exports = Utils; 