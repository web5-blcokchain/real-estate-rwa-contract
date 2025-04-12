/**
 * 基础控制器
 * 提供所有控制器共用的功能
 */
const { ethers } = require('ethers');
const config = require('../config');
const { Logger } = require('../../common');

class BaseController {
  /**
   * 获取合约实例
   * @param {string} role - 调用合约的角色，如manager, admin等
   * @returns {ethers.Contract} - 合约实例
   */
  getContract(role = 'user') {
    try {
      // 注意：在实际应用中，应该从配置或环境变量中获取这些值
      const provider = new ethers.providers.JsonRpcProvider(config.blockchain.rpcUrl);
      
      // 根据角色获取相应的私钥和ABI
      const privateKey = config.blockchain.privateKeys[role];
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // 获取合约ABI和地址
      const abi = require('../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json').abi;
      const contractAddress = config.blockchain.contracts.RealEstateFacade;
      
      // 创建合约实例
      return new ethers.Contract(contractAddress, abi, wallet);
    } catch (error) {
      Logger.error(`合约获取失败: ${error.message}`);
      throw new Error(`合约获取失败: ${error.message}`);
    }
  }

  /**
   * 验证必需的参数是否存在
   * @param {object} res - Express 响应对象
   * @param {object} params - 需要验证的参数对象
   * @returns {boolean} - 参数是否都存在
   */
  validateRequired(res, params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        this.sendError(res, `缺少必需参数: ${key}`, 400);
        return false;
      }
    }
    return true;
  }

  /**
   * 发送成功响应
   * @param {object} res - Express 响应对象
   * @param {object} data - 响应数据
   * @param {string} message - 成功消息
   * @returns {object} - 响应结果
   */
  sendSuccess(res, data = {}, message = '操作成功') {
    return res.status(200).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 发送错误响应
   * @param {object} res - Express 响应对象
   * @param {string} message - 错误消息
   * @param {number} statusCode - HTTP 状态码
   * @param {object} data - 额外的错误数据
   * @returns {object} - 响应结果
   */
  sendError(res, message = '操作失败', statusCode = 400, data = {}) {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 等待交易确认
   * @param {object} tx - 交易对象
   * @returns {object} - 交易收据
   */
  async waitForTransaction(tx) {
    Logger.info(`提交交易: ${tx.hash}`);
    return await tx.wait();
  }

  /**
   * 处理合约操作
   * @param {object} res - Express 响应对象
   * @param {Function} action - 合约操作函数
   * @param {string} successMessage - 成功消息
   * @param {object} logParams - 日志参数
   * @param {string} errorMessage - 错误消息
   * @returns {object} - 响应结果
   */
  async handleContractAction(res, action, successMessage, logParams = {}, errorMessage = '操作失败') {
    try {
      // 执行合约操作
      const result = await action();
      
      // 记录成功日志
      Logger.info(`${successMessage}`, logParams);
      
      // 如果操作内部已经发送了响应，则直接返回
      if (res.headersSent) {
        return;
      }
      
      // 发送成功响应
      return this.sendSuccess(res, result, successMessage);
    } catch (error) {
      // 记录错误日志
      Logger.error(`${errorMessage}: ${error.message}`, {
        ...logParams,
        error: error.message,
        stack: error.stack
      });
      
      // 确定错误消息
      let message = errorMessage;
      if (error.reason) {
        message = `${errorMessage}: ${error.reason}`;
      } else if (error.message) {
        message = `${errorMessage}: ${error.message}`;
      }
      
      // 发送错误响应
      return this.sendError(res, message, 400, { error: error.message });
    }
  }
}

module.exports = BaseController; 