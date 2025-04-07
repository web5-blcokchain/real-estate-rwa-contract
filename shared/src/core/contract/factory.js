/**
 * 合约工厂类
 * 负责创建和初始化合约实例
 */
const { ethers } = require('ethers');
const { ContractError, ErrorHandler } = require('../../utils/errors');
const Logger = require('../../utils/logger');
const Validation = require('../../utils/validation');
const Provider = require('../provider');
const Wallet = require('../wallet');
const ContractAddress = require('../../utils/address');
const path = require('path');
const fs = require('fs');

/**
 * 合约工厂类
 */
class ContractFactory {
  /**
   * 缓存的合约配置
   * @private
   */
  static _contractCache = {};

  /**
   * 创建合约实例
   * @param {ethers.Wallet} signer - 钱包/签名者实例
   * @param {string} address - 合约地址
   * @param {Object|Array} abi - 合约ABI
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  static async create(signer, address, abi) {
    try {
      // 验证必要参数
      if (!signer) {
        throw new ContractError('未提供签名者');
      }
      
      if (!address) {
        throw new ContractError('未提供合约地址');
      }
      
      if (!abi) {
        throw new ContractError('未提供合约ABI');
      }

      // 验证参数格式
      if (!Validation.isValidAddress(address)) {
        throw new ContractError('无效的合约地址');
      }

      if (!Validation.isValidAbi(abi)) {
        throw new ContractError('无效的合约 ABI');
      }

      // 创建合约实例
      const contract = new ethers.Contract(address, abi, signer);
      
      // 存储合约元数据
      contract._metadata = {
        address,
        networkType: (await signer.provider.getNetwork()).name || 'unknown',
        createdAt: new Date().toISOString()
      };
      
      // 记录日志
      Logger.info('合约实例创建成功', { 
        address,
        signerAddress: signer.address
      });
      
      return contract;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'create' }
      });
      Logger.error('创建合约实例失败', { error: handledError });
      throw handledError;
    }
  }

  /**
   * 创建只读合约实例（不需要签名者）
   * @param {ethers.Provider} provider - Provider实例
   * @param {string} address - 合约地址
   * @param {Object|Array} abi - 合约ABI
   * @returns {Promise<ethers.Contract>} 只读合约实例
   */
  static async createReadOnly(provider, address, abi) {
    try {
      // 验证必要参数
      if (!provider) {
        throw new ContractError('未提供Provider');
      }
      
      if (!address) {
        throw new ContractError('未提供合约地址');
      }
      
      if (!abi) {
        throw new ContractError('未提供合约ABI');
      }

      // 验证参数格式
      if (!Validation.isValidAddress(address)) {
        throw new ContractError('无效的合约地址');
      }

      if (!Validation.isValidAbi(abi)) {
        throw new ContractError('无效的合约 ABI');
      }

      // 创建只读合约实例
      const contract = new ethers.Contract(address, abi, provider);
      
      // 存储合约元数据
      contract._metadata = {
        address,
        networkType: (await provider.getNetwork()).name || 'unknown',
        readOnly: true,
        createdAt: new Date().toISOString()
      };
      
      // 记录日志
      Logger.info('只读合约实例创建成功', { address });
      
      return contract;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { method: 'createReadOnly' }
      });
      Logger.error('创建只读合约实例失败', { error: handledError });
      throw handledError;
    }
  }

  /**
   * 根据合约名称创建合约实例
   * @param {string} contractName - 合约名称
   * @param {string} networkType - 网络类型
   * @param {Object} options - 选项
   * @param {ethers.Wallet} [options.signer] - 已有的签名者
   * @param {ethers.Provider} [options.provider] - 提供者实例
   * @param {string} [options.keyType] - 密钥类型，如果提供了provider但没有signer
   * @param {boolean} [options.readOnly=false] - 是否创建只读实例
   * @returns {Promise<ethers.Contract>} 合约实例
   */
  static async createFromName(contractName, networkType, options = {}) {
    try {
      // 验证参数
      Validation.validate(
        Validation.isNotEmpty(contractName),
        '合约名称不能为空'
      );
      
      // 如果没有提供网络类型，使用环境变量
      networkType = networkType || process.env.BLOCKCHAIN_NETWORK || 'localhost';
      
      // 获取Provider
      let provider = options.provider;
      if (!provider && options.signer && options.signer.provider) {
        provider = options.signer.provider;
      }
      
      if (!provider) {
        provider = await Provider.create({ networkType });
      }
      
      // 获取或创建签名者
      let signer = options.signer;
      if (!signer && !options.readOnly && options.keyType) {
        signer = await Wallet.create({
          provider: provider,
          keyType: options.keyType
        });
      }
      
      // 从环境变量获取合约地址 - 不再使用networkType参数
      // 按照项目约定，合约地址和网络类型无关
      const address = options.address || ContractAddress.getAddress(contractName);
      
      // 加载ABI
      Logger.info(`加载合约ABI: ${contractName}`);
      const abi = await this.loadContractAbi(contractName);
      
      // 创建合约实例
      if (options.readOnly || !signer) {
        return await this.createReadOnly(provider, address, abi);
      } else {
        return await this.create(signer, address, abi);
      }
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'contract',
        context: { 
          method: 'createFromName', 
          contractName,
          networkType
        }
      });
      Logger.error(`根据名称创建合约实例失败: ${handledError.message}`, { 
        error: handledError,
        contractName,
        networkType
      });
      throw handledError;
    }
  }

  /**
   * 加载合约ABI
   * @param {string} contractName - 合约名称
   * @returns {Promise<Array>} ABI数组
   */
  static async loadContractAbi(contractName) {
    // 检查缓存
    if (this._contractCache[contractName] && this._contractCache[contractName].abi) {
      return this._contractCache[contractName].abi;
    }

    // 只从artifacts/contracts目录加载ABI
    const artifactPath = path.resolve(process.cwd(), 'artifacts/contracts', `${contractName}.sol`, `${contractName}.json`);
    
    try {
      if (!fs.existsSync(artifactPath)) {
        throw new ContractError(`合约ABI文件不存在: ${artifactPath}`);
      }
      
      const fileContent = fs.readFileSync(artifactPath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      // 从Hardhat artifacts获取ABI
      if (!jsonData.abi) {
        throw new ContractError(`无效的合约ABI文件格式: ${artifactPath}`);
      }
      
      const abi = jsonData.abi;
      
      // 缓存ABI
      this._contractCache[contractName] = {
        abi,
        abiPath: artifactPath
      };
      
      Logger.info(`已加载合约${contractName}的ABI`, { path: artifactPath });
      return abi;
    } catch (error) {
      Logger.error(`加载合约${contractName}的ABI失败`, { 
        error: error.message,
        path: artifactPath
      });
      throw new ContractError(`加载合约${contractName}的ABI失败: ${error.message}`);
    }
  }
}

module.exports = ContractFactory; 