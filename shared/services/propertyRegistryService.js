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
    return this.executeRead('getAllProperties');
  }

  /**
   * 获取房产详情
   * @param {string} propertyName 房产名称
   * @returns {Promise<Object>} 房产详情
   */
  async getProperty(propertyName) {
    this.validateArgs([propertyName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeRead('getProperty', [propertyName]);
  }

  /**
   * 注册新房产
   * @param {Object} propertyData 房产数据
   * @param {string} propertyData.name 房产名称
   * @param {string} propertyData.location 位置
   * @param {number} propertyData.totalArea 总面积
   * @param {string} propertyData.description 描述
   * @returns {Promise<Object>} 交易收据
   */
  async registerProperty(propertyData) {
    this.validateArgs(
      [propertyData.name, propertyData.location, propertyData.totalArea, propertyData.description],
      [
        name => typeof name === 'string' && name.length > 0,
        location => typeof location === 'string' && location.length > 0,
        area => typeof area === 'number' && area > 0,
        desc => typeof desc === 'string'
      ]
    );

    return this.executeWrite('registerProperty', [
      propertyData.name,
      propertyData.location,
      ethers.utils.parseUnits(propertyData.totalArea.toString(), 18),
      propertyData.description
    ], { operationName: 'registerProperty' });
  }

  /**
   * 批准房产
   * @param {string} propertyName 房产名称
   * @returns {Promise<Object>} 交易收据
   */
  async approveProperty(propertyName) {
    this.validateArgs([propertyName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeWrite('approveProperty', [propertyName], { operationName: 'approveProperty' });
  }

  /**
   * 拒绝房产
   * @param {string} propertyName 房产名称
   * @param {string} reason 拒绝原因
   * @returns {Promise<Object>} 交易收据
   */
  async rejectProperty(propertyName, reason) {
    this.validateArgs(
      [propertyName, reason],
      [
        name => typeof name === 'string' && name.length > 0,
        r => typeof r === 'string' && r.length > 0
      ]
    );
    return this.executeWrite('rejectProperty', [propertyName, reason], { operationName: 'rejectProperty' });
  }

  /**
   * 下架房产
   * @param {string} propertyName 房产名称
   * @returns {Promise<Object>} 交易收据
   */
  async delistProperty(propertyName) {
    this.validateArgs([propertyName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeWrite('delistProperty', [propertyName], { operationName: 'delistProperty' });
  }

  /**
   * 设置房产状态
   * @param {string} propertyName 房产名称
   * @param {number} status 状态码
   * @returns {Promise<Object>} 交易收据
   */
  async setPropertyStatus(propertyName, status) {
    this.validateArgs(
      [propertyName, status],
      [
        name => typeof name === 'string' && name.length > 0,
        s => typeof s === 'number' && s >= 0 && s <= 3
      ]
    );
    return this.executeWrite('setPropertyStatus', [propertyName, status], { operationName: 'setPropertyStatus' });
  }

  /**
   * 获取房产状态
   * @param {string} propertyName 房产名称
   * @returns {Promise<number>} 状态码
   */
  async getPropertyStatus(propertyName) {
    this.validateArgs([propertyName], [name => typeof name === 'string' && name.length > 0]);
    return this.executeRead('getPropertyStatus', [propertyName]);
  }
}

module.exports = PropertyRegistryService; 