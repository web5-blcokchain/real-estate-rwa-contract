const { getTestConfigPath, getTestAccountsPath, validatePath } = require('./paths');
const logger = require('./logger');
const { TestError } = require('./errors');
const cacheManager = require('./cache');
const metricsManager = require('./metrics');
const { TEST_DATA, METRICS, EVENTS } = require('./constants');

/**
 * 测试工具类
 */
class TestingUtils {
  constructor() {
    this.testConfig = null;
    this.testAccounts = null;
    this.initialized = false;
    logger.info('Testing utilities initialized');
  }

  /**
   * 初始化测试工具
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadTestConfig();
      await this.loadTestAccounts();
      this.initialized = true;
      logger.info('Testing utilities initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize testing utilities:', error);
      throw new TestError('Failed to initialize testing utilities', { error });
    }
  }

  /**
   * 加载测试配置
   */
  async loadTestConfig() {
    try {
      if (!validatePath(getTestConfigPath())) {
        throw new Error('Test configuration file not found');
      }

      this.testConfig = require(getTestConfigPath());
      logger.info('Test configuration loaded');
    } catch (error) {
      logger.error('Failed to load test configuration:', error);
      throw new TestError('Failed to load test configuration', { error });
    }
  }

  /**
   * 加载测试账户
   */
  async loadTestAccounts() {
    try {
      if (!validatePath(getTestAccountsPath())) {
        throw new Error('Test accounts file not found');
      }

      this.testAccounts = require(getTestAccountsPath());
      logger.info('Test accounts loaded');
    } catch (error) {
      logger.error('Failed to load test accounts:', error);
      throw new TestError('Failed to load test accounts', { error });
    }
  }

  /**
   * 获取测试账户
   * @param {string} role 账户角色
   * @returns {Object} 测试账户信息
   */
  getTestAccount(role) {
    try {
      if (!this.testAccounts || !this.testAccounts[role]) {
        throw new Error(`Test account not found for role: ${role}`);
      }
      return this.testAccounts[role];
    } catch (error) {
      logger.error(`Failed to get test account for role ${role}:`, error);
      throw new TestError(`Failed to get test account for role ${role}`, { error });
    }
  }

  /**
   * 获取测试合约地址
   * @param {string} contractName 合约名称
   * @returns {string} 合约地址
   */
  getTestContractAddress(contractName) {
    try {
      if (!this.testConfig || !this.testConfig.contracts || !this.testConfig.contracts[contractName]) {
        throw new Error(`Contract address not found for: ${contractName}`);
      }
      return this.testConfig.contracts[contractName];
    } catch (error) {
      logger.error(`Failed to get contract address for ${contractName}:`, error);
      throw new TestError(`Failed to get contract address for ${contractName}`, { error });
    }
  }

  /**
   * 获取测试网络配置
   * @returns {Object} 网络配置
   */
  getTestNetworkConfig() {
    try {
      if (!this.testConfig || !this.testConfig.network) {
        throw new Error('Network configuration not found');
      }
      return this.testConfig.network;
    } catch (error) {
      logger.error('Failed to get network configuration:', error);
      throw new TestError('Failed to get network configuration', { error });
    }
  }

  /**
   * 生成测试数据
   * @param {string} type 数据类型
   * @param {Object} options 选项
   * @returns {Object} 测试数据
   */
  generateTestData(type, options = {}) {
    try {
      switch (type) {
        case 'property':
          return this._generatePropertyData(options);
        case 'token':
          return this._generateTokenData(options);
        case 'user':
          return this._generateUserData(options);
        default:
          throw new Error(`Unsupported test data type: ${type}`);
      }
    } catch (error) {
      logger.error(`Failed to generate test data of type ${type}:`, error);
      throw new TestError(`Failed to generate test data of type ${type}`, { error });
    }
  }

  /**
   * 生成房产测试数据
   * @private
   * @param {Object} options 选项
   * @returns {Object} 房产数据
   */
  _generatePropertyData(options = {}) {
    return {
      name: options.name || `Test Property ${Date.now()}`,
      location: options.location || TEST_DATA.PROPERTY.LOCATION,
      price: options.price || TEST_DATA.PROPERTY.PRICE,
      size: options.size || TEST_DATA.PROPERTY.SIZE,
      description: options.description || TEST_DATA.PROPERTY.DESCRIPTION,
      features: options.features || TEST_DATA.PROPERTY.FEATURES,
      images: options.images || TEST_DATA.PROPERTY.IMAGES,
      documents: options.documents || TEST_DATA.PROPERTY.DOCUMENTS,
      status: options.status || TEST_DATA.PROPERTY.STATUS
    };
  }

  /**
   * 生成代币测试数据
   * @private
   * @param {Object} options 选项
   * @returns {Object} 代币数据
   */
  _generateTokenData(options = {}) {
    return {
      name: options.name || `Test Token ${Date.now()}`,
      symbol: options.symbol || TEST_DATA.TOKEN.SYMBOL,
      decimals: options.decimals || TEST_DATA.TOKEN.DECIMALS,
      totalSupply: options.totalSupply || TEST_DATA.TOKEN.TOTAL_SUPPLY,
      propertyId: options.propertyId || 'test-property-id',
      price: options.price || TEST_DATA.TOKEN.PRICE,
      status: options.status || TEST_DATA.TOKEN.STATUS
    };
  }

  /**
   * 生成用户测试数据
   * @private
   * @param {Object} options 选项
   * @returns {Object} 用户数据
   */
  _generateUserData(options = {}) {
    return {
      name: options.name || `Test User ${Date.now()}`,
      email: options.email || `test${Date.now()}@example.com`,
      role: options.role || TEST_DATA.USER.ROLE,
      walletAddress: options.walletAddress || '0x' + Date.now().toString(16),
      status: options.status || TEST_DATA.USER.STATUS
    };
  }

  /**
   * 记录测试指标
   * @param {string} name 指标名称
   * @param {number} value 指标值
   * @param {Object} [labels] 标签
   */
  async recordTestMetric(name, value, labels = {}) {
    try {
      await metricsManager.record(name, value, {
        ...labels,
        testEnvironment: process.env.NODE_ENV || 'test'
      });
    } catch (error) {
      logger.error(`Failed to record test metric ${name}:`, error);
    }
  }

  /**
   * 缓存测试数据
   * @param {string} key 缓存键
   * @param {*} value 缓存值
   * @param {number} [ttl] 过期时间(毫秒)
   */
  async cacheTestData(key, value, ttl) {
    try {
      await cacheManager.set(key, value, ttl);
    } catch (error) {
      logger.error(`Failed to cache test data for key ${key}:`, error);
    }
  }

  /**
   * 获取缓存的测试数据
   * @param {string} key 缓存键
   * @returns {*} 缓存值
   */
  async getCachedTestData(key) {
    try {
      return await cacheManager.get(key);
    } catch (error) {
      logger.error(`Failed to get cached test data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 触发测试事件
   * @param {string} eventName 事件名称
   * @param {Object} data 事件数据
   */
  async emitTestEvent(eventName, data) {
    try {
      await eventManager.emit(eventName, {
        ...data,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error(`Failed to emit test event ${eventName}:`, error);
    }
  }
}

const testingUtils = new TestingUtils();

module.exports = testingUtils; 