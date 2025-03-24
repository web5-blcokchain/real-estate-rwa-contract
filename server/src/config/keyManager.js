const { ethers } = require('ethers');
const logger = require('../utils/logger');

/**
 * 密钥管理器
 * 管理不同操作权限对应的以太坊账户私钥
 */
class KeyManager {
  constructor() {
    // 私钥映射 - 角色到私钥的映射
    this.keys = {
      // 管理员私钥（用于管理操作，如批准房产、更新代币实现等）
      admin: process.env.ADMIN_PRIVATE_KEY || '',
      
      // 操作员私钥（用于日常操作，如注册房产、添加白名单等）
      operator: process.env.OPERATOR_PRIVATE_KEY || '',
      
      // 财务私钥（用于财务操作，如分配租金、处理赎回等）
      finance: process.env.FINANCE_PRIVATE_KEY || '',
      
      // 紧急恢复私钥（用于紧急操作，如紧急提款）
      emergency: process.env.EMERGENCY_PRIVATE_KEY || ''
    };
    
    // 如果未设置特定角色的私钥，则使用管理员私钥作为后备
    if (!this.keys.operator) this.keys.operator = this.keys.admin;
    if (!this.keys.finance) this.keys.finance = this.keys.admin;
    if (!this.keys.emergency) this.keys.emergency = this.keys.admin;
    
    // 验证是否存在有效的管理员私钥
    if (!this.keys.admin) {
      logger.warn('未设置管理员私钥，将使用默认私钥（仅供开发使用）');
      this.keys.admin = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // 仅用于开发
      this.keys.operator = this.keys.admin;
      this.keys.finance = this.keys.admin;
      this.keys.emergency = this.keys.admin;
    }
    
    // 私钥地址缓存
    this.addressCache = {};
  }
  
  /**
   * 获取指定角色的私钥
   * @param {string} role 角色（admin, operator, finance, emergency）
   * @returns {string} 私钥
   */
  getPrivateKey(role = 'admin') {
    const key = this.keys[role.toLowerCase()];
    if (!key) {
      logger.warn(`未找到角色 "${role}" 的私钥，将使用管理员私钥`);
      return this.keys.admin;
    }
    return key;
  }
  
  /**
   * 获取指定角色的签名者
   * @param {string} role 角色
   * @param {ethers.providers.Provider} provider 以太坊提供者
   * @returns {ethers.Wallet} 签名者钱包
   */
  getSigner(role = 'admin', provider) {
    const privateKey = this.getPrivateKey(role);
    return new ethers.Wallet(privateKey, provider);
  }
  
  /**
   * 获取指定角色的地址
   * @param {string} role 角色
   * @returns {string} 地址
   */
  getAddress(role = 'admin') {
    // 首先尝试从缓存获取
    if (this.addressCache[role]) {
      return this.addressCache[role];
    }
    
    const privateKey = this.getPrivateKey(role);
    try {
      const wallet = new ethers.Wallet(privateKey);
      const address = wallet.address;
      
      // 缓存地址
      this.addressCache[role] = address;
      
      return address;
    } catch (error) {
      logger.error(`无法获取角色 "${role}" 的地址: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取可用的角色列表
   * @returns {string[]} 角色列表
   */
  getAvailableRoles() {
    return Object.keys(this.keys);
  }
  
  /**
   * 检查私钥是否有效
   * @param {string} privateKey 私钥
   * @returns {boolean} 是否有效
   */
  static isValidPrivateKey(privateKey) {
    try {
      new ethers.Wallet(privateKey);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// 导出单例实例
const keyManager = new KeyManager();
module.exports = keyManager; 