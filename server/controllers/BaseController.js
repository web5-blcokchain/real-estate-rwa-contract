/**
 * 基础控制器类
 * 提供通用功能，减少重复代码
 */
const { Logger, ContractUtils } = require('../../common');
const { ResponseUtils } = require('../utils');

class BaseController {
  /**
   * 处理合约方法调用并返回响应
   * @param {Object} res - 响应对象
   * @param {Function} asyncAction - 异步操作函数
   * @param {string} successLogMessage - 成功日志消息
   * @param {Object} logData - 日志数据
   * @param {string} errorLogMessage - 错误日志消息
   */
  async handleContractAction(res, asyncAction, successLogMessage, logData = {}, errorLogMessage) {
    try {
      // 执行异步操作
      const result = await asyncAction();
      
      // 记录成功日志
      Logger.info(successLogMessage, logData);
      
      // 发送成功响应
      ResponseUtils.sendSuccess(res, result);
    } catch (error) {
      // 记录错误日志
      Logger.error(errorLogMessage || '合约操作失败', error);
      
      // 发送错误响应
      ResponseUtils.sendContractError(res, error);
    }
  }
  
  /**
   * 验证请求参数是否存在
   * @param {Object} res - 响应对象
   * @param {Object} values - 参数值对象
   * @returns {boolean} 是否验证通过
   */
  validateRequired(res, values) {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null || value === '') {
        ResponseUtils.sendError(res, `缺少必要参数: ${key}`, 400);
        return false;
      }
    }
    return true;
  }
  
  /**
   * 等待交易确认并返回格式化结果
   * @param {Object} tx - 交易对象
   * @param {number} [confirmations=2] - 确认区块数
   * @returns {Object} 格式化的交易结果
   */
  async waitForTransaction(tx, confirmations = 2) {
    return await ContractUtils.waitForTransaction(tx, confirmations);
  }
}

module.exports = BaseController; 