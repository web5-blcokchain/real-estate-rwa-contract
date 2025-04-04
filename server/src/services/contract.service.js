/**
 * 合约服务模块
 * 处理智能合约相关的业务逻辑
 */
const { Logger, config, ErrorHandler, Validation } = require('../../../shared/src');
const blockchainService = require('./BlockchainService');

const { AbiConfig, EnvConfig, AddressConfig } = config;

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
    
    // 首先尝试从deployment.json获取地址
    const address = AddressConfig.getContractAddress(contractName);
    if (address) {
      return address;
    }
    
    // 如果deployment.json中没有，则尝试从环境变量获取
    const envKey = `${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${contractName.toUpperCase()}${EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
    const envAddress = EnvConfig.getEnv(envKey);
    
    if (!envAddress) {
      Logger.warn(`未找到合约 ${contractName} 的地址`);
      return null;
    }

    return envAddress;
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
 * 获取所有合约地址
 * @returns {Promise<Object>} 合约名称和地址的映射
 */
async function getAllAddresses() {
  try {
    // 首先从deployment.json获取所有地址
    const deploymentAddresses = AddressConfig.getAllContractAddresses();
    
    // 然后合并环境变量中的地址
    const envAddresses = {};
    const prefix = EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_PREFIX;
    const suffix = EnvConfig.ENV_KEYS.CONTRACT_ADDRESS_SUFFIX;
    
    // 遍历环境变量，查找合约地址
    for (const key in process.env) {
      const pattern = new RegExp(`^${prefix}([A-Z0-9_]+)${suffix}$`);
      const match = key.match(pattern);
      if (match) {
        const contractName = match[1];
        const address = EnvConfig.getEnv(key);
        if (address) {
          envAddresses[contractName] = address;
        }
      }
    }
    
    // 合并地址（优先使用deployment.json中的地址）
    return { ...envAddresses, ...deploymentAddresses };
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
    
    // 获取合约ABI信息
    let contractAbi = null;
    
    try {
      const contractInfo = AbiConfig.getContractAbi(contractName);
      if (contractInfo && contractInfo.abi) {
        contractAbi = contractInfo.abi;
      }
    } catch (error) {
      Logger.warn(`通过AbiConfig获取合约 ${contractName} 的ABI失败: ${error.message}`);
    }
    
    if (!contractAbi) {
      // 尝试查找Facade（如果要查找的是RealEstateFacade）
      if (contractName === 'RealEstateFacade') {
        try {
          const facadeInfo = AbiConfig.getContractAbi('Facade');
          if (facadeInfo && facadeInfo.abi) {
            contractAbi = facadeInfo.abi;
          }
        } catch (error) {
          Logger.warn(`通过AbiConfig获取合约 Facade 的ABI失败: ${error.message}`);
        }
      }
    }
    
    if (!contractAbi) {
      Logger.warn(`未找到合约 ${contractName} 的ABI`);
      return null;
    }
    
    return contractAbi;
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
  getAddressByName,
  getAllAddresses,
  getContractInstance,
  getABIByName
}; 