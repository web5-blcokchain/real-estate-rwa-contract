/**
 * 部署系统模块 - 高级层
 * 
 * 该模块提供系统级部署功能，包括合约系统部署、角色配置等高级功能。
 * 它依赖于核心层(deployment-core.js)和基础层(deployment-state.js)
 * 
 * @module deployment-system
 * @version 1.0.0
 */

const { ethers } = require('hardhat');
const path = require('path');
const logger = require('./logger');
const { deploymentState } = require('./deployment-state');
const deployCore = require('./deployment-core');

/**
 * 部署策略类型
 * @type {Object}
 */
const DEPLOYMENT_STRATEGIES = {
  DIRECT: 'direct',       // 直接部署，不使用代理
  UPGRADEABLE: 'upgradeable', // 可升级部署，使用透明代理
  MINIMAL: 'minimal'      // 最小化部署，只部署核心合约
};

/**
 * 系统部署器类
 * 负责协调整个系统的部署流程
 */
class SystemDeployer {
  /**
   * 创建系统部署器实例
   * @param {Object} config 配置对象
   * @param {string} config.strategy 部署策略
   * @param {boolean} config.force 是否强制重新部署
   * @param {boolean} config.verify 是否验证合约
   * @param {string} config.network 网络名称
   * @param {Object} config.libraries 预先部署的库合约
   * @param {Object} config.options 部署选项
   */
  constructor(config = {}) {
    this.strategy = config.strategy || DEPLOYMENT_STRATEGIES.UPGRADEABLE;
    this.force = config.force || false;
    this.verify = config.verify || false;
    this.network = config.network || 'unknown';
    this.libraries = config.libraries || {};
    this.deployedContracts = {};
    this.options = {
      ...deployCore.DEFAULT_OPTIONS,
      ...(config.options || {}),
      verify: {
        ...deployCore.DEFAULT_OPTIONS.verify,
        ...(config.options?.verify || {}),
        enabled: this.verify
      }
    };
    
    // 合约地址配置
    this.contractAddresses = {};
    this.deploymentRecord = {
      timestamp: new Date().toISOString(),
      strategy: this.strategy,
      network: this.network,
      libraries: {},
      contracts: {}
    };
  }
  
  /**
   * 设置部署账户
   * @param {string} deployer 部署账户地址
   * @returns {SystemDeployer} 当前实例，支持链式调用
   */
  setDeployer(deployer) {
    this.deployer = deployer;
    this.deploymentRecord.deployer = deployer;
    return this;
  }
  
  /**
   * 获取部署账户
   * @returns {string} 部署账户地址
   */
  getDeployer() {
    if (!this.deployer) {
      throw new Error('部署账户未设置');
    }
    return this.deployer;
  }
  
  /**
   * 设置部署策略
   * @param {string} strategy 部署策略
   * @returns {SystemDeployer} 当前实例，支持链式调用
   */
  setStrategy(strategy) {
    if (!Object.values(DEPLOYMENT_STRATEGIES).includes(strategy)) {
      throw new Error(`无效的部署策略: ${strategy}`);
    }
    this.strategy = strategy;
    this.deploymentRecord.strategy = strategy;
    return this;
  }
  
  /**
   * 获取部署策略
   * @returns {string} 部署策略
   */
  getStrategy() {
    return this.strategy;
  }
  
  /**
   * 获取所有已部署合约的地址
   * @returns {Object} 合约地址映射
   */
  getContractAddresses() {
    return {
      ...this.libraries,
      ...this.contractAddresses
    };
  }
  
  /**
   * 获取特定合约的地址
   * @param {string} contractName 合约名称
   * @returns {string|null} 合约地址，如果未部署则返回null
   */
  getContractAddress(contractName) {
    // 标准化合约名称为配置键
    const configKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
    
    // 首先检查本地缓存
    if (this.contractAddresses[configKey]) {
      return this.contractAddresses[configKey];
    }
    
    // 然后检查库合约
    if (this.libraries[contractName]) {
      return this.libraries[contractName];
    }
    
    return null;
  }
  
  /**
   * 部署库合约
   * @param {string[]} libraryNames 库合约名称数组
   * @returns {Promise<Object>} 库合约地址映射
   */
  async deployLibraries(libraryNames) {
    try {
      logger.info('开始部署系统库合约...');
      
      // 准备部署选项
      const deployOptions = {
        force: this.force,
        skipGasEstimation: this.options.skipGasEstimation,
        gasLimitMultiplier: this.options.transaction?.gasLimitMultiplier || 1.5,
        defaultGasLimit: this.options.defaultGasLimit || BigInt(10000000)
      };
      
      // 获取签名者
      const [signer] = await ethers.getSigners();
      if (!signer) {
        throw new Error('无法获取签名者');
      }
      this.setDeployer(signer.address);
      
      // 部署库合约
      const libraries = await deployCore.deployLibraries(
        libraryNames,
        signer,
        deployOptions
      );
      
      // 更新库合约记录 - 确保是字符串地址
      const normalizedLibraries = {};
      for (const [name, address] of Object.entries(libraries)) {
        if (typeof address === 'object' && address !== null) {
          // 如果是复杂对象，尝试提取地址
          if (address.contractAddress) {
            normalizedLibraries[name] = address.contractAddress;
          } else if (typeof address.toString === 'function') {
            normalizedLibraries[name] = address.toString();
          }
        } else {
          // 如果已经是字符串或其他简单类型
          normalizedLibraries[name] = address;
        }
      }
      
      this.libraries = normalizedLibraries;
      
      // 更新部署记录
      this.deploymentRecord.libraries = {
        ...this.deploymentRecord.libraries,
        ...normalizedLibraries
      };
      
      return normalizedLibraries;
    } catch (error) {
      logger.error('部署库合约失败:', error);
      throw error;
    }
  }
  
  /**
   * 部署合约
   * @param {string} contractName 合约名称
   * @param {Array} initArgs 初始化参数
   * @param {Object} options 部署选项
   * @returns {Promise<Object>} 部署结果
   */
  async deployContract(contractName, initArgs = [], options = {}) {
    try {
      // 准备部署选项
      const deployOptions = {
        ...this.options,
        ...options,
        force: this.force || options.force,
        forceRedeploy: this.force || options.forceRedeploy
      };
      
      let result;
      
      // 根据部署策略选择部署方式
      if (this.strategy === DEPLOYMENT_STRATEGIES.DIRECT) {
        // 直接部署
        const Contract = await ethers.getContractFactory(contractName, {
          libraries: this.libraries
        });
        
        result = await deployCore.deployContract(
          Contract,
          contractName,
          initArgs,
          deployOptions
        );
      } else {
        // 检查库合约格式，确保所有值都是字符串
        const normalizedLibraries = {};
        for (const [name, address] of Object.entries(this.libraries)) {
          if (typeof address === 'string') {
            normalizedLibraries[name] = address;
          } else if (typeof address === 'object' && address !== null) {
            // 处理可能的复杂对象，提取实际地址
            if (address.target) {
              normalizedLibraries[name] = address.target;
            } else if (address.contractAddress) {
              normalizedLibraries[name] = address.contractAddress;
            } else if (typeof address.toString === 'function') {
              normalizedLibraries[name] = address.toString();
            }
          }
        }
        
        // 可升级部署
        result = await deployCore.deployUpgradeableContract(
          contractName,
          initArgs,
          normalizedLibraries,
          deployOptions
        );
      }
      
      if (!result.success) {
        throw new Error(`部署 ${contractName} 失败: ${result.error?.message || '未知错误'}`);
      }
      
      // 更新合约地址记录
      const configKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
      const contractAddress = result.proxyAddress || result.contractAddress;
      this.contractAddresses[configKey] = contractAddress;
      
      // 更新部署记录
      this.deploymentRecord.contracts[configKey] = contractAddress;
      
      // 保存合约实例
      this.deployedContracts[contractName] = result.contract;
      
      return result;
    } catch (error) {
      logger.error(`部署 ${contractName} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 保存部署记录
   * @param {Object} options 保存选项
   * @returns {Promise<void>}
   */
  async saveDeploymentRecord(options = {}) {
    await deployCore.saveDeploymentRecord(
      this.deploymentRecord,
      this.network,
      {
        ...this.options.records,
        ...options
      }
    );
  }
  
  /**
   * 配置角色
   * @param {string} roleManagerAddress 角色管理器地址
   * @param {Object} roles 角色配置
   * @returns {Promise<void>}
   */
  async configureRoles(roleManagerAddress, roles) {
    try {
      logger.info('配置系统角色...');
      
      // 获取RoleManager合约实例
      const RoleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
      
      // 配置每个角色
      for (const [role, address] of Object.entries(roles)) {
        if (!address) continue;
        
        logger.info(`设置 ${role} 角色为 ${address}...`);
        
        // 检查是否已经分配
        const currentAddress = await RoleManager.getRoleAddress(role);
        if (currentAddress.toLowerCase() === address.toLowerCase()) {
          logger.info(`${role} 已经设置为 ${address}，跳过`);
          continue;
        }
        
        // 设置角色
        const tx = await RoleManager.setRole(role, address);
        await tx.wait();
        
        logger.info(`${role} 已设置为 ${address}`);
      }
      
      logger.info('角色配置完成');
    } catch (error) {
      logger.error('配置角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 部署完整的合约系统
   * @param {Object} config 部署配置
   * @returns {Promise<Object>} 部署结果
   */
  async deploySystem(config = {}) {
    try {
      logger.info('开始部署合约系统...');
      logger.info(`部署策略: ${this.strategy}`);
      logger.info(`强制重新部署: ${this.force}`);
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 1. 部署库合约
      const libraryNames = config.libraries || ['SystemDeployerLib1', 'SystemDeployerLib2'];
      await this.deployLibraries(libraryNames);
      
      // 2. 部署角色管理器
      const roleManagerResult = await this.deployContract('RoleManager', []);
      const roleManagerAddress = roleManagerResult.proxyAddress || roleManagerResult.contractAddress;
      
      // 3. 部署费用管理器
      const feeManagerResult = await this.deployContract('FeeManager', [roleManagerAddress]);
      const feeManagerAddress = feeManagerResult.proxyAddress || feeManagerResult.contractAddress;
      
      // 4. 部署房产注册表
      const propertyRegistryResult = await this.deployContract('PropertyRegistry', [roleManagerAddress]);
      const propertyRegistryAddress = propertyRegistryResult.proxyAddress || propertyRegistryResult.contractAddress;
      
      // 5. 部署租金分配器
      const rentDistributorResult = await this.deployContract('RentDistributor', [roleManagerAddress, propertyRegistryAddress]);
      const rentDistributorAddress = rentDistributorResult.proxyAddress || rentDistributorResult.contractAddress;
      
      // 6. 部署代币工厂
      const tokenFactoryResult = await this.deployContract('TokenFactory', [
        roleManagerAddress, 
        propertyRegistryAddress,
        ethers.ZeroAddress, // tokenImplementation - 初始时设为零地址，后续可以更新
        rentDistributorAddress
      ]);
      const tokenFactoryAddress = tokenFactoryResult.proxyAddress || tokenFactoryResult.contractAddress;
      
      // 7. 部署赎回管理器
      const redemptionManagerResult = await this.deployContract('RedemptionManager', [roleManagerAddress, propertyRegistryAddress, tokenFactoryAddress]);
      const redemptionManagerAddress = redemptionManagerResult.proxyAddress || redemptionManagerResult.contractAddress;
      
      // 8. 部署市场
      const marketplaceResult = await this.deployContract('Marketplace', [
        roleManagerAddress, 
        feeManagerAddress
      ]);
      const marketplaceAddress = marketplaceResult.proxyAddress || marketplaceResult.contractAddress;
      
      // 9. 部署代币持有者查询
      const tokenHolderQueryResult = await this.deployContract('TokenHolderQuery', [roleManagerAddress]);
      const tokenHolderQueryAddress = tokenHolderQueryResult.proxyAddress || tokenHolderQueryResult.contractAddress;
      
      // 10. 部署房地产系统
      const realEstateSystemResult = await this.deployContract(
        'RealEstateSystem',
        [
          roleManagerAddress,
          feeManagerAddress,
          propertyRegistryAddress,
          tokenFactoryAddress,
          redemptionManagerAddress,
          rentDistributorAddress,
          marketplaceAddress,
          tokenHolderQueryAddress
        ]
      );
      const realEstateSystemAddress = realEstateSystemResult.proxyAddress || realEstateSystemResult.contractAddress;
      
      // 记录结束时间
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // 秒
      
      logger.info(`系统部署完成，用时 ${duration.toFixed(2)} 秒`);
      
      // 保存部署记录
      await this.saveDeploymentRecord();
      
      // 如果提供了角色配置，则配置角色
      if (config.roles) {
        await this.configureRoles(roleManagerAddress, config.roles);
      }
      
      // 返回部署结果
      return {
        success: true,
        duration,
        contractAddresses: this.getContractAddresses(),
        deploymentRecord: this.deploymentRecord
      };
    } catch (error) {
      logger.error('部署系统失败:', error);
      
      // 保存部署记录，标记为失败
      this.deploymentRecord.success = false;
      this.deploymentRecord.error = {
        message: error.message,
        stack: error.stack
      };
      
      try {
        await this.saveDeploymentRecord();
      } catch (saveError) {
        logger.error('保存部署记录失败:', saveError);
      }
      
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        },
        contractAddresses: this.getContractAddresses(),
        deploymentRecord: this.deploymentRecord
      };
    }
  }
  
  /**
   * 加载已部署的合约
   * @returns {Promise<Object>} 合约实例映射
   */
  async loadDeployedContracts() {
    try {
      logger.info('加载已部署的合约...');
      
      const contractMapping = {
        'roleManager': 'RoleManager',
        'feeManager': 'FeeManager',
        'propertyRegistry': 'PropertyRegistry',
        'rentDistributor': 'RentDistributor',
        'tokenFactory': 'TokenFactory',
        'redemptionManager': 'RedemptionManager',
        'marketplace': 'Marketplace',
        'tokenHolderQuery': 'TokenHolderQuery',
        'realEstateSystem': 'RealEstateSystem'
      };
      
      const contracts = {};
      
      // 加载每个合约
      for (const [configKey, contractName] of Object.entries(contractMapping)) {
        const address = await deploymentState.getContractAddress(configKey);
        
        if (address) {
          logger.info(`加载合约 ${contractName} (${address})...`);
          contracts[configKey] = await ethers.getContractAt(contractName, address);
        } else {
          logger.warn(`合约 ${contractName} 未部署，跳过加载`);
        }
      }
      
      // 更新合约地址记录
      for (const [key, contract] of Object.entries(contracts)) {
        if (contract) {
          const address = await contract.getAddress();
          this.contractAddresses[key] = address;
        }
      }
      
      logger.info('合约加载完成');
      
      return contracts;
    } catch (error) {
      logger.error('加载合约失败:', error);
      throw error;
    }
  }
}

module.exports = {
  SystemDeployer,
  DEPLOYMENT_STRATEGIES
}; 