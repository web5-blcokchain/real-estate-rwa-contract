const { ethers } = require('ethers');
const { EventError } = require('../utils/errors');
const Logger = require('../utils/logger');
const { Validation } = require('../utils/validation');
const EnvConfig = require('../config/env');
const Provider = require('./provider');
const Contract = require('./contract');
const fs = require('fs');
const path = require('path');

/**
 * EventManager 管理器类
 */
class EventManager {
  /**
   * 创建事件管理器实例
   * @param {Object} options - 配置选项
   * @param {Object} [options.provider] - Provider 实例
   * @param {Object} [options.contract] - 合约实例
   * @param {string} [options.storagePath] - 事件存储路径
   * @returns {Promise<EventManager>} 事件管理器实例
   */
  static async create(options = {}) {
    try {
      const provider = options.provider || Provider.create();
      const contract = options.contract || await Contract.create();
      const storagePath = options.storagePath || path.join(process.cwd(), 'logs', 'events');
      
      // 确保存储目录存在
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }

      const manager = new EventManager(provider, contract, storagePath);
      Logger.info('事件管理器创建成功');
      return manager;
    } catch (error) {
      throw new EventError(`创建事件管理器失败: ${error.message}`);
    }
  }

  /**
   * 构造函数
   * @param {ethers.Provider} provider - Provider 实例
   * @param {ethers.Contract} contract - 合约实例
   * @param {string} storagePath - 事件存储路径
   */
  constructor(provider, contract, storagePath) {
    this.provider = provider;
    this.contract = contract;
    this.storagePath = storagePath;
    this.listeners = new Map();
  }

  /**
   * 监听单个事件
   * @param {string} event - 事件名
   * @param {Object} [filter] - 事件过滤器
   * @param {Function} callback - 回调函数
   * @returns {Promise<string>} 监听器 ID
   */
  async on(event, filter = {}, callback) {
    try {
      Validation.validate(
        Validation.isValidString(event),
        '无效的事件名'
      );

      Validation.validate(
        Validation.isValidObject(filter),
        '无效的事件过滤器'
      );

      Validation.validate(
        Validation.isValidFunction(callback),
        '无效的回调函数'
      );

      const listener = async (...args) => {
        try {
          const event = args[args.length - 1];
          await this._storeEvent(event.name, event);
          await callback(...args);
        } catch (error) {
          Logger.error(`事件处理失败: ${error.message}`);
        }
      };

      this.contract.on(event, filter, listener);
      const listenerId = `${event}-${Date.now()}`;
      this.listeners.set(listenerId, listener);
      Logger.info(`事件监听已启动: ${event}`);
      return listenerId;
    } catch (error) {
      throw new EventError(`监听事件失败: ${error.message}`);
    }
  }

  /**
   * 监听多个事件
   * @param {Array<Object>} events - 事件配置数组
   * @param {Function} callback - 回调函数
   * @returns {Promise<Array<string>>} 监听器 ID 数组
   */
  async onMany(events, callback) {
    try {
      Validation.validate(
        Validation.isValidArray(events),
        '无效的事件配置数组'
      );

      Validation.validate(
        Validation.isValidFunction(callback),
        '无效的回调函数'
      );

      const listenerIds = [];
      for (const event of events) {
        const listenerId = await this.on(event.name, event.filter, callback);
        listenerIds.push(listenerId);
      }
      return listenerIds;
    } catch (error) {
      throw new EventError(`监听多个事件失败: ${error.message}`);
    }
  }

  /**
   * 停止监听事件
   * @param {string} listenerId - 监听器 ID
   */
  off(listenerId) {
    try {
      const listener = this.listeners.get(listenerId);
      if (listener) {
        this.contract.removeAllListeners(listenerId);
        this.listeners.delete(listenerId);
        Logger.info(`事件监听已停止: ${listenerId}`);
      }
    } catch (error) {
      throw new EventError(`停止监听事件失败: ${error.message}`);
    }
  }

  /**
   * 停止监听所有事件
   */
  offAll() {
    try {
      for (const [listenerId, listener] of this.listeners) {
        this.contract.removeAllListeners(listenerId);
        this.listeners.delete(listenerId);
      }
      Logger.info('所有事件监听已停止');
    } catch (error) {
      throw new EventError(`停止所有事件监听失败: ${error.message}`);
    }
  }

  /**
   * 查询历史事件
   * @param {string} event - 事件名
   * @param {Object} [filter] - 事件过滤器
   * @param {Object} [options] - 查询选项
   * @returns {Promise<Array>} 事件日志
   */
  async query(event, filter = {}, options = {}) {
    try {
      Validation.validate(
        Validation.isValidString(event),
        '无效的事件名'
      );

      Validation.validate(
        Validation.isValidObject(filter),
        '无效的事件过滤器'
      );

      const logs = await this.contract.queryFilter(event, filter, options);
      Logger.debug(`事件查询成功: ${event}`);
      return logs;
    } catch (error) {
      throw new EventError(`查询事件失败: ${error.message}`);
    }
  }

  /**
   * 批量查询历史事件
   * @param {Array<Object>} events - 事件配置数组
   * @param {Object} [options] - 查询选项
   * @returns {Promise<Object>} 事件日志映射
   */
  async queryMany(events, options = {}) {
    try {
      Validation.validate(
        Validation.isValidArray(events),
        '无效的事件配置数组'
      );

      const results = {};
      for (const event of events) {
        const logs = await this.query(event.name, event.filter, options);
        results[event.name] = logs;
      }
      return results;
    } catch (error) {
      throw new EventError(`批量查询事件失败: ${error.message}`);
    }
  }

  /**
   * 获取事件监听器列表
   * @returns {Array<string>} 监听器 ID 数组
   */
  getListeners() {
    return Array.from(this.listeners.keys());
  }

  /**
   * 检查监听器是否存在
   * @param {string} listenerId - 监听器 ID
   * @returns {boolean} 是否存在
   */
  hasListener(listenerId) {
    return this.listeners.has(listenerId);
  }

  /**
   * 存储事件
   * @param {string} eventName - 事件名称
   * @param {Object} event - 事件对象
   * @returns {Promise<void>}
   */
  async _storeEvent(eventName, event) {
    try {
      const eventFile = path.join(this.storagePath, `${eventName}.json`);
      const eventData = {
        name: eventName,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        args: event.args,
        timestamp: Date.now()
      };

      let events = [];
      if (fs.existsSync(eventFile)) {
        const content = await fs.promises.readFile(eventFile, 'utf8');
        events = JSON.parse(content);
      }

      events.push(eventData);
      await fs.promises.writeFile(eventFile, JSON.stringify(events, null, 2));

      Logger.debug(`事件已存储: ${eventName}`);
    } catch (error) {
      Logger.error(`存储事件失败: ${error.message}`);
    }
  }

  /**
   * 重放事件
   * @param {string} eventName - 事件名称
   * @param {Object} filter - 事件过滤器
   * @param {Function} callback - 回调函数
   * @returns {Promise<void>}
   */
  async replay(eventName, filter, callback) {
    try {
      Validation.validate(
        Validation.isValidEventName(eventName),
        '无效的事件名称'
      );

      Validation.validate(
        Validation.isValidEventFilter(filter),
        '无效的事件过滤器'
      );

      const events = await this.contract.queryFilter(eventName, filter);
      for (const event of events) {
        await callback(event);
      }

      Logger.info(`重放事件完成: ${eventName}, 共 ${events.length} 个事件`);
    } catch (error) {
      throw new EventError(`重放事件失败: ${error.message}`);
    }
  }
}

module.exports = EventManager; 