const BaseContractService = require('../../shared/services/BaseContractService');
const { configManager } = require('../../shared/config');
const logger = require('../../shared/utils/logger');

/**
 * 前端测试合约服务类
 * 继承自BaseContractService，提供测试特定的功能
 */
class FrontendTestContractService extends BaseContractService {
  constructor() {
    super('FrontendTestContract', 'frontendTestContract');
  }

  /**
   * 初始化服务
   */
  async initialize() {
    try {
      // 初始化配置
      await configManager.initialize();
      
      // 设置签名者
      const privateKeys = configManager.getPrivateKeys();
      this.setSigner('admin', privateKeys.admin);
      this.setSigner('operator', privateKeys.operator);
      this.setSigner('user', privateKeys.user);
      
      logger.info('FrontendTestContractService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FrontendTestContractService:', error);
      throw error;
    }
  }

  /**
   * 测试合约方法
   * @param {string} methodName 方法名称
   * @param {Array} args 方法参数
   * @param {string} [role='admin'] 操作角色
   * @returns {Promise<any>} 方法返回值
   */
  async testMethod(methodName, args = [], role = 'admin') {
    try {
      const contract = this.getContractWithSigner(role);
      logger.info(`Testing method ${methodName} with args:`, args);
      
      const result = await contract[methodName](...args);
      logger.info(`Test method ${methodName} completed successfully`);
      
      return result;
    } catch (error) {
      logger.error(`Test method ${methodName} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取合约实例
   * @param {string} contractName 合约名称
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} 合约实例
   */
  getContract(contractName, role) {
    return this.getContractWithSigner(role);
  }
}

module.exports = FrontendTestContractService; 