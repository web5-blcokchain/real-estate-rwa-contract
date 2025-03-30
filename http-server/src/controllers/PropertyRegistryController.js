/**
 * PropertyRegistry控制器
 * 处理PropertyRegistry合约的API请求
 */

const blockchainService = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { createSuccessResponse, createTransactionResponse, createPaginatedResponse } = require('../utils/responseHelper');

// PropertyRegistry控制器
const PropertyRegistryController = {
  /**
   * 获取属性总数
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getPropertyCount(req, res, next) {
    try {
      const count = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyCount');
      
      res.json(createSuccessResponse({ count: count.toString() }, '获取属性总数成功'));
    } catch (error) {
      logger.error('获取属性总数失败', error);
      next(error);
    }
  },

  /**
   * 获取属性列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getProperties(req, res, next) {
    try {
      // 获取分页参数
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit;
      
      // 获取属性总数
      const totalCount = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyCount');
      
      // 确保分页范围有效
      if (startIndex >= totalCount) {
        return res.json(createPaginatedResponse([], page, limit, totalCount.toNumber()));
      }
      
      // 计算实际获取的数量
      const actualLimit = Math.min(limit, totalCount - startIndex);
      
      // 按照分页获取属性列表
      const properties = [];
      for (let i = 0; i < actualLimit; i++) {
        const propertyId = startIndex + i;
        const property = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyById', [propertyId]);
        properties.push({
          id: propertyId,
          name: property.name,
          location: property.location,
          description: property.description,
          ownerAddress: property.owner,
          approvalStatus: property.approved ? 'approved' : 'pending',
          tokenAddress: property.tokenAddress
        });
      }
      
      res.json(createPaginatedResponse(properties, page, limit, totalCount.toNumber()));
    } catch (error) {
      logger.error('获取属性列表失败', error);
      next(error);
    }
  },

  /**
   * 获取属性详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getPropertyById(req, res, next) {
    try {
      const propertyId = parseInt(req.params.id);
      
      if (isNaN(propertyId) || propertyId < 0) {
        throw new ApiError('无效的属性ID', 400, 'INVALID_PROPERTY_ID');
      }
      
      // 获取属性信息
      const property = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyById', [propertyId]);
      
      if (!property || !property.owner) {
        throw new ApiError('属性不存在', 404, 'PROPERTY_NOT_FOUND');
      }
      
      // 构建响应数据
      const data = {
        id: propertyId,
        name: property.name,
        location: property.location,
        description: property.description,
        ownerAddress: property.owner,
        approvalStatus: property.approved ? 'approved' : 'pending',
        tokenAddress: property.tokenAddress,
        metadata: property.metadata || {}
      };
      
      res.json(createSuccessResponse(data, '获取属性详情成功'));
    } catch (error) {
      logger.error('获取属性详情失败', error);
      next(error);
    }
  },

  /**
   * 注册新属性
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async registerProperty(req, res, next) {
    try {
      // 验证请求体
      const { name, location, description, metadata } = req.body;
      
      if (!name || !location) {
        throw new ApiError('缺少必要的属性信息', 400, 'MISSING_PROPERTY_INFO');
      }
      
      // 注册属性
      const result = await blockchainService.callWriteMethod(
        'PropertyRegistry',
        'registerProperty',
        [name, location, description || '', JSON.stringify(metadata || {})],
        'propertyAdmin'
      );
      
      res.json(createTransactionResponse(result.txHash, '属性注册请求已提交'));
    } catch (error) {
      logger.error('注册属性失败', error);
      next(error);
    }
  },

  /**
   * 审核属性
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async approveProperty(req, res, next) {
    try {
      const propertyId = parseInt(req.params.id);
      
      if (isNaN(propertyId) || propertyId < 0) {
        throw new ApiError('无效的属性ID', 400, 'INVALID_PROPERTY_ID');
      }
      
      // 获取属性当前状态
      const property = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyById', [propertyId]);
      
      if (!property || !property.owner) {
        throw new ApiError('属性不存在', 404, 'PROPERTY_NOT_FOUND');
      }
      
      if (property.approved) {
        throw new ApiError('属性已经被批准', 400, 'PROPERTY_ALREADY_APPROVED');
      }
      
      // 批准属性
      const result = await blockchainService.callWriteMethod(
        'PropertyRegistry',
        'approveProperty',
        [propertyId],
        'propertyAdmin'
      );
      
      res.json(createTransactionResponse(result.txHash, '属性批准请求已提交'));
    } catch (error) {
      logger.error('批准属性失败', error);
      next(error);
    }
  },

  /**
   * 拒绝属性
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async rejectProperty(req, res, next) {
    try {
      const propertyId = parseInt(req.params.id);
      
      if (isNaN(propertyId) || propertyId < 0) {
        throw new ApiError('无效的属性ID', 400, 'INVALID_PROPERTY_ID');
      }
      
      // 获取属性当前状态
      const property = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyById', [propertyId]);
      
      if (!property || !property.owner) {
        throw new ApiError('属性不存在', 404, 'PROPERTY_NOT_FOUND');
      }
      
      // 拒绝属性
      const result = await blockchainService.callWriteMethod(
        'PropertyRegistry',
        'rejectProperty',
        [propertyId],
        'propertyAdmin'
      );
      
      res.json(createTransactionResponse(result.txHash, '属性拒绝请求已提交'));
    } catch (error) {
      logger.error('拒绝属性失败', error);
      next(error);
    }
  }
};

module.exports = PropertyRegistryController; 