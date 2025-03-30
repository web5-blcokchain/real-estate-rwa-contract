/**
 * ContractInfo控制器
 * 处理合约信息查询的API请求
 */

const blockchainService = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { loadContractAddresses } = require('../utils/contractLoader');
const { createSuccessResponse } = require('../utils/responseHelper');

// BigInt序列化处理
function stringifyBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  ));
}

// ContractInfo控制器
const ContractInfoController = {
  /**
   * 获取所有部署的合约地址
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getAllContractAddresses(req, res, next) {
    try {
      const addresses = loadContractAddresses();
      res.json(createSuccessResponse(addresses, '获取合约地址列表成功'));
    } catch (error) {
      logger.error('获取合约地址列表失败', error);
      next(error);
    }
  },

  /**
   * 获取区块链连接状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getBlockchainStatus(req, res, next) {
    try {
      const status = await blockchainService.checkConnection();
      // 处理可能的BigInt值
      const safeStatus = stringifyBigInt(status);
      res.json(createSuccessResponse(safeStatus, '获取区块链连接状态成功'));
    } catch (error) {
      logger.error('获取区块链连接状态失败', error);
      next(error);
    }
  },

  /**
   * 获取API服务状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getServiceStatus(req, res, next) {
    try {
      // 检查区块链连接
      const blockchainStatus = await blockchainService.checkConnection();
      
      // 处理可能的BigInt值
      const safeBlockchainStatus = stringifyBigInt(blockchainStatus);
      
      // 构建响应数据
      const data = {
        service: 'japan-rwa-api',
        status: 'operational',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        blockchain: safeBlockchainStatus
      };
      
      res.json(createSuccessResponse(data, 'API服务运行正常'));
    } catch (error) {
      logger.error('获取API服务状态失败', error);
      next(error);
    }
  },

  /**
   * 获取特定合约地址
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getContractAddress(req, res, next) {
    try {
      const { name } = req.params;
      
      // 获取所有合约地址
      const addresses = loadContractAddresses();
      
      // 检查合约是否存在
      if (!addresses[name]) {
        throw new ApiError(`合约 ${name} 不存在`, 404, 'CONTRACT_NOT_FOUND');
      }
      
      res.json(createSuccessResponse({
        name,
        address: addresses[name]
      }, `获取合约 ${name} 地址成功`));
    } catch (error) {
      logger.error('获取合约地址失败', error);
      next(error);
    }
  },

  /**
   * 获取合约信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getContractInfo(req, res, next) {
    try {
      const { name } = req.params;
      
      // 获取所有合约地址
      const addresses = loadContractAddresses();
      
      // 检查合约是否存在
      if (!addresses[name]) {
        throw new ApiError(`合约 ${name} 不存在`, 404, 'CONTRACT_NOT_FOUND');
      }
      
      // 获取合约代码哈希
      const provider = blockchainService.getProvider();
      const codeHash = await provider.getCode(addresses[name]);
      
      // 构建响应数据
      const data = {
        name,
        address: addresses[name],
        codeHash: codeHash.length > 66 ? `${codeHash.substring(0, 66)}...` : codeHash,
        hasCode: codeHash !== '0x'
      };
      
      res.json(createSuccessResponse(data, `获取合约 ${name} 信息成功`));
    } catch (error) {
      logger.error('获取合约信息失败', error);
      next(error);
    }
  },

  /**
   * 检查合约是否已部署
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async isContractDeployed(req, res, next) {
    try {
      const { name } = req.params;
      
      // 获取所有合约地址
      const addresses = loadContractAddresses();
      
      // 检查合约是否在部署状态文件中
      if (!addresses[name]) {
        return res.json(createSuccessResponse({
          name,
          isDeployed: false,
          reason: '合约未在部署状态文件中找到'
        }, `检查合约 ${name} 部署状态成功`));
      }
      
      // 获取合约代码哈希
      const provider = blockchainService.getProvider();
      const codeHash = await provider.getCode(addresses[name]);
      
      // 判断合约是否真正部署
      const isDeployed = codeHash !== '0x';
      
      res.json(createSuccessResponse({
        name,
        address: addresses[name],
        isDeployed,
        reason: isDeployed ? '合约已部署' : '地址上没有合约代码'
      }, `检查合约 ${name} 部署状态成功`));
    } catch (error) {
      logger.error('检查合约部署状态失败', error);
      next(error);
    }
  }
};

module.exports = ContractInfoController; 