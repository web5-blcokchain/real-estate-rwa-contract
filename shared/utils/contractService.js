const { ethers } = require('ethers');
const { getProvider, getSigner } = require('./web3Provider');
const { getAbi } = require('./getAbis');
const { logger } = require('./logger');

/**
 * 合约服务类
 * 统一管理合约实例的创建和调用
 */
class ContractService {
  constructor() {
    this.contractInstances = {};
    this.signers = {};
    this.provider = null;
    this.initialized = false;
  }

  /**
   * 初始化合约服务
   * @param {Object} contractAddresses 合约地址配置
   * @param {Object} [signerConfig] 签名者配置
   */
  initialize(contractAddresses, signerConfig = {}) {
    try {
      this.provider = getProvider();
      this.contractAddresses = contractAddresses;
      
      // 如果提供了签名者配置，则初始化签名者
      if (signerConfig && Object.keys(signerConfig).length > 0) {
        Object.entries(signerConfig).forEach(([role, privateKey]) => {
          if (privateKey) {
            this.signers[role] = getSigner(privateKey);
          }
        });
        logger.info(`已初始化 ${Object.keys(this.signers).length} 个签名者`);
      }
      
      this.initialized = true;
      logger.info('合约服务初始化完成');
      return true;
    } catch (error) {
      logger.error(`合约服务初始化失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 检查是否已初始化
   * @private
   */
  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('合约服务尚未初始化，请先调用 initialize() 方法');
    }
  }

  /**
   * 获取合约实例
   * @param {string} contractName 合约名称
   * @param {string} [address] 可选的合约地址，默认使用配置中的地址
   * @param {string} [role] 可选的角色，用于获取带签名者的合约
   * @returns {ethers.Contract} 合约实例
   */
  getContract(contractName, address, role) {
    this._checkInitialized();
    
    // 创建合约实例的缓存键
    const cacheKey = `${contractName}-${address || 'default'}-${role || 'default'}`;
    
    // 如果已缓存，则返回缓存的实例
    if (this.contractInstances[cacheKey]) {
      return this.contractInstances[cacheKey];
    }
    
    // 获取合约地址
    const contractAddress = address || this.contractAddresses[contractName.charAt(0).toLowerCase() + contractName.slice(1)];
    
    if (!contractAddress) {
      throw new Error(`未找到 ${contractName} 合约地址`);
    }
    
    try {
      // 获取合约ABI
      const abi = getAbi(contractName);
      
      // 创建合约实例
      let contract;
      if (role && this.signers[role]) {
        contract = new ethers.Contract(contractAddress, abi, this.signers[role]);
      } else {
        contract = new ethers.Contract(contractAddress, abi, this.provider);
      }
      
      // 缓存合约实例
      this.contractInstances[cacheKey] = contract;
      
      return contract;
    } catch (error) {
      logger.error(`获取合约 ${contractName} 实例失败: ${error.message}`);
      throw new Error(`获取合约 ${contractName} 实例失败: ${error.message}`);
    }
  }

  /**
   * 清除合约实例缓存
   */
  clearContractCache() {
    this.contractInstances = {};
    logger.info('已清除合约实例缓存');
  }

  /**
   * 添加或更新签名者
   * @param {string} role 角色名称
   * @param {string} privateKey 私钥
   */
  addSigner(role, privateKey) {
    if (!role || !privateKey) {
      throw new Error('角色名称和私钥不能为空');
    }
    
    try {
      this.signers[role] = getSigner(privateKey);
      logger.info(`已添加或更新签名者 ${role}`);
    } catch (error) {
      logger.error(`添加签名者失败: ${error.message}`);
      throw new Error(`添加签名者失败: ${error.message}`);
    }
  }

  /**
   * 获取RoleManager合约
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} RoleManager合约实例
   */
  getRoleManager(role) {
    return this.getContract('RoleManager', null, role);
  }

  /**
   * 获取PropertyRegistry合约
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} PropertyRegistry合约实例
   */
  getPropertyRegistry(role) {
    return this.getContract('PropertyRegistry', null, role);
  }

  /**
   * 获取TokenFactory合约
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} TokenFactory合约实例
   */
  getTokenFactory(role) {
    return this.getContract('TokenFactory', null, role);
  }

  /**
   * 获取RealEstateToken合约
   * @param {string} tokenAddress 代币合约地址
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} RealEstateToken合约实例
   */
  getToken(tokenAddress, role) {
    return this.getContract('RealEstateToken', tokenAddress, role);
  }

  /**
   * 获取RedemptionManager合约
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} RedemptionManager合约实例
   */
  getRedemptionManager(role) {
    return this.getContract('RedemptionManager', null, role);
  }

  /**
   * 获取RentDistributor合约
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} RentDistributor合约实例
   */
  getRentDistributor(role) {
    return this.getContract('RentDistributor', null, role);
  }

  /**
   * 获取Marketplace合约
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} Marketplace合约实例
   */
  getMarketplace(role) {
    return this.getContract('Marketplace', null, role);
  }

  /**
   * 获取FeeManager合约
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} FeeManager合约实例
   */
  getFeeManager(role) {
    return this.getContract('FeeManager', null, role);
  }

  /**
   * 获取RealEstateSystem合约
   * @param {string} [role] 可选的角色
   * @returns {ethers.Contract} RealEstateSystem合约实例
   */
  getRealEstateSystem(role) {
    return this.getContract('RealEstateSystem', null, role);
  }
}

// 导出单例实例
module.exports = new ContractService(); 