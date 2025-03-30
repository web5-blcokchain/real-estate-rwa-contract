/**
 * RealEstateSystem控制器
 * 处理RealEstateSystem合约的API请求
 */

const { ethers } = require('ethers');
const blockchainService = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { createSuccessResponse, createTransactionResponse } = require('../utils/responseHelper');

// RealEstateSystem控制器
const RealEstateSystemController = {
  /**
   * 获取系统状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getSystemStatus(req, res, next) {
    try {
      // 获取RealEstateSystem合约状态
      const paused = await blockchainService.callReadMethod('RealEstateSystem', 'paused');
      
      // 获取系统管理员地址
      const signer = blockchainService.getSigner('systemAdmin');
      const signerAddress = await signer.getAddress();
      
      // 构建系统信息
      const data = {
        paused,
        signer: signerAddress,
        timestamp: new Date().toISOString()
      };
      
      res.json(createSuccessResponse(data, '获取系统状态成功'));
    } catch (error) {
      logger.error('获取系统状态失败', error);
      next(error);
    }
  },

  /**
   * 暂停系统
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async pauseSystem(req, res, next) {
    try {
      // 检查系统当前状态
      const paused = await blockchainService.callReadMethod('RealEstateSystem', 'paused');
      
      if (paused) {
        throw new ApiError('系统已处于暂停状态', 400, 'SYSTEM_ALREADY_PAUSED');
      }
      
      // 执行暂停操作
      const result = await blockchainService.callWriteMethod(
        'RealEstateSystem', 
        'pause', 
        [], 
        'systemAdmin'
      );
      
      res.json(createTransactionResponse(result.txHash, '系统暂停请求已提交'));
    } catch (error) {
      logger.error('暂停系统失败', error);
      next(error);
    }
  },

  /**
   * 恢复系统
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async unpauseSystem(req, res, next) {
    try {
      // 检查系统当前状态
      const paused = await blockchainService.callReadMethod('RealEstateSystem', 'paused');
      
      if (!paused) {
        throw new ApiError('系统已处于运行状态', 400, 'SYSTEM_ALREADY_RUNNING');
      }
      
      // 执行恢复操作
      const result = await blockchainService.callWriteMethod(
        'RealEstateSystem', 
        'unpause', 
        [], 
        'systemAdmin'
      );
      
      res.json(createTransactionResponse(result.txHash, '系统恢复请求已提交'));
    } catch (error) {
      logger.error('恢复系统失败', error);
      next(error);
    }
  },

  /**
   * 获取所有配置的合约地址
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getLinkedContracts(req, res, next) {
    try {
      // 这个方法应该查询RealEstateSystem合约中存储的所有链接合约的地址
      // 假设RealEstateSystem有一个方法可以获取所有相关合约的地址
      const roleManagerAddress = await blockchainService.callReadMethod('RealEstateSystem', 'roleManager');
      const propertyRegistryAddress = await blockchainService.callReadMethod('RealEstateSystem', 'propertyRegistry');
      const tokenFactoryAddress = await blockchainService.callReadMethod('RealEstateSystem', 'tokenFactory');
      const feeManagerAddress = await blockchainService.callReadMethod('RealEstateSystem', 'feeManager');
      const rentDistributorAddress = await blockchainService.callReadMethod('RealEstateSystem', 'rentDistributor');
      const redemptionManagerAddress = await blockchainService.callReadMethod('RealEstateSystem', 'redemptionManager');
      const marketplaceAddress = await blockchainService.callReadMethod('RealEstateSystem', 'marketplace');
      
      const data = {
        roleManager: roleManagerAddress,
        propertyRegistry: propertyRegistryAddress,
        tokenFactory: tokenFactoryAddress,
        feeManager: feeManagerAddress,
        rentDistributor: rentDistributorAddress,
        redemptionManager: redemptionManagerAddress,
        marketplace: marketplaceAddress
      };
      
      res.json(createSuccessResponse(data, '获取系统配置的合约地址成功'));
    } catch (error) {
      logger.error('获取系统配置的合约地址失败', error);
      next(error);
    }
  }
};

module.exports = RealEstateSystemController; 