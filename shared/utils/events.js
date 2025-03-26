const { getEventLogPath, validatePath } = require('./paths');
const logger = require('./logger');

/**
 * 事件管理器类
 */
class EventManager {
  constructor() {
    this.eventLogPath = getEventLogPath();
    this.eventHandlers = new Map();
    logger.info('Event manager initialized');
  }

  /**
   * 注册事件处理器
   * @param {string} eventName 事件名称
   * @param {Function} handler 事件处理器
   */
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName).add(handler);
    logger.info(`Event handler registered for ${eventName}`);
  }

  /**
   * 移除事件处理器
   * @param {string} eventName 事件名称
   * @param {Function} handler 事件处理器
   */
  off(eventName, handler) {
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName).delete(handler);
      logger.info(`Event handler removed for ${eventName}`);
    }
  }

  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {Object} data 事件数据
   */
  async emit(eventName, data) {
    try {
      const timestamp = new Date().toISOString();
      const eventData = {
        eventName,
        data,
        timestamp
      };

      // 记录事件
      logger.info(`Event emitted: ${eventName}`, data);

      // 保存事件到文件
      await this.saveEvent(eventData);

      // 调用事件处理器
      if (this.eventHandlers.has(eventName)) {
        const handlers = this.eventHandlers.get(eventName);
        for (const handler of handlers) {
          try {
            await handler(data);
          } catch (error) {
            logger.error(`Error in event handler for ${eventName}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error(`Error emitting event ${eventName}:`, error);
    }
  }

  /**
   * 保存事件到文件
   * @param {Object} eventData 事件数据
   */
  async saveEvent(eventData) {
    try {
      if (!validatePath(this.eventLogPath)) {
        throw new Error('Invalid event log path');
      }

      await require('fs').promises.appendFile(
        this.eventLogPath,
        JSON.stringify(eventData) + '\n'
      );
    } catch (error) {
      logger.error('Failed to save event to file:', error);
    }
  }

  /**
   * 获取事件历史
   * @param {string} eventName 事件名称
   * @param {number} limit 限制数量
   * @returns {Array} 事件历史
   */
  async getEventHistory(eventName, limit = 100) {
    try {
      if (!validatePath(this.eventLogPath)) {
        return [];
      }

      const data = await require('fs').promises.readFile(this.eventLogPath, 'utf8');
      const events = data
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(event => !eventName || event.eventName === eventName)
        .slice(-limit);

      return events;
    } catch (error) {
      logger.error('Failed to get event history:', error);
      return [];
    }
  }

  /**
   * 清除事件历史
   */
  async clearEventHistory() {
    try {
      if (!validatePath(this.eventLogPath)) {
        return;
      }

      await require('fs').promises.writeFile(this.eventLogPath, '');
      logger.info('Event history cleared');
    } catch (error) {
      logger.error('Failed to clear event history:', error);
    }
  }
}

const eventManager = new EventManager();

module.exports = eventManager; 