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
      
      // 获取所有属性ID
      const allPropertyIds = await blockchainService.callReadMethod('PropertyRegistry', 'getAllPropertyIds');
      const totalCount = allPropertyIds.length;
      
      // 确保分页范围有效
      if (startIndex >= totalCount) {
        return res.json(createPaginatedResponse([], page, limit, totalCount));
      }
      
      // 计算实际获取的数量
      const endIndex = Math.min(startIndex + limit, totalCount);
      const propertyIds = allPropertyIds.slice(startIndex, endIndex);
      
      // 获取每个属性的详细信息
      const properties = [];
      for (const propertyId of propertyIds) {
        try {
          const property = await blockchainService.callReadMethod('PropertyRegistry', 'getProperty', [propertyId]);
          
          // 将 BigInt 转换为普通数字
          const safeProperty = {
            propertyId: property.propertyId,
            country: property.country,
            metadataURI: property.metadataURI,
            status: Number(property.status),
            registrationTime: Number(property.registrationTime),
            exists: property.exists
          };
          
          // 尝试解析元数据
          let metadata = {};
          try {
            metadata = JSON.parse(safeProperty.metadataURI);
          } catch (e) {
            metadata = { raw: safeProperty.metadataURI };
          }
          
          properties.push({
            id: safeProperty.propertyId,
            country: safeProperty.country,
            status: safeProperty.status,
            registrationTime: new Date(safeProperty.registrationTime * 1000).toISOString(),
            name: metadata.name || '',
            location: metadata.location || '',
            description: metadata.description || ''
          });
        } catch (error) {
          logger.error(`获取属性详情失败: ${propertyId}`, error);
          // 继续处理其他属性
        }
      }
      
      res.json(createPaginatedResponse(properties, page, limit, totalCount));
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
      const id = req.params.id;
      
      if (!id) {
        throw new ApiError('无效的属性ID', 400, 'INVALID_PROPERTY_ID');
      }
      
      // 判断是否为数字ID
      const isNumericId = /^\d+$/.test(id);
      let property;
      
      if (isNumericId) {
        // 如果是数字ID，转换为整数并调用getPropertyById方法
        const propertyId = parseInt(id);
        property = await blockchainService.callReadMethod('PropertyRegistry', 'getPropertyById', [propertyId]);
      } else {
        // 如果是字符串ID，直接调用getProperty方法
        property = await blockchainService.callReadMethod('PropertyRegistry', 'getProperty', [id]);
      }
      
      if (!property || !property.exists) {
        throw new ApiError('属性不存在', 404, 'PROPERTY_NOT_FOUND');
      }
      
      // 将 BigInt 转换为字符串或数字
      const safeProperty = {
        propertyId: property.propertyId,
        country: property.country,
        metadataURI: property.metadataURI,
        status: Number(property.status),
        registrationTime: Number(property.registrationTime),
        exists: property.exists
      };
      
      // 构建响应数据
      const data = {
        id: safeProperty.propertyId,
        country: safeProperty.country,
        metadataURI: safeProperty.metadataURI,
        status: safeProperty.status,
        registrationTime: new Date(safeProperty.registrationTime * 1000).toISOString(),
        metadata: {}
      };
      
      // 尝试解析元数据
      try {
        data.metadata = JSON.parse(safeProperty.metadataURI);
      } catch (e) {
        // 如果解析失败，将原始metadataURI保留
        data.metadata = { raw: safeProperty.metadataURI };
      }
      
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
      const { propertyId, country, name, location, description, metadata } = req.body;
      
      if (!propertyId || !country) {
        throw new ApiError('缺少必要的属性信息', 400, 'MISSING_PROPERTY_INFO');
      }
      
      // 创建元数据URI（JSON字符串）
      const metadataObj = {
        name: name || '',
        location: location || '',
        description: description || '',
        ...metadata
      };
      
      const metadataURI = JSON.stringify(metadataObj);
      
      // 注册属性
      const result = await blockchainService.callWriteMethod(
        'PropertyRegistry',
        'registerProperty',
        [propertyId, country, metadataURI],
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