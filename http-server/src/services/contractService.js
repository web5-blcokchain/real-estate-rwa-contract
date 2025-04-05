/**
 * 合约服务
 * 提供合约ABI加载和实例化功能
 */
const fs = require('fs');
const path = require('path');
const { Contract, Wallet, Logger, ErrorHandler } = require('../../../shared/src');
const blockchainService = require('./blockchainService');

/**
 * 合约服务类
 */
class ContractService {
  constructor() {
    this.contractCache = {};
    this.abiCache = {};
  }

  /**
   * 初始化合约服务
   */
  initialize() {
    // 提前加载常用合约的ABI到缓存
    this.preloadCommonContracts();
    return true;
  }

  /**
   * 预加载常用合约的ABI
   */
  preloadCommonContracts() {
    try {
      const contractsToPreload = [
        'RealEstateFacade',
        'PropertyToken',
        'RoleManager',
        'PropertyManager',
        'TradingManager',
        'RewardManager'
      ];

      contractsToPreload.forEach(contractName => {
        try {
          this.getContractABI(contractName);
          Logger.debug(`预加载合约ABI成功: ${contractName}`);
        } catch (err) {
          Logger.warn(`预加载合约ABI失败: ${contractName}`, { error: err.message });
        }
      });
    } catch (error) {
      Logger.warn('预加载合约ABI过程中发生错误', { error: error.message });
    }
  }

  /**
   * 获取合约ABI
   * @param {string} contractName - 合约名称
   * @returns {Object} 合约ABI
   */
  getContractABI(contractName) {
    try {
      // 如果缓存中已有，直接返回
      if (this.abiCache[contractName]) {
        return this.abiCache[contractName];
      }

      // 构建ABI文件路径
      const artifactsBasePath = path.resolve(process.env.PROJECT_PATH, 'artifacts/contracts');
      const abiFilePath = path.join(artifactsBasePath, `${contractName}.sol`, `${contractName}.json`);

      // 检查文件是否存在
      if (!fs.existsSync(abiFilePath)) {
        throw new Error(`合约ABI文件不存在: ${abiFilePath}`);
      }

      // 读取并解析ABI文件
      const contractJson = JSON.parse(fs.readFileSync(abiFilePath, 'utf8'));
      
      // 提取ABI部分
      if (!contractJson.abi) {
        throw new Error(`合约ABI格式无效: ${contractName}`);
      }

      // 缓存ABI
      this.abiCache[contractName] = contractJson.abi;
      
      return contractJson.abi;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getContractABI', contractName }
      });
      Logger.error(`获取合约ABI失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称
   * @returns {string|null} 合约地址
   */
  getContractAddress(contractName) {
    try {
      // 合约别名映射表，用于将短名称映射到完整合约名称
      const contractAliases = {
        'Facade': 'REALESTATEFACADE',
        'System': 'REALESTATESYSTEM',
        'RealEstateFacade': 'REALESTATEFACADE',
        'RealEstateSystem': 'REALESTATESYSTEM'
      };
      
      // 查找环境变量名
      const envName = contractAliases[contractName] || contractName.toUpperCase();
      const envKey = `CONTRACT_${envName}_ADDRESS`;
      
      Logger.debug(`尝试获取合约地址: ${contractName}`, {
        contractName, 
        envName, 
        envKey,
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('CONTRACT_')),
        projectPath: process.env.PROJECT_PATH
      });
      
      const address = process.env[envKey];
      
      if (address) {
        Logger.debug(`从环境变量${envKey}找到合约地址: ${address}`);
        return address;
      }

      // 尝试从部署文件获取
      const deploymentFilePath = path.resolve(process.env.PROJECT_PATH, 'config/deployment.json');
      
      Logger.debug(`检查部署文件: ${deploymentFilePath}`, {
        exists: fs.existsSync(deploymentFilePath)
      });
      
      if (fs.existsSync(deploymentFilePath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
        const networkType = process.env.BLOCKCHAIN_NETWORK || 'localhost';
        
        Logger.debug(`尝试从部署文件获取合约地址`, {
          networkType,
          hasNetworkData: !!deploymentData[networkType],
          availableContracts: deploymentData[networkType] ? Object.keys(deploymentData[networkType]) : []
        });
        
        if (deploymentData[networkType] && deploymentData[networkType][contractName]) {
          const addressFromDeployment = deploymentData[networkType][contractName];
          Logger.debug(`从部署文件找到合约地址: ${addressFromDeployment}`);
          return addressFromDeployment;
        }
      }

      // 输出当前目录内容，帮助调试
      try {
        const projectPath = process.env.PROJECT_PATH || process.cwd();
        const files = fs.readdirSync(projectPath);
        Logger.debug(`项目目录内容:`, { path: projectPath, files });
        
        // 检查.env文件内容
        if (fs.existsSync(path.join(projectPath, '.env'))) {
          const envContent = fs.readFileSync(path.join(projectPath, '.env'), 'utf8');
          const envLines = envContent.split('\n').filter(line => line.includes('CONTRACT_'));
          Logger.debug(`找到.env文件中的合约相关配置:`, { lines: envLines });
        }
      } catch (fsErr) {
        Logger.warn(`读取项目文件失败: ${fsErr.message}`);
      }

      Logger.warn(`找不到合约地址: ${contractName}，尝试的环境变量: ${envKey}`);
      return null;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'getContractAddress', contractName }
      });
      Logger.error(`获取合约地址失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 创建合约实例
   * @param {string} contractName - 合约名称
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} 合约实例
   */
  async createContractInstance(contractName, options = {}) {
    try {
      // 生成缓存键
      const cacheKey = `${contractName}-${options.address || 'default'}-${options.wallet ? 'with-wallet' : 'no-wallet'}`;
      
      // 调试信息：记录合约创建尝试
      Logger.debug(`尝试创建合约实例: ${contractName}`, {
        contractName,
        hasWallet: !!options.wallet,
        hasAddress: !!options.address,
        networkType: process.env.BLOCKCHAIN_NETWORK || 'localhost',
        cacheKey
      });
      
      // 如果缓存中已有，直接返回
      if (this.contractCache[cacheKey]) {
        Logger.debug(`使用缓存的合约实例: ${contractName}`);
        return this.contractCache[cacheKey];
      }

      // 获取合约ABI
      const abi = options.abi || this.getContractABI(contractName);
      if (!abi) {
        throw new Error(`无法获取合约ABI: ${contractName}`);
      }
      
      // 获取合约地址
      const address = options.address || this.getContractAddress(contractName);
      if (!address) {
        throw new Error(`无法获取合约地址: ${contractName}`);
      }
      
      Logger.debug(`合约信息: ${contractName}`, {
        address,
        abiLength: abi.length,
        network: process.env.BLOCKCHAIN_NETWORK || 'localhost',
        envKeys: Object.keys(process.env).filter(key => key.includes('CONTRACT_')).join(', ')
      });
      
      // 获取Provider
      const provider = options.provider || blockchainService.getProvider();
      if (!provider) {
        throw new Error('Provider不可用');
      }
      
      // 记录Provider信息
      try {
        const network = await provider.getNetwork();
        Logger.debug(`Provider信息`, {
          isConnected: true,
          chainId: network.chainId.toString(),
          name: network.name,
          blockNumber: await provider.getBlockNumber()
        });
      } catch (providerError) {
        Logger.warn(`获取Provider信息失败: ${providerError.message}`);
      }
      
      // 直接使用ethers.js创建合约实例
      try {
        Logger.debug(`使用ethers.js直接创建合约实例: ${contractName}`);
        const { ethers } = require('ethers');
        
        let contract;
        if (options.wallet) {
          // 连接钱包到provider
          contract = new ethers.Contract(address, abi, options.wallet);
          Logger.debug(`已使用钱包创建合约实例: ${contractName}`);
        } else {
          // 创建只读合约
          contract = new ethers.Contract(address, abi, provider);
          Logger.debug(`已创建只读合约实例: ${contractName}`);
        }
        
        // 缓存合约实例
        this.contractCache[cacheKey] = contract;
        return contract;
      } catch (ethersError) {
        Logger.error(`使用ethers创建合约失败: ${ethersError.message}`, { error: ethersError });
        throw ethersError;
      }
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'createContractInstance', contractName }
      });
      Logger.error(`创建合约实例失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 调用合约只读方法
   * @param {Object|string} contractOrName - 合约实例或合约名称
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @param {Object} options - 调用选项
   * @returns {Promise<any>} 调用结果
   */
  async callMethod(contractOrName, method, params = [], options = {}) {
    try {
      // 确定合约实例
      const contract = typeof contractOrName === 'string' 
        ? await this.createContractInstance(contractOrName, options)
        : contractOrName;
      
      if (!contract[method]) {
        throw new Error(`合约方法不存在: ${method}`);
      }
      
      // 调用合约方法
      Logger.debug(`直接调用合约方法: ${method}`, {
        contractAddress: contract.address,
        method,
        params: JSON.stringify(params)
      });
      
      // 直接调用合约方法，不使用Contract.call
      let result;
      if (params && params.length > 0) {
        result = await contract[method](...params);
      } else {
        result = await contract[method]();
      }
      
      // 记录调用日志
      Logger.debug(`调用合约方法成功: ${method}`, {
        contract: contract.address,
        method,
        resultType: typeof result
      });
      
      return result;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { 
          method: 'callMethod', 
          contractMethod: method, 
          params 
        }
      });
      Logger.error(`调用合约方法失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }

  /**
   * 发送合约交易
   * @param {Object|string} contractOrName - 合约实例或合约名称
   * @param {string} method - 方法名
   * @param {Array} params - 参数数组
   * @param {Object} options - 交易选项
   * @returns {Promise<Object>} 交易收据
   */
  async sendTransaction(contractOrName, method, params = [], options = {}) {
    try {
      // 检查是否提供了钱包
      if (!options.wallet && !options.privateKey) {
        throw new Error('发送交易需要提供钱包或私钥');
      }
      
      // 如果提供了私钥，创建钱包
      if (options.privateKey && !options.wallet) {
        const provider = blockchainService.getProvider();
        options.wallet = await Wallet.createFromPrivateKey(options.privateKey, provider);
      }
      
      // 确定合约实例
      const contract = typeof contractOrName === 'string' 
        ? await this.createContractInstance(contractOrName, options)
        : contractOrName;
      
      if (!contract[method]) {
        throw new Error(`合约方法不存在: ${method}`);
      }
      
      // 准备交易选项
      const txOptions = {};
      if (options.gasLimit) txOptions.gasLimit = options.gasLimit;
      if (options.gasPrice) txOptions.gasPrice = options.gasPrice;
      if (options.value) txOptions.value = options.value;
      
      Logger.debug(`准备发送合约交易: ${method}`, {
        contract: contract.address,
        method,
        params: JSON.stringify(params),
        txOptions
      });
      
      // 直接调用合约方法，传入参数和交易选项
      let tx;
      if (params && params.length > 0) {
        tx = await contract[method](...params, txOptions);
      } else {
        tx = await contract[method](txOptions);
      }
      
      // 等待交易确认
      Logger.info(`交易已提交: ${tx.hash}`);
      const receipt = await tx.wait();
      
      // 记录交易日志
      Logger.info(`合约交易已确认: ${method}`, {
        contract: contract.address,
        method,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });
      
      return receipt;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'transaction',
        context: { 
          method: 'sendTransaction', 
          contractMethod: method, 
          params 
        }
      });
      Logger.error(`发送合约交易失败: ${handledError.message}`, { error: handledError });
      throw handledError;
    }
  }
}

// 创建单例实例
const contractService = new ContractService();

module.exports = contractService; 