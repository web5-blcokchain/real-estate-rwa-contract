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
   * 初始化合约工厂
   * 确保静态属性已被正确初始化
   */
  static initialize() {
    if (!ContractFactory._contractCache) {
      ContractFactory._contractCache = {};
      Logger.debug('已初始化合约ABI缓存');
    }
    return true;
  }

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
      
      Logger.debug(`开始创建合约: ${contractName}, 网络: ${networkType || '未指定'}`);
      
      // 如果没有提供网络类型，使用环境变量
      networkType = networkType || process.env.BLOCKCHAIN_NETWORK || 'localhost';
      
      // 获取Provider
      let provider = options.provider;
      if (!provider && options.signer && options.signer.provider) {
        provider = options.signer.provider;
      }
      
      if (!provider) {
        Logger.debug(`为合约 ${contractName} 创建新Provider, 网络: ${networkType}`);
        provider = await Provider.create({ networkType });
      }
      
      // 获取或创建签名者
      let signer = options.signer;
      if (!signer && !options.readOnly && options.keyType) {
        Logger.debug(`为合约 ${contractName} 创建新钱包, 类型: ${options.keyType}`);
        signer = await Wallet.create({
          provider: provider,
          keyType: options.keyType
        });
      }
      
      // 获取合约地址
      let address;
      
      try {
        // 优先使用自定义地址
        if (options.address) {
          Logger.debug(`使用提供的地址: ${options.address}`);
          address = options.address;
        } else {
          // 尝试从环境变量获取地址
          Logger.debug(`尝试获取 ${contractName} 合约地址`);
          address = ContractAddress.getAddress(contractName);
          Logger.debug(`成功获取合约地址: ${contractName} -> ${address}`);
        }
      } catch (addressError) {
        Logger.error(`获取合约地址失败: ${addressError.message}`);
        throw new ContractError(`获取合约 ${contractName} 地址失败: ${addressError.message}`);
      }
      
      // 加载ABI
      Logger.info(`加载合约ABI: ${contractName}`);
      let abi;
      try {
        abi = await this.loadContractAbi(contractName);
        Logger.debug(`成功加载合约ABI: ${contractName}, 包含 ${abi.length} 个方法/事件`);
      } catch (abiError) {
        Logger.error(`加载合约ABI失败: ${abiError.message}`);
        throw new ContractError(`加载合约 ${contractName} ABI失败: ${abiError.message}`);
      }
      
      // 创建合约实例
      try {
        if (options.readOnly || !signer) {
          Logger.debug(`创建只读合约: ${contractName}`);
          return await this.createReadOnly(provider, address, abi);
        } else {
          Logger.debug(`创建可写合约: ${contractName}`);
          return await this.create(signer, address, abi);
        }
      } catch (instanceError) {
        Logger.error(`创建合约实例失败: ${instanceError.message}`);
        throw new ContractError(`创建合约 ${contractName} 实例失败: ${instanceError.message}`);
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
    // 安全地初始化缓存
    if (!ContractFactory._contractCache) {
      ContractFactory._contractCache = {};
      Logger.debug('直接初始化合约ABI缓存');
    }
    
    // 检查缓存
    if (ContractFactory._contractCache[contractName] && ContractFactory._contractCache[contractName].abi) {
      Logger.debug(`从缓存中获取合约${contractName}的ABI`);
      return ContractFactory._contractCache[contractName].abi;
    }

    // 从环境变量获取项目根目录
    const projectRoot = process.env.PROJECT_PATH || process.cwd();
    Logger.debug(`加载合约${contractName}的ABI, 项目根目录: ${projectRoot}`);
    
    // 构建标准的Hardhat artifacts路径
    const artifactPath = path.join(
      projectRoot.trim(),
      'artifacts/contracts', 
      `${contractName}.sol`, 
      `${contractName}.json`
    );
    
    Logger.debug(`尝试从标准路径加载ABI文件: ${artifactPath}`);
    
    if (!fs.existsSync(artifactPath)) {
      Logger.error(`找不到合约${contractName}的ABI文件: ${artifactPath}`);
      throw new ContractError(`找不到合约${contractName}的ABI文件，请确保合约已编译且artifacts目录存在`);
    }
    
    try {
      Logger.debug(`读取ABI文件: ${artifactPath}`);
      const fileContent = fs.readFileSync(artifactPath, 'utf8');
      
      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        Logger.error(`解析ABI JSON失败:`, { error: parseError.message, path: artifactPath });
        throw new ContractError(`解析ABI JSON失败: ${parseError.message}`);
      }
      
      // 从JSON获取ABI
      if (!jsonData.abi) {
        Logger.error(`ABI文件格式无效，没有找到abi字段:`, { path: artifactPath });
        throw new ContractError(`无效的合约ABI文件格式: ${artifactPath}`);
      }
      
      const abi = jsonData.abi;
      Logger.debug(`成功解析ABI，包含${abi.length}个方法/事件定义`);
      
      // 缓存ABI
      ContractFactory._contractCache[contractName] = {
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

// 在模块加载时进行初始化 - 直接初始化静态变量
if (!ContractFactory._contractCache) {
  ContractFactory._contractCache = {};
  Logger.debug('模块加载时初始化合约ABI缓存');
}
// 调用初始化方法只是为了保持一致性
try {
  ContractFactory.initialize();
} catch (e) {
  // 忽略初始化错误
}

module.exports = ContractFactory; 