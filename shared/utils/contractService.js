const { initializeAbis, contractAbis } = require('./getAbis');
const { getContractAddresses } = require('../config/contracts');
const { loadConfig } = require('../config');
const { ethers } = require('ethers');

/**
 * 合约服务类
 * 统一管理合约实例的创建和调用
 */
class ContractService {
  constructor() {
    this.provider = null;
    this.abis = null;
    this.contractAddresses = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      console.log('合约服务已经初始化');
      return;
    }

    console.log('初始化共享合约服务...');
    
    try {
      // 加载配置
      console.log('加载配置...');
      const config = await loadConfig();
      console.log('配置加载完成');

      // 创建以太坊提供者
      console.log('创建以太坊提供者...');
      const network = config.networkConfig;
      console.log(`使用网络: ${network.name}`);
      
      // 使用 ethers 的网络配置
      this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
      
      // 验证网络连接
      const connectedNetwork = await this.provider.getNetwork();
      console.log('已连接到网络:', {
        name: connectedNetwork.name,
        chainId: connectedNetwork.chainId
      });

      // 加载合约地址
      console.log('加载合约地址...');
      this.contractAddresses = config.contractAddresses;
      console.log('合约地址加载成功:', this.contractAddresses);

      // 加载ABI
      console.log('加载ABI...');
      await initializeAbis();
      this.abis = contractAbis;
      console.log('ABI加载成功，已加载合约:', Object.keys(this.abis));

      this.initialized = true;
      console.log('合约服务初始化完成');
    } catch (error) {
      console.error('合约服务初始化失败:', error);
      console.error('错误堆栈:', error.stack);
      throw error;
    }
  }

  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('合约服务尚未初始化，请先调用 initialize() 方法');
    }
  }

  getContract(contractName, signerKey) {
    this._checkInitialized();
    
    const abi = this.abis[contractName];
    const address = this.contractAddresses[contractName];
    
    if (!abi || !address) {
      throw new Error(`找不到合约 ${contractName} 的 ABI 或地址`);
    }

    return new ethers.Contract(address, abi, this.provider);
  }

  // 获取合约实例
  getRoleManager(signerKey) {
    return this.getContract('RoleManager', signerKey);
  }

  getPropertyRegistry(signerKey) {
    return this.getContract('PropertyRegistry', signerKey);
  }

  getTokenFactory(signerKey) {
    return this.getContract('TokenFactory', signerKey);
  }

  getToken(tokenAddress, signerKey) {
    this._checkInitialized();
    
    const abi = this.abis['RealEstateToken'];
    if (!abi) {
      throw new Error('找不到 RealEstateToken 的 ABI');
    }

    return new ethers.Contract(tokenAddress, abi, this.provider);
  }

  getRedemptionManager(signerKey) {
    return this.getContract('RedemptionManager', signerKey);
  }

  getRentDistributor(signerKey) {
    return this.getContract('RentDistributor', signerKey);
  }

  getFeeManager(signerKey) {
    return this.getContract('FeeManager', signerKey);
  }

  getMarketplace(signerKey) {
    return this.getContract('Marketplace', signerKey);
  }

  getTokenHolderQuery(signerKey) {
    return this.getContract('TokenHolderQuery', signerKey);
  }

  getRealEstateSystem(signerKey) {
    return this.getContract('RealEstateSystem', signerKey);
  }
}

// 创建单例实例
const contractService = new ContractService();

// 导出单例实例和类
module.exports = {
  contractService,
  ContractService
}; 