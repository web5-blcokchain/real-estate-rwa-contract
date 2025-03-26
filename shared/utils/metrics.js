const { getMetricsPath, validatePath } = require('./paths');
const logger = require('./logger');

/**
 * 指标管理器类
 */
class MetricsManager {
  constructor() {
    this.metricsPath = getMetricsPath();
    this.metrics = new Map();
    this.initialized = false;
    logger.info('Metrics manager initialized');
  }

  /**
   * 初始化指标管理器
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadFromFile();
      this.initialized = true;
      logger.info('Metrics initialized from file');
    } catch (error) {
      logger.error('Failed to initialize metrics:', error);
    }
  }

  /**
   * 记录指标
   * @param {string} name 指标名称
   * @param {number} value 指标值
   * @param {Object} [labels] 标签
   */
  async record(name, value, labels = {}) {
    try {
      const key = this._getMetricKey(name, labels);
      const entry = {
        name,
        value,
        labels,
        timestamp: Date.now()
      };

      this.metrics.set(key, entry);
      await this.saveToFile();
      logger.info(`Metric recorded: ${name}`, { value, labels });
    } catch (error) {
      logger.error(`Failed to record metric ${name}:`, error);
    }
  }

  /**
   * 获取指标
   * @param {string} name 指标名称
   * @param {Object} [labels] 标签
   * @returns {Object} 指标数据
   */
  async get(name, labels = {}) {
    try {
      const key = this._getMetricKey(name, labels);
      return this.metrics.get(key);
    } catch (error) {
      logger.error(`Failed to get metric ${name}:`, error);
      return null;
    }
  }

  /**
   * 获取所有指标
   * @returns {Array} 指标列表
   */
  async getAll() {
    try {
      return Array.from(this.metrics.values());
    } catch (error) {
      logger.error('Failed to get all metrics:', error);
      return [];
    }
  }

  /**
   * 清除指标
   * @param {string} [name] 指标名称
   * @param {Object} [labels] 标签
   */
  async clear(name, labels = {}) {
    try {
      if (name) {
        const key = this._getMetricKey(name, labels);
        this.metrics.delete(key);
      } else {
        this.metrics.clear();
      }
      await this.saveToFile();
      logger.info(`Metrics cleared${name ? ` for ${name}` : ''}`);
    } catch (error) {
      logger.error('Failed to clear metrics:', error);
    }
  }

  /**
   * 保存指标到文件
   */
  async saveToFile() {
    try {
      if (!validatePath(this.metricsPath)) {
        throw new Error('Invalid metrics path');
      }

      const data = JSON.stringify(Array.from(this.metrics.entries()));
      await require('fs').promises.writeFile(this.metricsPath, data);
    } catch (error) {
      logger.error('Failed to save metrics to file:', error);
    }
  }

  /**
   * 从文件加载指标
   */
  async loadFromFile() {
    try {
      if (!validatePath(this.metricsPath)) {
        return;
      }

      const data = await require('fs').promises.readFile(this.metricsPath, 'utf8');
      const entries = JSON.parse(data);
      this.metrics = new Map(entries);
    } catch (error) {
      logger.error('Failed to load metrics from file:', error);
    }
  }

  /**
   * 获取指标键
   * @private
   * @param {string} name 指标名称
   * @param {Object} labels 标签
   * @returns {string} 指标键
   */
  _getMetricKey(name, labels) {
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return labelString ? `${name}{${labelString}}` : name;
  }

  /**
   * 获取指标名称列表
   * @returns {string[]} 指标名称列表
   */
  getMetricNames() {
    return [...new Set(Array.from(this.metrics.values()).map(m => m.name))];
  }

  /**
   * 获取指标数量
   * @returns {number} 指标数量
   */
  size() {
    return this.metrics.size;
  }
}

const metricsManager = new MetricsManager();

module.exports = metricsManager; 