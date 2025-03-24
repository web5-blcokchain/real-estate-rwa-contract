const { getSystemContract, sendTransaction, callContractMethod } = require('../utils/blockchain');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * 角色管理服务
 * 封装RoleManager合约的操作
 */
class RoleManagerService {
  /**
   * 获取RoleManager合约实例
   * @param {boolean} [withSigner=true] 是否使用签名者
   * @returns {ethers.Contract} 合约实例
   */
  static getContract(withSigner = true) {
    return getSystemContract('RoleManager', withSigner);
  }

  /**
   * 授予角色
   * @param {string} role 角色常量
   * @param {string} account 账户地址
   * @returns {Promise<object>} 交易收据
   */
  static async grantRole(role, account) {
    try {
      logger.info(`Granting role ${role} to account ${account}`);
      const contract = this.getContract();
      return await sendTransaction(contract, 'grantRole', [role, account]);
    } catch (error) {
      logger.error(`Failed to grant role: ${error.message}`);
      throw ApiError.contractError(`Failed to grant role: ${error.message}`);
    }
  }

  /**
   * 撤销角色
   * @param {string} role 角色常量
   * @param {string} account 账户地址
   * @returns {Promise<object>} 交易收据
   */
  static async revokeRole(role, account) {
    try {
      logger.info(`Revoking role ${role} from account ${account}`);
      const contract = this.getContract();
      return await sendTransaction(contract, 'revokeRole', [role, account]);
    } catch (error) {
      logger.error(`Failed to revoke role: ${error.message}`);
      throw ApiError.contractError(`Failed to revoke role: ${error.message}`);
    }
  }

  /**
   * 检查账户是否有特定角色
   * @param {string} role 角色常量
   * @param {string} account 账户地址
   * @returns {Promise<boolean>} 是否有该角色
   */
  static async hasRole(role, account) {
    try {
      const contract = this.getContract(false);
      return await callContractMethod(contract, 'hasRole', [role, account]);
    } catch (error) {
      logger.error(`Failed to check role: ${error.message}`);
      throw ApiError.contractError(`Failed to check role: ${error.message}`);
    }
  }

  /**
   * 获取角色管理员
   * @param {string} role 角色常量
   * @returns {Promise<string>} 管理员角色
   */
  static async getRoleAdmin(role) {
    try {
      const contract = this.getContract(false);
      return await callContractMethod(contract, 'getRoleAdmin', [role]);
    } catch (error) {
      logger.error(`Failed to get role admin: ${error.message}`);
      throw ApiError.contractError(`Failed to get role admin: ${error.message}`);
    }
  }

  /**
   * 获取超级管理员角色常量
   * @returns {Promise<string>} SUPER_ADMIN角色常量
   */
  static async getSuperAdminRole() {
    try {
      const contract = this.getContract(false);
      return await callContractMethod(contract, 'SUPER_ADMIN', []);
    } catch (error) {
      logger.error(`Failed to get SUPER_ADMIN role: ${error.message}`);
      throw ApiError.contractError(`Failed to get SUPER_ADMIN role: ${error.message}`);
    }
  }

  /**
   * 获取房产管理员角色常量
   * @returns {Promise<string>} PROPERTY_MANAGER角色常量
   */
  static async getPropertyManagerRole() {
    try {
      const contract = this.getContract(false);
      return await callContractMethod(contract, 'PROPERTY_MANAGER', []);
    } catch (error) {
      logger.error(`Failed to get PROPERTY_MANAGER role: ${error.message}`);
      throw ApiError.contractError(`Failed to get PROPERTY_MANAGER role: ${error.message}`);
    }
  }

  /**
   * 获取费用收集者角色常量
   * @returns {Promise<string>} FEE_COLLECTOR角色常量
   */
  static async getFeeCollectorRole() {
    try {
      const contract = this.getContract(false);
      return await callContractMethod(contract, 'FEE_COLLECTOR', []);
    } catch (error) {
      logger.error(`Failed to get FEE_COLLECTOR role: ${error.message}`);
      throw ApiError.contractError(`Failed to get FEE_COLLECTOR role: ${error.message}`);
    }
  }

  /**
   * 获取账户所拥有的所有角色
   * @param {string} account 账户地址
   * @returns {Promise<Array<string>>} 角色列表
   */
  static async getAccountRoles(account) {
    try {
      // 获取所有角色常量
      const superAdminRole = await this.getSuperAdminRole();
      const propertyManagerRole = await this.getPropertyManagerRole();
      const feeCollectorRole = await this.getFeeCollectorRole();
      
      // 获取账户在每个角色上的状态
      const [hasSuperAdmin, hasPropertyManager, hasFeeCollector] = await Promise.all([
        this.hasRole(superAdminRole, account),
        this.hasRole(propertyManagerRole, account),
        this.hasRole(feeCollectorRole, account)
      ]);
      
      // 构建结果对象
      const roles = [];
      if (hasSuperAdmin) roles.push('SUPER_ADMIN');
      if (hasPropertyManager) roles.push('PROPERTY_MANAGER');
      if (hasFeeCollector) roles.push('FEE_COLLECTOR');
      
      return roles;
    } catch (error) {
      logger.error(`Failed to get account roles: ${error.message}`);
      throw ApiError.contractError(`Failed to get account roles: ${error.message}`);
    }
  }
  
  /**
   * 获取合约当前版本
   * @returns {Promise<number>} 版本号
   */
  static async getVersion() {
    try {
      const contract = this.getContract(false);
      return await callContractMethod(contract, 'version', []);
    } catch (error) {
      logger.error(`Failed to get version: ${error.message}`);
      throw ApiError.contractError(`Failed to get version: ${error.message}`);
    }
  }
}

module.exports = RoleManagerService; 