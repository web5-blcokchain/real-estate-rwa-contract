const BaseContractService = require('./baseContractService');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 房产注册服务
 * 负责与PropertyRegistry合约交互
 */
class PropertyRegistryService extends BaseContractService {
  constructor() {
    super('PropertyRegistry', 'propertyRegistry');
  }
  
  /**
   * 获取所有房产
   * @returns {Promise<Array>} 房产ID列表
   */
  async getAllProperties() {
    try {
      const count = await this.executeRead('getPropertyCount');
      
      // 获取所有房产ID
      const properties = [];
      for (let i = 0; i < count; i++) {
        const propertyId = await this.executeRead('propertyIds', [i]);
        properties.push(propertyId);
      }
      
      return properties;
    } catch (error) {
      logger.error(`获取所有房产失败: ${error.message}`);
      throw new ApiError(500, '获取房产列表失败', error.message);
    }
  }
  
  /**
   * 获取房产信息
   * @param {string} propertyId 房产ID
   * @returns {Promise<object>} 房产信息
   */
  async getProperty(propertyId) {
    try {
      if (!propertyId) {
        throw new ApiError(400, '房产ID不能为空');
      }
      
      const propertyData = await this.executeRead('properties', [propertyId]);
      const { exists, country, metadataURI, status, createdAt, updatedAt } = propertyData;
      
      // 如果房产不存在，返回null
      if (!exists) {
        return null;
      }
      
      return {
        propertyId,
        country,
        metadataURI,
        status,
        createdAt: new Date(Number(createdAt) * 1000),
        updatedAt: new Date(Number(updatedAt) * 1000),
        exists
      };
    } catch (error) {
      logger.error(`获取房产信息失败 - propertyId: ${propertyId}, error: ${error.message}`);
      throw new ApiError(500, '获取房产信息失败', error.message);
    }
  }
  
  /**
   * 注册新房产
   * @param {string} propertyId 房产ID
   * @param {string} country 国家代码
   * @param {string} metadataURI 元数据URI
   * @returns {Promise<object>} 交易收据
   */
  async registerProperty(propertyId, country, metadataURI) {
    try {
      if (!propertyId || !country || !metadataURI) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 检查房产是否已存在
      const existingProperty = await this.getProperty(propertyId);
      if (existingProperty) {
        throw new ApiError(409, '房产已存在');
      }
      
      const receipt = await this.executeWrite(
        'registerProperty',
        [propertyId, country, metadataURI],
        { operationName: 'registerProperty' }
      );
      
      logger.info(`房产注册成功 - propertyId: ${propertyId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产注册失败 - propertyId: ${propertyId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '房产注册失败', error.message);
    }
  }
  
  /**
   * 批准房产
   * @param {string} propertyId 房产ID
   * @returns {Promise<object>} 交易收据
   */
  async approveProperty(propertyId) {
    try {
      if (!propertyId) {
        throw new ApiError(400, '房产ID不能为空');
      }
      
      // 检查房产是否存在
      const property = await this.getProperty(propertyId);
      if (!property) {
        throw new ApiError(404, '房产不存在');
      }
      
      // 检查房产状态
      if (property.status === 1) {
        throw new ApiError(400, '房产已批准');
      }
      
      const receipt = await this.executeWrite(
        'setPropertyStatus',
        [propertyId, 1], // status 1 = Approved
        { operationName: 'approveProperty' }
      );
      
      logger.info(`房产批准成功 - propertyId: ${propertyId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产批准失败 - propertyId: ${propertyId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '房产批准失败', error.message);
    }
  }
  
  /**
   * 拒绝房产
   * @param {string} propertyId 房产ID
   * @returns {Promise<object>} 交易收据
   */
  async rejectProperty(propertyId) {
    try {
      if (!propertyId) {
        throw new ApiError(400, '房产ID不能为空');
      }
      
      // 检查房产是否存在
      const property = await this.getProperty(propertyId);
      if (!property) {
        throw new ApiError(404, '房产不存在');
      }
      
      // 检查房产状态
      if (property.status === 2) {
        throw new ApiError(400, '房产已拒绝');
      }
      
      const receipt = await this.executeWrite(
        'setPropertyStatus',
        [propertyId, 2], // status 2 = Rejected
        { operationName: 'rejectProperty' }
      );
      
      logger.info(`房产拒绝成功 - propertyId: ${propertyId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产拒绝失败 - propertyId: ${propertyId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '房产拒绝失败', error.message);
    }
  }
  
  /**
   * 下架房产
   * @param {string} propertyId 房产ID
   * @returns {Promise<object>} 交易收据
   */
  async delistProperty(propertyId) {
    try {
      if (!propertyId) {
        throw new ApiError(400, '房产ID不能为空');
      }
      
      // 检查房产是否存在
      const property = await this.getProperty(propertyId);
      if (!property) {
        throw new ApiError(404, '房产不存在');
      }
      
      // 检查房产状态
      if (property.status === 3) {
        throw new ApiError(400, '房产已下架');
      }
      
      const receipt = await this.executeWrite(
        'setPropertyStatus',
        [propertyId, 3], // status 3 = Delisted
        { operationName: 'delistProperty' }
      );
      
      logger.info(`房产下架成功 - propertyId: ${propertyId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产下架失败 - propertyId: ${propertyId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '房产下架失败', error.message);
    }
  }
  
  /**
   * 设置房产状态
   * @param {string} propertyId 房产ID
   * @param {number} status 状态码 (0=Pending, 1=Approved, 2=Rejected, 3=Delisted)
   * @returns {Promise<object>} 交易收据
   */
  async setPropertyStatus(propertyId, status) {
    try {
      if (!propertyId) {
        throw new ApiError(400, '房产ID不能为空');
      }
      
      if (status < 0 || status > 3) {
        throw new ApiError(400, '无效的状态码');
      }
      
      // 检查房产是否存在
      const property = await this.getProperty(propertyId);
      if (!property) {
        throw new ApiError(404, '房产不存在');
      }
      
      const receipt = await this.executeWrite(
        'setPropertyStatus',
        [propertyId, status],
        { operationName: 'setPropertyStatus' }
      );
      
      logger.info(`房产状态设置成功 - propertyId: ${propertyId}, status: ${status}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产状态设置失败 - propertyId: ${propertyId}, status: ${status}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '房产状态设置失败', error.message);
    }
  }
  
  /**
   * 获取房产状态
   * @param {string} propertyId 房产ID
   * @returns {Promise<number>} 状态码 (0=Pending, 1=Approved, 2=Rejected, 3=Delisted)
   */
  async getPropertyStatus(propertyId) {
    try {
      if (!propertyId) {
        throw new ApiError(400, '房产ID不能为空');
      }
      
      const property = await this.executeRead('properties', [propertyId]);
      
      if (!property.exists) {
        throw new ApiError(404, '房产不存在');
      }
      
      return Number(property.status);
    } catch (error) {
      logger.error(`获取房产状态失败 - propertyId: ${propertyId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '获取房产状态失败', error.message);
    }
  }
}

module.exports = new PropertyRegistryService(); 