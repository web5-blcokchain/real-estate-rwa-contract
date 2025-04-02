const Logger = require('./logger');

/**
 * 性能监控类
 */
class PerformanceMonitor {
  /**
   * 开始性能监控
   * @param {string} name - 监控名称
   * @returns {Object} 监控对象
   */
  static start(name) {
    return {
      name,
      startTime: Date.now(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * 结束性能监控
   * @param {Object} metric - 监控对象
   * @returns {Object} 性能指标
   */
  static end(metric) {
    const duration = Date.now() - metric.startTime;
    const memoryDiff = this._calculateMemoryDiff(metric.memoryUsage);

    const performance = {
      name: metric.name,
      duration: `${duration}ms`,
      memory: memoryDiff
    };

    Logger.debug('Performance', performance);
    return performance;
  }

  /**
   * 计算内存使用差异
   * @private
   * @param {Object} startMemory - 开始时的内存使用
   * @returns {Object} 内存使用差异
   */
  static _calculateMemoryDiff(startMemory) {
    const currentMemory = process.memoryUsage();
    return {
      heapUsed: `${(currentMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024}MB`,
      heapTotal: `${(currentMemory.heapTotal - startMemory.heapTotal) / 1024 / 1024}MB`,
      external: `${(currentMemory.external - startMemory.external) / 1024 / 1024}MB`,
      rss: `${(currentMemory.rss - startMemory.rss) / 1024 / 1024}MB`
    };
  }

  /**
   * 监控异步操作
   * @param {string} name - 监控名称
   * @param {Function} operation - 异步操作
   * @returns {Promise} 操作结果
   */
  static async monitorAsync(name, operation) {
    const metric = this.start(name);
    try {
      const result = await operation();
      this.end(metric);
      return result;
    } catch (error) {
      this.end(metric);
      throw error;
    }
  }

  /**
   * 监控同步操作
   * @param {string} name - 监控名称
   * @param {Function} operation - 同步操作
   * @returns {*} 操作结果
   */
  static monitorSync(name, operation) {
    const metric = this.start(name);
    try {
      const result = operation();
      this.end(metric);
      return result;
    } catch (error) {
      this.end(metric);
      throw error;
    }
  }
}

module.exports = PerformanceMonitor; 