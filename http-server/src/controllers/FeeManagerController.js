/**
 * FeeManager控制器
 * 处理FeeManager合约的API请求
 */

const { ethers } = require('ethers');
const blockchainService = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { createSuccessResponse, createTransactionResponse } = require('../utils/responseHelper');

// 费用类型
const FEE_TYPES = {
  CREATION: 0,    // 代币创建费用
  TRANSFER: 1,    // 代币转移费用
  REDEMPTION: 2,  // 代币赎回费用
  LISTING: 3,     // 挂牌销售费用
  PURCHASE: 4     // 购买费用
};

// FeeManager控制器
const FeeManagerController = {
  /**
   * 获取所有费用类型
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getFeeTypes(req, res, next) {
    try {
      res.json(createSuccessResponse(
        Object.entries(FEE_TYPES).map(([name, id]) => ({ id, name })),
        '获取费用类型成功'
      ));
    } catch (error) {
      logger.error('获取费用类型失败', error);
      next(error);
    }
  },

  /**
   * 获取费用百分比
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getFeePercentage(req, res, next) {
    try {
      const { type } = req.params;
      
      // 验证费用类型
      if (isNaN(type) || !Object.values(FEE_TYPES).includes(parseInt(type))) {
        throw new ApiError('无效的费用类型', 400, 'INVALID_FEE_TYPE');
      }
      
      // 获取费用百分比
      const feePercentage = await blockchainService.callReadMethod(
        'FeeManager',
        'getFeePercentage',
        [parseInt(type)]
      );
      
      // 费用类型名称
      const feeName = Object.keys(FEE_TYPES).find(key => FEE_TYPES[key] === parseInt(type));
      
      res.json(createSuccessResponse({
        type: parseInt(type),
        name: feeName,
        percentage: feePercentage.toString(),
        formattedPercentage: `${parseFloat(feePercentage) / 100}%`
      }, '获取费用百分比成功'));
    } catch (error) {
      logger.error('获取费用百分比失败', error);
      next(error);
    }
  },

  /**
   * 获取所有费用百分比
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getAllFeePercentages(req, res, next) {
    try {
      // 获取所有费用类型的百分比
      const feePercentages = [];
      for (const [name, type] of Object.entries(FEE_TYPES)) {
        const percentage = await blockchainService.callReadMethod(
          'FeeManager',
          'getFeePercentage',
          [type]
        );
        
        feePercentages.push({
          type,
          name,
          percentage: percentage.toString(),
          formattedPercentage: `${parseFloat(percentage) / 100}%`
        });
      }
      
      res.json(createSuccessResponse(feePercentages, '获取所有费用百分比成功'));
    } catch (error) {
      logger.error('获取所有费用百分比失败', error);
      next(error);
    }
  },

  /**
   * 获取费用接收者地址
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getFeeReceiver(req, res, next) {
    try {
      // 获取费用接收者地址
      const feeReceiver = await blockchainService.callReadMethod(
        'FeeManager',
        'feeReceiver'
      );
      
      res.json(createSuccessResponse({ feeReceiver }, '获取费用接收者地址成功'));
    } catch (error) {
      logger.error('获取费用接收者地址失败', error);
      next(error);
    }
  },

  /**
   * 设置费用百分比
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async setFeePercentage(req, res, next) {
    try {
      const { type, percentage } = req.body;
      
      // 验证参数
      if (isNaN(type) || !Object.values(FEE_TYPES).includes(parseInt(type))) {
        throw new ApiError('无效的费用类型', 400, 'INVALID_FEE_TYPE');
      }
      
      if (isNaN(percentage) || percentage < 0 || percentage > 10000) { // 0-100%，以百分之一为单位
        throw new ApiError('无效的费用百分比（应为0-10000）', 400, 'INVALID_FEE_PERCENTAGE');
      }
      
      // 设置费用百分比
      const result = await blockchainService.callWriteMethod(
        'FeeManager',
        'setFeePercentage',
        [parseInt(type), parseInt(percentage)],
        'feeManager'
      );
      
      res.json(createTransactionResponse(result.txHash, '设置费用百分比请求已提交'));
    } catch (error) {
      logger.error('设置费用百分比失败', error);
      next(error);
    }
  },

  /**
   * 设置费用接收者地址
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async setFeeReceiver(req, res, next) {
    try {
      const { address } = req.body;
      
      // 验证地址
      if (!address || !ethers.isAddress(address)) {
        throw new ApiError('无效的地址', 400, 'INVALID_ADDRESS');
      }
      
      // 设置费用接收者地址
      const result = await blockchainService.callWriteMethod(
        'FeeManager',
        'setFeeReceiver',
        [address],
        'feeManager'
      );
      
      res.json(createTransactionResponse(result.txHash, '设置费用接收者地址请求已提交'));
    } catch (error) {
      logger.error('设置费用接收者地址失败', error);
      next(error);
    }
  },

  /**
   * 计算费用金额
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async calculateFee(req, res, next) {
    try {
      const { type, amount } = req.query;
      
      // 验证参数
      if (isNaN(type) || !Object.values(FEE_TYPES).includes(parseInt(type))) {
        throw new ApiError('无效的费用类型', 400, 'INVALID_FEE_TYPE');
      }
      
      if (isNaN(amount) || amount <= 0) {
        throw new ApiError('无效的金额', 400, 'INVALID_AMOUNT');
      }
      
      // 获取费用百分比
      const feePercentage = await blockchainService.callReadMethod(
        'FeeManager',
        'getFeePercentage',
        [parseInt(type)]
      );
      
      // 计算费用
      const feeAmount = (parseFloat(amount) * parseFloat(feePercentage)) / 10000;
      
      res.json(createSuccessResponse({
        type: parseInt(type),
        typeName: Object.keys(FEE_TYPES).find(key => FEE_TYPES[key] === parseInt(type)),
        amount: parseFloat(amount),
        feePercentage: feePercentage.toString(),
        formattedPercentage: `${parseFloat(feePercentage) / 100}%`,
        feeAmount
      }, '计算费用成功'));
    } catch (error) {
      logger.error('计算费用失败', error);
      next(error);
    }
  }
};

module.exports = FeeManagerController; 