/**
 * 系统控制器
 * 处理系统状态和管理相关的API请求
 */
const { ethers } = require('ethers');
const blockchainService = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { loadContractAddresses } = require('../utils/contractLoader');
const { createSuccessResponse, createErrorResponse, createTransactionResponse } = require('../utils/responseHelper');

// 系统控制器
const systemController = {
  /**
   * 获取API服务状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getStatus(req, res, next) {
    try {
      // 检查区块链连接
      const blockchainStatus = await blockchainService.checkConnection();
      
      // 构建响应数据
      const data = {
        service: 'japan-rwa-api',
        status: 'operational',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        blockchain: blockchainStatus
      };
      
      res.json(createSuccessResponse(data, 'API服务运行正常'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * 获取系统信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getSystemInfo(req, res, next) {
    try {
      // 获取RealEstateSystem合约状态
      const paused = await blockchainService.callReadMethod('RealEstateSystem', 'paused');
      
      // 获取系统管理员地址
      const signer = blockchainService.getSigner('systemAdmin');
      const signerAddress = await signer.getAddress();
      
      // 获取角色信息
      const hasAdminRole = await blockchainService.callReadMethod(
        'RoleManager', 
        'hasRole', 
        [ethers.keccak256(ethers.toUtf8Bytes('SUPER_ADMIN')), signerAddress]
      );
      
      // 获取合约地址
      const contracts = loadContractAddresses();
      
      // 构建系统信息
      const data = {
        paused,
        signer: signerAddress,
        hasAdminRole,
        systemContract: contracts.RealEstateSystem,
        timestamp: new Date().toISOString()
      };
      
      res.json(createSuccessResponse(data, '获取系统信息成功'));
    } catch (error) {
      logger.error('获取系统信息失败', error);
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
   * 获取合约地址列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getContractAddresses(req, res, next) {
    try {
      const addresses = loadContractAddresses();
      res.json(createSuccessResponse(addresses, '获取合约地址成功'));
    } catch (error) {
      logger.error('获取合约地址失败', error);
      next(error);
    }
  },

  /**
   * 获取交易状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getTransactionStatus(req, res, next) {
    try {
      const { txHash } = req.params;
      
      // 验证交易哈希格式
      if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
        throw new ApiError('无效的交易哈希', 400, 'INVALID_TX_HASH');
      }
      
      // 获取交易状态
      const status = await blockchainService.getTransactionStatus(txHash);
      
      res.json(createSuccessResponse(status, '获取交易状态成功'));
    } catch (error) {
      logger.error('获取交易状态失败', error);
      next(error);
    }
  }
};

module.exports = systemController; 