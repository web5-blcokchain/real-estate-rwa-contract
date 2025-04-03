/**
 * 合约服务模块
 * 处理智能合约相关的业务逻辑
 */
const fs = require('fs').promises;
const path = require('path');
const { Logger, Contract, AbiConfig, ContractConfig, ErrorHandler, Validation } = require('../../../shared/src');
const blockchainService = require('./BlockchainService');
const serverConfig = require('../config');

// 合约ABI缓存
const abiCache = new Map();
// 合约地址缓存
const addressCache = new Map();

/**
 * 获取所有合约的ABI
 * @returns {Promise<Object>} 合约名称和ABI的映射
 */
async function getAllABI() {
  try {
    // 如果缓存为空，加载ABI
    if (abiCache.size === 0) {
      await loadContractABIs();
    }

    // 构建合约名称和ABI的映射
    const abis = {};
    for (const [contractName, abi] of abiCache.entries()) {
      abis[contractName] = abi;
    }

    return abis;
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'contract',
      context: { method: 'getAllABI' }
    });
    Logger.error(`获取所有合约ABI失败: ${handledError.message}`, { error: handledError });
    throw handledError;
  }
}

/**
 * 根据合约名称获取ABI
 * @param {string} contractName - 合约名称
 * @returns {Promise<Array>} 合约ABI
 */
async function getABIByName(contractName) {
  try {
    // 验证合约名称
    Validation.validate(
      Validation.isNotEmpty(contractName),
      '合约名称不能为空'
    );
    
    // 尝试从AbiConfig获取ABI
    try {
      const abi = await AbiConfig.getAbi(contractName);
      if (abi) {
        return abi;
      }
    } catch (configError) {
      Logger.debug(`从AbiConfig获取ABI失败，尝试从本地缓存获取: ${configError.message}`);
    }
    
    // 如果缓存为空，加载ABI
    if (abiCache.size === 0) {
      await loadContractABIs();
    }

    // 获取指定合约的ABI
    const abi = abiCache.get(contractName);
    if (!abi) {
      Logger.warn(`未找到合约 ${contractName} 的ABI`);
      return null;
    }

    return abi;
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'contract',
      context: { method: 'getABIByName', contractName }
    });
    Logger.error(`获取合约 ${contractName} 的ABI失败: ${handledError.message}`, { error: handledError });
    throw handledError;
  }
}

/**
 * 获取所有合约地址
 * @returns {Promise<Object>} 合约名称和地址的映射
 */
async function getAllAddresses() {
  try {
    // 尝试从ContractConfig获取所有地址
    try {
      const addresses = await ContractConfig.getAllAddresses();
      if (addresses && Object.keys(addresses).length > 0) {
        return addresses;
      }
    } catch (configError) {
      Logger.debug(`从ContractConfig获取地址失败，尝试从本地缓存获取: ${configError.message}`);
    }
    
    // 如果缓存为空，加载地址
    if (addressCache.size === 0) {
      await loadContractAddresses();
    }

    // 构建合约名称和地址的映射
    const addresses = {};
    for (const [contractName, address] of addressCache.entries()) {
      addresses[contractName] = address;
    }

    return addresses;
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'contract',
      context: { method: 'getAllAddresses' }
    });
    Logger.error(`获取所有合约地址失败: ${handledError.message}`, { error: handledError });
    throw handledError;
  }
}

/**
 * 根据合约名称获取地址
 * @param {string} contractName - 合约名称
 * @returns {Promise<string>} 合约地址
 */
async function getAddressByName(contractName) {
  try {
    // 验证合约名称
    Validation.validate(
      Validation.isNotEmpty(contractName),
      '合约名称不能为空'
    );
    
    // 尝试从ContractConfig获取地址
    try {
      const address = await ContractConfig.getAddress(contractName);
      if (address) {
        return address;
      }
    } catch (configError) {
      Logger.debug(`从ContractConfig获取地址失败，尝试从本地缓存获取: ${configError.message}`);
    }
    
    // 如果缓存为空，加载地址
    if (addressCache.size === 0) {
      await loadContractAddresses();
    }

    // 获取指定合约的地址
    const address = addressCache.get(contractName);
    if (!address) {
      Logger.warn(`未找到合约 ${contractName} 的地址`);
      return null;
    }

    return address;
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'contract',
      context: { method: 'getAddressByName', contractName }
    });
    Logger.error(`获取合约 ${contractName} 的地址失败: ${handledError.message}`, { error: handledError });
    throw handledError;
  }
}

/**
 * 加载合约ABI
 * @private
 * @returns {Promise<void>}
 */
async function loadContractABIs() {
  try {
    // 从配置中获取合约ABI路径
    const abiPath = process.env.CONTRACT_ABI_PATH || path.join(process.cwd(), 'artifacts', 'contracts');
    
    // 获取当前网络类型
    const networkType = blockchainService.getNetworkType();
    
    // 遍历合约ABI目录
    const contractFiles = await fs.readdir(abiPath, { withFileTypes: true });
    
    for (const dirent of contractFiles) {
      if (dirent.isDirectory()) {
        // 检查目录是否包含JSON文件
        const contractDir = path.join(abiPath, dirent.name);
        const contractJsonFiles = await fs.readdir(contractDir, { withFileTypes: true });
        
        for (const jsonFile of contractJsonFiles) {
          if (jsonFile.isFile() && jsonFile.name.endsWith('.json')) {
            const contractName = path.basename(jsonFile.name, '.json');
            const jsonPath = path.join(contractDir, jsonFile.name);
            
            // 读取合约JSON文件
            const jsonData = await fs.readFile(jsonPath, 'utf8');
            const contractData = JSON.parse(jsonData);
            
            // 提取ABI
            if (contractData.abi) {
              abiCache.set(contractName, contractData.abi);
              Logger.debug(`已加载合约 ${contractName} 的ABI`);
            }
          }
        }
      }
    }
    
    Logger.info(`已加载 ${abiCache.size} 个合约的ABI数据`);
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'contract',
      context: { method: 'loadContractABIs' }
    });
    Logger.error(`加载合约ABI失败: ${handledError.message}`, { error: handledError });
    throw handledError;
  }
}

/**
 * 加载合约地址
 * @private
 * @returns {Promise<void>}
 */
async function loadContractAddresses() {
  try {
    // 从环境变量中获取合约地址
    const addresses = serverConfig.getContractAddresses();
    
    // 将合约地址添加到缓存
    for (const [contractName, address] of Object.entries(addresses)) {
      addressCache.set(contractName, address);
      Logger.debug(`已加载合约 ${contractName} 的地址: ${address}`);
    }
    
    Logger.info(`已加载 ${addressCache.size} 个合约的地址数据`);
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'contract',
      context: { method: 'loadContractAddresses' }
    });
    Logger.error(`加载合约地址失败: ${handledError.message}`, { error: handledError });
    throw handledError;
  }
}

/**
 * 获取合约实例
 * @param {string} contractName - 合约名称
 * @returns {Promise<Object>} 合约实例
 */
async function getContractInstance(contractName) {
  try {
    // 验证合约名称
    Validation.validate(
      Validation.isNotEmpty(contractName),
      '合约名称不能为空'
    );
    
    // 尝试通过Contract.getContract获取
    try {
      const contract = await Contract.getContract(contractName);
      if (contract) {
        return contract;
      }
    } catch (contractError) {
      Logger.debug(`通过Contract.getContract获取合约失败，尝试手动创建: ${contractError.message}`);
    }
    
    // 获取合约的ABI
    const abi = await getABIByName(contractName);
    if (!abi) {
      throw new Error(`未找到合约 ${contractName} 的ABI`);
    }
    
    // 获取合约的地址
    const address = await getAddressByName(contractName);
    if (!address) {
      throw new Error(`未找到合约 ${contractName} 的地址`);
    }
    
    // 创建合约实例
    return await blockchainService.getContractInstance(abi, address);
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'contract',
      context: { method: 'getContractInstance', contractName }
    });
    Logger.error(`获取合约 ${contractName} 实例失败: ${handledError.message}`, { error: handledError });
    throw handledError;
  }
}

module.exports = {
  getAllABI,
  getABIByName,
  getAllAddresses,
  getAddressByName,
  getContractInstance
}; 