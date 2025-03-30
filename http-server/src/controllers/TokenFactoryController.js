/**
 * TokenFactory控制器
 * 处理TokenFactory合约的API请求
 */

const { ethers } = require('ethers');
const blockchainService = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { createSuccessResponse, createTransactionResponse, createPaginatedResponse } = require('../utils/responseHelper');

// TokenFactory控制器
const TokenFactoryController = {
  /**
   * 获取代币总数
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getTokenCount(req, res, next) {
    try {
      const count = await blockchainService.callReadMethod('TokenFactory', 'getTokenCount');
      
      res.json(createSuccessResponse({ count: count.toString() }, '获取代币总数成功'));
    } catch (error) {
      logger.error('获取代币总数失败', error);
      next(error);
    }
  },

  /**
   * 获取代币列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getTokens(req, res, next) {
    try {
      // 获取分页参数
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit;
      
      // 获取代币总数
      const totalCount = await blockchainService.callReadMethod('TokenFactory', 'getTokenCount');
      
      // 确保分页范围有效
      if (startIndex >= totalCount) {
        return res.json(createPaginatedResponse([], page, limit, totalCount.toNumber()));
      }
      
      // 计算实际获取的数量
      const actualLimit = Math.min(limit, totalCount - startIndex);
      
      // 按照分页获取代币列表
      const tokens = [];
      for (let i = 0; i < actualLimit; i++) {
        const tokenIndex = startIndex + i;
        const tokenAddress = await blockchainService.callReadMethod('TokenFactory', 'getTokenAtIndex', [tokenIndex]);
        
        // 获取代币详细信息
        const token = await this.getTokenInfo(tokenAddress);
        tokens.push({
          address: tokenAddress,
          ...token
        });
      }
      
      res.json(createPaginatedResponse(tokens, page, limit, totalCount.toNumber()));
    } catch (error) {
      logger.error('获取代币列表失败', error);
      next(error);
    }
  },

  /**
   * 获取代币详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getTokenByAddress(req, res, next) {
    try {
      const address = req.params.address;
      
      // 验证地址格式
      if (!address || !ethers.isAddress(address)) {
        throw new ApiError('无效的代币地址', 400, 'INVALID_TOKEN_ADDRESS');
      }
      
      // 验证代币是否存在
      const isTokenFromFactory = await blockchainService.callReadMethod('TokenFactory', 'isTokenFromFactory', [address]);
      
      if (!isTokenFromFactory) {
        throw new ApiError('代币不是由TokenFactory创建', 404, 'TOKEN_NOT_FOUND');
      }
      
      // 获取代币详情
      const token = await this.getTokenInfo(address);
      
      res.json(createSuccessResponse({
        address,
        ...token
      }, '获取代币详情成功'));
    } catch (error) {
      logger.error('获取代币详情失败', error);
      next(error);
    }
  },

  /**
   * 创建新代币
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async createToken(req, res, next) {
    try {
      // 验证请求体
      const { propertyId, name, symbol, totalSupply, metadata } = req.body;
      
      if (isNaN(propertyId) || propertyId < 0) {
        throw new ApiError('无效的属性ID', 400, 'INVALID_PROPERTY_ID');
      }
      
      if (!name || !symbol || isNaN(totalSupply) || totalSupply <= 0) {
        throw new ApiError('缺少必要的代币信息', 400, 'MISSING_TOKEN_INFO');
      }
      
      // 验证属性是否存在且已获批准
      const property = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyById', [propertyId]);
      
      if (!property || !property.owner) {
        throw new ApiError('属性不存在', 404, 'PROPERTY_NOT_FOUND');
      }
      
      if (!property.approved) {
        throw new ApiError('属性尚未获得批准', 400, 'PROPERTY_NOT_APPROVED');
      }
      
      if (property.tokenAddress && property.tokenAddress !== ethers.ZeroAddress) {
        throw new ApiError('属性已经有关联的代币', 400, 'PROPERTY_HAS_TOKEN');
      }
      
      // 创建代币
      const result = await blockchainService.callWriteMethod(
        'TokenFactory',
        'createToken',
        [
          propertyId,
          name,
          symbol,
          ethers.parseEther(totalSupply.toString()),
          JSON.stringify(metadata || {})
        ],
        'tokenAdmin'
      );
      
      res.json(createTransactionResponse(result.txHash, '代币创建请求已提交'));
    } catch (error) {
      logger.error('创建代币失败', error);
      next(error);
    }
  },

  /**
   * 获取代币实现合约地址
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getTokenImplementation(req, res, next) {
    try {
      const implementationAddress = await blockchainService.callReadMethod('TokenFactory', 'tokenImplementation');
      
      res.json(createSuccessResponse({ address: implementationAddress }, '获取代币实现合约地址成功'));
    } catch (error) {
      logger.error('获取代币实现合约地址失败', error);
      next(error);
    }
  },

  /**
   * 辅助方法：获取代币信息
   * @param {string} tokenAddress - 代币地址
   * @returns {Promise<Object>} 代币信息
   */
  async getTokenInfo(tokenAddress) {
    try {
      // 创建这个代币的合约实例
      const tokenContract = blockchainService.getContract(tokenAddress);
      
      // 获取代币基本信息
      const [name, symbol, totalSupply, decimals, propertyId] = await Promise.all([
        blockchainService.callReadMethod(tokenAddress, 'name'),
        blockchainService.callReadMethod(tokenAddress, 'symbol'),
        blockchainService.callReadMethod(tokenAddress, 'totalSupply'),
        blockchainService.callReadMethod(tokenAddress, 'decimals'),
        blockchainService.callReadMethod(tokenAddress, 'propertyId')
      ]);
      
      // 获取属性信息
      const property = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyById', [propertyId]);
      
      return {
        name,
        symbol,
        totalSupply: ethers.formatEther(totalSupply),
        decimals: decimals.toString(),
        propertyId: propertyId.toString(),
        propertyName: property.name,
        propertyLocation: property.location,
        owner: property.owner
      };
    } catch (error) {
      logger.error(`获取代币信息失败: ${tokenAddress}`, error);
      throw error;
    }
  }
};

module.exports = TokenFactoryController; 