/**
 * 统一部署工具
 * 基于配置实现不同部署策略
 */
const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');
const { DeploymentStrategy } = require('../config/deployment');
const logger = require('./logger');
const { transaction } = require('./transaction');

/**
 * 部署管理器类
 */
class Deployer {
  /**
   * 构造函数
   * @param {Object} config 部署配置
   * @param {Object} signer 签名者
   */
  constructor(config, signer) {
    this.config = config;
    this.signer = signer;
    this.deployedContracts = {};
    this.libraryAddresses = {};
    this.deploymentPath = path.join(__dirname, '../../deployments');
    this.ensureDeploymentDir();
  }

  /**
   * 确保部署目录存在
   */
  ensureDeploymentDir() {
    if (!fs.existsSync(this.deploymentPath)) {
      fs.mkdirSync(this.deploymentPath, { recursive: true });
    }
  }

  /**
   * 执行部署
   * @returns {Object} 已部署合约的地址映射
   */
  async deploy() {
    try {
      // 1. 获取网络信息
      const network = await ethers.provider.getNetwork();
      const chainId = network.chainId;
      const networkName = network.name !== 'unknown' ? network.name : `chain-${chainId}`;
      
      logger.info(`开始部署 (策略: ${this.config.strategy})`);
      logger.info(`部署网络: ${networkName} (Chain ID: ${chainId})`);
      logger.info(`部署账户: ${this.signer.address}`);
      
      // 2. 检查账户余额
      const balance = await ethers.provider.getBalance(this.signer.address);
      logger.info(`账户余额: ${ethers.formatEther(balance)} ETH`);
      
      if (balance < ethers.parseEther('0.1')) {
        logger.warn(`警告: 账户余额较低 (${ethers.formatEther(balance)} ETH), 可能无法完成部署`);
      }
      
      // 3. 部署库合约（如果有）
      if (this.config.libraries && this.config.libraries.length > 0) {
        await this.deployLibraries();
      }
      
      // 4. 根据选择的策略部署合约
      switch (this.config.strategy) {
        case DeploymentStrategy.DIRECT:
          await this.deployDirect();
          break;
        case DeploymentStrategy.UPGRADEABLE:
          await this.deployUpgradeable();
          break;
        case DeploymentStrategy.MINIMAL:
          await this.deployMinimal();
          break;
        default:
          throw new Error(`不支持的部署策略: ${this.config.strategy}`);
      }
      
      // 5. 设置角色权限
      await this.setupRoles();
      
      // 6. 保存部署记录
      this.saveDeploymentRecord(networkName, chainId);
      
      return this.deployedContracts;
    } catch (error) {
      logger.error('部署失败:', error);
      throw error;
    }
  }

  /**
   * 部署库合约
   */
  async deployLibraries() {
    logger.info('部署库合约...');
    
    for (const libName of this.config.libraries) {
      try {
        logger.info(`部署库合约 ${libName}...`);
        
        // 创建合约工厂
        const LibraryFactory = await ethers.getContractFactory(libName, this.signer);
        
        // 估算 gas
        const estimatedGas = await ethers.provider.estimateGas({
          from: this.signer.address,
          data: LibraryFactory.bytecode
        });
        
        // 设置 gas 限制为估算值的倍数
        // 首先将乘数转为整数，避免BigInt转换错误
        const multiplier = Math.floor(this.config.options.transaction.gasLimitMultiplier * 100);
        const gasLimit = (estimatedGas * BigInt(multiplier)) / BigInt(100);
        
        logger.info(`${libName} 预估 gas: ${estimatedGas}`);
        logger.info(`${libName} 设置 gas 限制: ${gasLimit}`);
        
        // 部署库合约
        const library = await LibraryFactory.deploy({ gasLimit });
        await library.waitForDeployment();
        
        const libraryAddress = await library.getAddress();
        this.libraryAddresses[libName] = libraryAddress;
        
        logger.info(`${libName} 已部署: ${libraryAddress}`);
      } catch (error) {
        logger.error(`部署库合约 ${libName} 失败:`, error);
        throw error;
      }
    }
  }

  /**
   * 直接部署策略（非代理）
   */
  async deployDirect() {
    logger.info('使用直接部署策略...');
    
    // 按照配置的顺序部署合约
    for (const contractName of this.config.deploymentOrder) {
      await this.deployDirectContract(contractName);
    }
  }

  /**
   * 可升级部署策略（UUPS代理）
   */
  async deployUpgradeable() {
    logger.info('使用可升级部署策略...');
    
    // 按照配置的顺序部署合约
    for (const contractName of this.config.deploymentOrder) {
      await this.deployUpgradeableContract(contractName);
    }
  }

  /**
   * 最小化部署策略（测试用）
   */
  async deployMinimal() {
    logger.info('使用最小化部署策略...');
    
    // 只部署必要合约
    const essentialContracts = [
      'RoleManager',
      'PropertyRegistry',
      'TokenFactory',
      'RealEstateSystem'
    ];
    
    for (const contractName of essentialContracts) {
      if (this.config.deploymentOrder.includes(contractName)) {
        await this.deployUpgradeableContract(contractName);
      }
    }
  }

  /**
   * 部署直接合约（非代理）
   * @param {string} contractName 合约名称
   */
  async deployDirectContract(contractName) {
    logger.info(`部署合约 ${contractName}...`);
    
    try {
      // 准备合约工厂
      const factory = await this.prepareContractFactory(contractName);
      
      // 获取初始化参数
      const initParams = this.getInitializeParams(contractName);
      
      // 添加重试逻辑
      const maxRetries = this.config.options.retry.maxRetries;
      let retries = 0;
      let contract = null;
      
      while (retries <= maxRetries) {
        try {
          // 部署合约
          contract = await factory.deploy(...initParams);
          await contract.waitForDeployment();
          break;
        } catch (error) {
          retries++;
          
          if (retries > maxRetries) {
            throw error;
          }
          
          const delay = this.config.options.retry.initialDelayMs * Math.pow(this.config.options.retry.backoffFactor, retries - 1);
          logger.warn(`部署 ${contractName} 失败，将在 ${delay/1000} 秒后重试 (${retries}/${maxRetries})...`);
          logger.warn(`错误: ${error.message}`);
          
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      const contractAddress = await contract.getAddress();
      this.deployedContracts[contractName] = contractAddress;
      
      logger.info(`${contractName} 已部署: ${contractAddress}`);
      return contract;
      
    } catch (error) {
      logger.error(`部署 ${contractName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 部署可升级合约（UUPS代理）
   * @param {string} contractName 合约名称
   */
  async deployUpgradeableContract(contractName) {
    logger.info(`部署可升级合约 ${contractName}...`);
    
    try {
      // 准备合约工厂
      const factory = await this.prepareContractFactory(contractName);
      
      // 获取初始化参数
      const initParams = this.getInitializeParams(contractName);
      
      // 添加重试逻辑
      const maxRetries = this.config.options.retry.maxRetries;
      let retries = 0;
      let proxy = null;
      
      while (retries <= maxRetries) {
        try {
          // 部署可升级合约 (使用UUPS模式)
          proxy = await upgrades.deployProxy(
            factory, 
            initParams, 
            { 
              kind: 'uups',
              initializer: 'initialize',
              unsafeAllow: ['constructor', 'delegatecall']
            }
          );
          
          // 等待部署确认
          await proxy.waitForDeployment();
          break;
        } catch (error) {
          retries++;
          
          if (retries > maxRetries) {
            throw error;
          }
          
          const delay = this.config.options.retry.initialDelayMs * Math.pow(this.config.options.retry.backoffFactor, retries - 1);
          logger.warn(`部署 ${contractName} 失败，将在 ${delay/1000} 秒后重试 (${retries}/${maxRetries})...`);
          logger.warn(`错误: ${error.message}`);
          
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      const proxyAddress = await proxy.getAddress();
      this.deployedContracts[contractName] = proxyAddress;
      
      // 获取实现合约地址
      const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      
      logger.info(`${contractName} 代理地址: ${proxyAddress}`);
      logger.info(`${contractName} 实现合约地址: ${implementationAddress}`);
      
      return { proxy, implementation: implementationAddress };
      
    } catch (error) {
      logger.error(`部署 ${contractName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 准备合约工厂
   * @param {string} contractName 合约名称
   * @returns {ContractFactory} 合约工厂
   */
  async prepareContractFactory(contractName) {
    // 修改库链接逻辑，只有在特定合约需要库时才链接库
    // 检查此合约是否需要链接库
    if (contractName === 'SystemDeployer' && Object.keys(this.libraryAddresses).length > 0) {
      return await ethers.getContractFactory(
        contractName,
        {
          signer: this.signer,
          libraries: this.libraryAddresses
        }
      );
    } else {
      return await ethers.getContractFactory(contractName, this.signer);
    }
  }

  /**
   * 获取合约初始化参数
   * @param {string} contractName 合约名称
   * @returns {Array} 初始化参数数组
   */
  getInitializeParams(contractName) {
    const paramFn = this.config.initializeParams[contractName];
    
    if (typeof paramFn === 'function') {
      return paramFn(this.deployedContracts);
    } else if (Array.isArray(paramFn)) {
      return paramFn;
    } else {
      return [];
    }
  }

  /**
   * 设置角色权限
   */
  async setupRoles() {
    if (!this.deployedContracts.RoleManager) {
      logger.warn('未找到RoleManager合约地址，跳过角色设置');
      return;
    }
    
    logger.info('设置角色权限...');
    
    try {
      // 获取RoleManager合约实例
      const roleManager = await ethers.getContractAt('RoleManager', this.deployedContracts.RoleManager, this.signer);
      
      // 检查和授予默认管理员角色
      const DEFAULT_ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
      logger.info(`检查默认管理员角色 (${DEFAULT_ADMIN_ROLE})...`);
      
      // 检查部署者是否已经是管理员
      const hasDefaultAdmin = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, this.signer.address);
      
      if (!hasDefaultAdmin && this.config.autoGrantRoles.DEFAULT_ADMIN_ROLE) {
        logger.info('使用紧急恢复功能授予管理员权限...');
        await transaction.executeTransaction(roleManager, 'emergencyRecoverAdmin', [], {
          operation: '紧急恢复管理员权限',
          estimateGas: true,
          safetyMargin: this.config.options.transaction.gasLimitMultiplier - 1,
          waitConfirmations: this.config.options.transaction.waitConfirmations
        });
        logger.info('管理员权限恢复成功');
      } else if (hasDefaultAdmin) {
        logger.info('部署者已拥有DEFAULT_ADMIN_ROLE');
      }
      
      // 检查和授予其他角色
      const roles = [
        { name: 'PROPERTY_MANAGER', method: 'PROPERTY_MANAGER' },
        { name: 'TOKEN_MANAGER', method: 'TOKEN_MANAGER' },
        { name: 'FEE_MANAGER', method: 'FEE_MANAGER' },
        { name: 'RENT_MANAGER', method: 'RENT_MANAGER' }
      ];
      
      for (const role of roles) {
        if (this.config.autoGrantRoles[`${role.name}_ROLE`]) {
          try {
            const roleId = await roleManager[role.method]();
            logger.info(`检查 ${role.name} 角色 (${roleId})...`);
            
            const hasRole = await roleManager.hasRole(roleId, this.signer.address);
            
            if (!hasRole) {
              logger.info(`授予 ${role.name} 角色...`);
              await transaction.executeTransaction(roleManager, 'grantRole', [roleId, this.signer.address], {
                operation: `授予 ${role.name} 角色`,
                estimateGas: true,
                safetyMargin: this.config.options.transaction.gasLimitMultiplier - 1,
                waitConfirmations: this.config.options.transaction.waitConfirmations
              });
              logger.info(`${role.name} 角色授权成功`);
            } else {
              logger.info(`部署者已拥有 ${role.name} 角色`);
            }
          } catch (error) {
            logger.warn(`${role.name} 角色授权失败: ${error.message}`);
          }
        }
      }
    } catch (error) {
      logger.error('设置角色权限失败:', error);
      logger.warn('继续执行其他步骤...');
    }
  }

  /**
   * 保存部署记录
   * @param {string} networkName 网络名称
   * @param {BigInt} chainId 链ID
   */
  saveDeploymentRecord(networkName, chainId) {
    if (!this.config.options.records.saveState) {
      logger.info('跳过保存部署记录');
      return;
    }
    
    logger.info('保存部署记录...');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    // 创建部署记录对象
    const deploymentData = {
      network: networkName,
      chainId: chainId.toString(),
      timestamp: timestamp,
      deployer: this.signer.address,
      strategy: this.config.strategy,
      contracts: this.deployedContracts
    };
    
    // 为BigInt特殊处理的replacer
    const replacer = (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };
    
    // 保存部署记录
    const deploymentFile = path.join(this.deploymentPath, `${networkName}-${timestamp}.json`);
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify(deploymentData, replacer, 2)
    );
    
    // 更新最新部署记录
    const latestDeploymentFile = path.join(this.deploymentPath, `${networkName}-latest.json`);
    fs.writeFileSync(
      latestDeploymentFile,
      JSON.stringify(deploymentData, replacer, 2)
    );
    
    logger.info(`部署记录已保存到: ${deploymentFile}`);
  }
}

module.exports = {
  Deployer
}; 