const BaseContractService = require('./baseContractService');
const { ethers } = require('ethers');
const { ApiError } = require('../utils/errors');

/**
 * 房产注册服务类
 * 处理与PropertyRegistry合约的交互
 */
class PropertyRegistryService extends BaseContractService {
  constructor() {
    super('PropertyRegistry');
  }

  /**
   * 获取所有房产列表
   * @returns {Promise<Array>} 房产列表
   */
  async getAllProperties() {
    // 获取房产数量 - 使用 allPropertyIds 数组长度
    try {
      // 获取allPropertyIds数组长度
      const allPropertyIdsLength = await this.executeRead('allPropertyIds').then(arr => arr.length);
      console.log(`获取到 ${allPropertyIdsLength} 个房产ID`);
      
      const properties = [];
      
      // 逐个获取房产信息
      for (let i = 0; i < allPropertyIdsLength; i++) {
        // 获取索引i处的房产ID
        const propertyId = await this.executeRead('allPropertyIds', [i]);
        console.log(`获取索引 ${i} 处的房产ID: ${propertyId}`);
        
        // 获取该ID的房产信息
        const property = await this.executeRead('properties', [propertyId]);
        console.log(`获取房产 ${propertyId} 的详情:`, property);
        
        properties.push({
          id: propertyId,
          ...property
        });
      }
      
      return properties;
    } catch (error) {
      console.error('获取所有房产失败:', error);
      throw new ApiError('获取房产列表失败: ' + error.message, 'GET_PROPERTIES_FAILED');
    }
  }

  /**
   * 获取房产详情
   * @param {string} propertyId 房产ID
   * @returns {Promise<Object>} 房产详情
   */
  async getProperty(propertyId) {
    this.validateArgs([propertyId], [id => typeof id === 'string' && id.length > 0]);
    const property = await this.executeRead('properties', [propertyId]);
    return {
      id: propertyId,
      ...property
    };
  }

  /**
   * 注册新房产
   * @param {string} propertyId 房产ID
   * @param {string} country 国家代码
   * @param {string} metadataURI 元数据URI
   * @returns {Promise<Object>} 交易收据
   */
  async registerProperty(propertyId, country, metadataURI) {
    this.validateArgs(
      [propertyId, country, metadataURI],
      [
        id => typeof id === 'string' && id.length > 0,
        country => typeof country === 'string' && country.length > 0,
        uri => typeof uri === 'string' && uri.length > 0
      ]
    );

    return this.executeWrite('registerProperty', [
      propertyId,
      country,
      metadataURI
    ], { operationName: 'registerProperty' });
  }

  /**
   * 批准房产
   * @param {string} propertyId 房产ID
   * @returns {Promise<Object>} 交易收据
   */
  async approveProperty(propertyId) {
    this.validateArgs([propertyId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeWrite('approveProperty', [propertyId], { operationName: 'approveProperty' });
  }

  /**
   * 拒绝房产
   * @param {string} propertyId 房产ID
   * @param {string} reason 拒绝原因
   * @returns {Promise<Object>} 交易收据
   */
  async rejectProperty(propertyId, reason) {
    this.validateArgs(
      [propertyId, reason],
      [
        id => typeof id === 'string' && id.length > 0,
        r => typeof r === 'string' && r.length > 0
      ]
    );
    return this.executeWrite('rejectProperty', [propertyId, reason], { operationName: 'rejectProperty' });
  }

  /**
   * 下架房产
   * @param {string} propertyId 房产ID
   * @returns {Promise<Object>} 交易收据
   */
  async delistProperty(propertyId) {
    this.validateArgs([propertyId], [id => typeof id === 'string' && id.length > 0]);
    return this.executeWrite('delistProperty', [propertyId], { operationName: 'delistProperty' });
  }

  /**
   * 设置房产状态
   * @param {string} propertyId 房产ID
   * @param {number} status 状态码
   * @returns {Promise<Object>} 交易收据
   */
  async setPropertyStatus(propertyId, status) {
    this.validateArgs(
      [propertyId, status],
      [
        id => typeof id === 'string' && id.length > 0,
        s => typeof s === 'number' && s >= 0 && s <= 3
      ]
    );
    return this.executeWrite('setPropertyStatus', [propertyId, status], { operationName: 'setPropertyStatus' });
  }

  /**
   * 获取房产状态
   * @param {string} propertyId 房产ID
   * @returns {Promise<number>} 状态码
   */
  async getPropertyStatus(propertyId) {
    this.validateArgs([propertyId], [id => typeof id === 'string' && id.length > 0]);
    const property = await this.executeRead('properties', [propertyId]);
    return property ? property.status : 0;
  }
}

module.exports = PropertyRegistryService; 