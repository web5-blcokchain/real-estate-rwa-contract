const { getContractAddresses } = require('../../shared/config/contracts');
const { networkConfig } = require('../../shared/config');
const { ethers } = require('ethers');
const { loadConfig: loadSharedConfig } = require('../../shared/config');
const { getTestConfig } = require('./testConfig');
const { getTestAccounts } = require('./testAccounts');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// 配置缓存
let configCache = null;

/**
 * 加载配置
 * @returns {Promise<Object>} 配置对象
 */
async function loadConfig() {
  if (configCache) {
    console.log('使用缓存的配置');
    return configCache;
  }

  console.log('开始加载配置...');
  
  try {
    // 加载共享配置
    console.log('加载共享配置...');
    const sharedConfig = await loadSharedConfig();
    console.log('共享配置加载完成');

    // 加载测试配置
    console.log('加载测试配置...');
    const testConfig = await getTestConfig();
    console.log('测试配置加载完成');

    // 加载测试账户
    console.log('加载测试账户...');
    const testAccounts = await getTestAccounts();
    console.log('测试账户加载完成');

    // 检查网络配置
    console.log('检查网络配置...');
    console.log('网络配置:', networkConfig);

    // 使用 ethers 的网络配置
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const networkInfo = await provider.getNetwork();
    console.log('网络信息:', {
      name: networkInfo.name,
      chainId: networkInfo.chainId
    });

    // 合并配置
    const config = {
      ...sharedConfig,
      testConfig,
      testAccounts,
      networkConfig: {
        ...networkConfig,
        networkInfo
      }
    };

    // 缓存配置
    configCache = config;

    console.log('配置加载完成');
    return config;
  } catch (error) {
    console.error('加载配置时发生错误:', error);
    console.error('错误堆栈:', error.stack);
    throw error;
  }
}

/**
 * 测试配置管理器
 */
class TestConfigManager {
  constructor() {
    this.config = null;
    this.accounts = null;
    this.initialized = false;
  }
  
  /**
   * 初始化测试配置
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (!this.initialized) {
        // 加载测试配置
        this.config = await getTestConfig();
        
        // 加载测试账户
        this.accounts = await getTestAccounts();
        
        this.initialized = true;
        console.log('测试配置初始化完成');
      }
    } catch (error) {
      console.error('初始化测试配置失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取测试配置
   * @returns {Object} 测试配置
   */
  getConfig() {
    if (!this.initialized) {
      throw new Error('测试配置未初始化');
    }
    return this.config;
  }
  
  /**
   * 获取测试账户
   * @returns {Object} 测试账户
   */
  getAccounts() {
    if (!this.initialized) {
      throw new Error('测试账户未初始化');
    }
    return this.accounts;
  }
  
  /**
   * 获取测试超时时间
   * @returns {number} 超时时间（毫秒）
   */
  getTimeout() {
    return this.getConfig().timeout;
  }
  
  /**
   * 获取测试重试次数
   * @returns {number} 重试次数
   */
  getRetries() {
    return this.getConfig().retries;
  }
}

// 创建单例实例
const testConfigManager = new TestConfigManager();

module.exports = {
  loadConfig,
  testConfigManager
}; 