/**
 * 合约服务模块
 * 处理所有与智能合约交互的核心功能
 */
const { ethers } = require('ethers');
const { configManager } = require('../config');
const logger = require('./logger');
const { getAbi, getContractAddresses } = require('../config/contracts');
const deploymentState = require('../../deploy-state.json');

// 合约实例缓存
const contractInstances = {};

/**
 * 合约服务类
 * 提供合约实例创建和交互的核心功能
 */
class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.initialized = false;
    this.network = null;
  }

  /**
   * 初始化合约服务
   * @param {Object} options 初始化选项
   * @param {boolean} options.useDefaultSigner 是否使用默认签名者
   * @returns {Promise<void>}
   */
  async initialize(options = { useDefaultSigner: true }) {
    if (this.initialized) {
      logger.info('Contract service already initialized');
      return;
    }

    try {
      if (!configManager.isInitialized()) {
        logger.info('Initializing configuration manager...');
        await configManager.initialize();
      }

      // 获取网络配置
      const network = configManager.getNetworkConfig();
      this.network = network;

      // 初始化provider (使用ethers v6语法)
      this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
      
      const networkInfo = await this.provider.getNetwork();
      logger.info(`Connected to network: ${networkInfo.name} (chainId: ${networkInfo.chainId})`);

      // 初始化signer
      if (options.useDefaultSigner) {
        try {
          const privateKey = configManager.getPrivateKey('operator');
          if (privateKey) {
            this.signer = new ethers.Wallet(privateKey, this.provider);
            const address = await this.signer.getAddress();
            logger.info(`Using operator wallet with address: ${address}`);
          } else {
            logger.warn('No operator private key available. Running in read-only mode');
            this.signer = null;
          }
        } catch (error) {
          logger.warn(`Failed to initialize signer: ${error.message}. Running in read-only mode`);
          this.signer = null;
        }
      }

      this.initialized = true;
      logger.info('Contract service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize contract service:', error);
      throw new Error(`Contract service initialization failed: ${error.message}`);
    }
  }

  /**
   * 获取合约实例
   * @param {string} contractName 合约名称
   * @param {string} contractAddress 合约地址
   * @param {boolean} useSigner 是否使用签名者
   * @returns {ethers.Contract} 合约实例
   */
  async getContract(contractName, contractAddress, useSigner = true) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `${contractName}_${contractAddress}`;

    // 如果缓存中已有实例，直接返回
    if (contractInstances[cacheKey]) {
      return contractInstances[cacheKey];
    }

    try {
      // 从配置中获取ABI
      const abi = getAbi(contractName);
      if (!abi) {
        throw new Error(`ABI not found for contract: ${contractName}`);
      }

      // 创建合约实例 (ethers v6语法)
      const contract = new ethers.Contract(
        contractAddress,
        abi,
        useSigner && this.signer ? this.signer : this.provider
      );

      // 缓存合约实例
      contractInstances[cacheKey] = contract;

      return contract;
    } catch (error) {
      logger.error(`Failed to get contract instance for ${contractName}:`, error);
      throw new Error(`Failed to get contract instance: ${error.message}`);
    }
  }

  /**
   * 根据合约名称获取合约地址
   * @param {string} contractName 合约名称
   * @returns {string} 合约地址
   */
  getContractAddress(contractName) {
    try {
      // 首先从部署状态中获取地址
      if (deploymentState && deploymentState.contracts) {
        // 尝试直接通过名称获取
        if (deploymentState.contracts[contractName]) {
          const address = deploymentState.contracts[contractName];
          logger.debug(`从部署状态找到合约 ${contractName} 的地址: ${address}`);
          return address;
        }
        
        // 如果没有找到，尝试首字母大写版本
        const capitalizedName = contractName.charAt(0).toUpperCase() + contractName.slice(1);
        if (deploymentState.contracts[capitalizedName]) {
          const address = deploymentState.contracts[capitalizedName];
          logger.debug(`从部署状态找到合约 ${capitalizedName} 的地址: ${address}`);
          return address;
        }
        
        // 如果仍然没有找到，尝试全部小写版本
        const lowercaseName = contractName.toLowerCase();
        if (deploymentState.contracts[lowercaseName]) {
          const address = deploymentState.contracts[lowercaseName];
          logger.debug(`从部署状态找到合约 ${lowercaseName} 的地址: ${address}`);
          return address;
        }
      }
      
      // 尝试从getContractAddresses获取
      const addresses = getContractAddresses();
      logger.debug(`从配置获取所有合约地址: ${JSON.stringify(addresses)}`);
      
      // 尝试多种可能的键名格式
      const possibleKeys = [
        contractName,
        contractName.charAt(0).toLowerCase() + contractName.slice(1),
        contractName.charAt(0).toUpperCase() + contractName.slice(1),
        contractName.toLowerCase()
      ];
      
      for (const key of possibleKeys) {
        if (addresses && addresses[key]) {
          logger.debug(`找到合约 ${contractName} 的地址 (键名=${key}): ${addresses[key]}`);
          return addresses[key];
        }
      }
      
      logger.error(`找不到合约 ${contractName} 的地址`);
      throw new Error(`Contract address not found for: ${contractName}`);
    } catch (error) {
      logger.error(`获取合约 ${contractName} 地址失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据名称获取合约
   * @param {string} contractName 合约名称
   * @param {boolean} useSigner 是否使用签名者
   * @returns {ethers.Contract} 合约实例
   */
  async getContractByName(contractName, useSigner = true) {
    try {
      const address = this.getContractAddress(contractName);
      logger.debug(`获取合约 ${contractName} 的地址: ${address}`);
      return this.getContract(contractName, address, useSigner);
    } catch (error) {
      logger.error(`获取合约 ${contractName} 失败: ${error.message}`);
      throw new Error(`Failed to get contract instance: ${error.message}`);
    }
  }
  
  /**
   * 获取RoleManager合约
   * @param {boolean} useSigner 是否使用签名者
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  async getRoleManager(useSigner = true) {
    return this.getContractByName('RoleManager', useSigner);
  }

  /**
   * 获取PropertyRegistry合约
   * @param {boolean} useSigner 是否使用签名者
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  async getPropertyRegistry(useSigner = true) {
    return this.getContractByName('PropertyRegistry', useSigner);
  }

  /**
   * 获取TokenFactory合约
   * @param {boolean} useSigner 是否使用签名者
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  async getTokenFactory(useSigner = true) {
    return this.getContractByName('TokenFactory', useSigner);
  }

  /**
   * 获取Token合约
   * @param {string} tokenAddress Token合约地址
   * @param {boolean} useSigner 是否使用签名者
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  async getToken(tokenAddress, useSigner = true) {
    return this.getContract('RealEstateToken', tokenAddress, useSigner);
  }
  
  /**
   * 获取RedemptionManager合约
   * @param {boolean} useSigner 是否使用签名者
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  async getRedemptionManager(useSigner = true) {
    return this.getContractByName('RedemptionManager', useSigner);
  }
  
  /**
   * 获取RentDistributor合约
   * @param {boolean} useSigner 是否使用签名者
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  async getRentDistributor(useSigner = true) {
    return this.getContractByName('RentDistributor', useSigner);
  }
  
  /**
   * 获取FeeManager合约
   * @param {boolean} useSigner 是否使用签名者
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  async getFeeManager(useSigner = true) {
    return this.getContractByName('FeeManager', useSigner);
  }
  
  /**
   * 获取Marketplace合约
   * @param {boolean} useSigner 是否使用签名者
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  async getMarketplace(useSigner = true) {
    return this.getContractByName('Marketplace', useSigner);
  }
}

// 创建单例实例
const contractService = new ContractService();

// 导出单例实例和类
module.exports = {
  contractService,
  ContractService
}; 