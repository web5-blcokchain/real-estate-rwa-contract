const PropertyRegistryService = require('../services/propertyRegistryService');
const TokenFactoryService = require('../services/tokenFactoryService');
const { ApiError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { operationRoles } = require('../config');

/**
 * 房产控制器
 * 处理房产相关的HTTP请求
 */
class PropertyController {
  /**
   * 注册新房产
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async registerProperty(req, res, next) {
    try {
      const { propertyId, country, metadataURI } = req.body;
      
      logger.info(`请求注册房产 - propertyId: ${propertyId}, 使用角色: ${operationRoles.registerProperty}`);
      const receipt = await PropertyRegistryService.registerProperty(propertyId, country, metadataURI);
      
      res.status(201).json({
        success: true,
        data: {
          message: '房产注册成功',
          transactionHash: receipt.transactionHash,
          propertyId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批准房产
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async approveProperty(req, res, next) {
    try {
      const { propertyId } = req.params;
      
      logger.info(`请求批准房产 - propertyId: ${propertyId}, 使用角色: ${operationRoles.approveProperty}`);
      const receipt = await PropertyRegistryService.approveProperty(propertyId);
      
      res.status(200).json({
        success: true,
        data: {
          message: '房产批准成功',
          transactionHash: receipt.transactionHash,
          propertyId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 拒绝房产
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async rejectProperty(req, res, next) {
    try {
      const { propertyId } = req.params;
      
      logger.info(`请求拒绝房产 - propertyId: ${propertyId}, 使用角色: ${operationRoles.rejectProperty}`);
      const receipt = await PropertyRegistryService.rejectProperty(propertyId);
      
      res.status(200).json({
        success: true,
        data: {
          message: '房产拒绝成功',
          transactionHash: receipt.transactionHash,
          propertyId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 下架房产
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async delistProperty(req, res, next) {
    try {
      const { propertyId } = req.params;
      
      logger.info(`请求下架房产 - propertyId: ${propertyId}, 使用角色: ${operationRoles.delistProperty}`);
      const receipt = await PropertyRegistryService.delistProperty(propertyId);
      
      res.status(200).json({
        success: true,
        data: {
          message: '房产下架成功',
          transactionHash: receipt.transactionHash,
          propertyId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 设置房产状态
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async setPropertyStatus(req, res, next) {
    try {
      const { propertyId } = req.params;
      const { status } = req.body;
      
      logger.info(`请求设置房产状态 - propertyId: ${propertyId}, status: ${status}, 使用角色: ${operationRoles.setPropertyStatus}`);
      const receipt = await PropertyRegistryService.setPropertyStatus(propertyId, status);
      
      res.status(200).json({
        success: true,
        data: {
          message: '房产状态设置成功',
          transactionHash: receipt.transactionHash,
          propertyId,
          status
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取房产详情
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getProperty(req, res, next) {
    try {
      const { propertyId } = req.params;
      
      const property = await PropertyRegistryService.getProperty(propertyId);
      
      if (!property) {
        throw ApiError.notFound(`未找到房产 ID: ${propertyId}`);
      }
      
      // 获取关联的代币地址，如果有
      let tokenAddress = null;
      try {
        tokenAddress = await TokenFactoryService.getRealEstateToken(propertyId);
      } catch (error) {
        logger.warn(`获取房产代币地址失败 - propertyId: ${propertyId}, error: ${error.message}`);
      }
      
      // 合并结果
      const result = {
        ...property,
        tokenAddress
      };
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取所有房产
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getAllProperties(req, res, next) {
    try {
      const propertyIds = await PropertyRegistryService.getAllProperties();
      
      // 并行获取所有房产详情
      const propertiesPromises = propertyIds.map(id => PropertyRegistryService.getProperty(id));
      const properties = await Promise.all(propertiesPromises);
      
      // 获取所有代币地址，如果TokenFactoryService可用
      let tokenMap = {};
      try {
        const tokens = await TokenFactoryService.getAllTokens();
        tokenMap = tokens.reduce((map, token) => {
          map[token.propertyId] = token.tokenAddress;
          return map;
        }, {});
      } catch (error) {
        logger.warn(`获取所有代币地址失败: ${error.message}`);
      }
      
      // 合并结果
      const result = properties.filter(Boolean).map(property => ({
        ...property,
        tokenAddress: tokenMap[property.propertyId] || null
      }));
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PropertyController; 