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
      throw error;
    }
  }
  
  /**
   * 获取房产信息
   * @param {string} propertyId 房产ID
   * @returns {Promise<object>} 房产信息
   */
  async getProperty(propertyId) {
    try {
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
      throw error;
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
      const receipt = await this.executeWrite(
        'registerProperty',
        [propertyId, country, metadataURI],
        { operationName: 'registerProperty' }
      );
      
      logger.info(`房产注册成功 - propertyId: ${propertyId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产注册失败 - propertyId: ${propertyId}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 批准房产
   * @param {string} propertyId 房产ID
   * @returns {Promise<object>} 交易收据
   */
  async approveProperty(propertyId) {
    try {
      const receipt = await this.executeWrite(
        'setPropertyStatus',
        [propertyId, 1], // status 1 = Approved
        { operationName: 'approveProperty' }
      );
      
      logger.info(`房产批准成功 - propertyId: ${propertyId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产批准失败 - propertyId: ${propertyId}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 拒绝房产
   * @param {string} propertyId 房产ID
   * @returns {Promise<object>} 交易收据
   */
  async rejectProperty(propertyId) {
    try {
      const receipt = await this.executeWrite(
        'setPropertyStatus',
        [propertyId, 2], // status 2 = Rejected
        { operationName: 'rejectProperty' }
      );
      
      logger.info(`房产拒绝成功 - propertyId: ${propertyId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产拒绝失败 - propertyId: ${propertyId}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 下架房产
   * @param {string} propertyId 房产ID
   * @returns {Promise<object>} 交易收据
   */
  async delistProperty(propertyId) {
    try {
      const receipt = await this.executeWrite(
        'setPropertyStatus',
        [propertyId, 3], // status 3 = Delisted
        { operationName: 'delistProperty' }
      );
      
      logger.info(`房产下架成功 - propertyId: ${propertyId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产下架失败 - propertyId: ${propertyId}, error: ${error.message}`);
      throw error;
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
      const receipt = await this.executeWrite(
        'setPropertyStatus',
        [propertyId, status],
        { operationName: 'setPropertyStatus' }
      );
      
      logger.info(`房产状态设置成功 - propertyId: ${propertyId}, status: ${status}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`房产状态设置失败 - propertyId: ${propertyId}, status: ${status}, error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取房产状态
   * @param {string} propertyId 房产ID
   * @returns {Promise<number>} 状态码 (0=Pending, 1=Approved, 2=Rejected, 3=Delisted)
   */
  async getPropertyStatus(propertyId) {
    try {
      const property = await this.executeRead('properties', [propertyId]);
      
      if (!property.exists) {
        throw new Error(`房产不存在 - propertyId: ${propertyId}`);
      }
      
      return Number(property.status);
    } catch (error) {
      logger.error(`获取房产状态失败 - propertyId: ${propertyId}, error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new PropertyRegistryService(); 