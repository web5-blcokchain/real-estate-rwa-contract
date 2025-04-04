/**
 * RealEstateFacade合约控制器
 * 直接代理RealEstateFacade.json ABI文件中的所有方法
 */
const { ethers } = require('ethers');
const { Logger, Validation, Contract } = require('../../../shared/src');
const { blockchainService } = require('../services');
const { sendResponse } = require('../utils/ContractUtils');
const { AddressConfig, AbiConfig } = require('../../../shared/src/config');

// 合约名称常量
const CONTRACT_NAME = 'RealEstateFacade';

// 合约实例缓存(按keyType分类)
const contractInstances = {};

/**
 * 初始化合约实例(单例模式)
 * @param {string} keyType - 私钥类型(ADMIN/OPERATOR等)
 * @returns {Promise<Object>} 合约实例
 */
async function initContract(keyType = 'ADMIN') {
  try {
    const cacheKey = `${CONTRACT_NAME}_${keyType}`;
    
    // 判断是否已经初始化过
    if (contractInstances[cacheKey]) {
      Logger.debug(`复用${CONTRACT_NAME}合约缓存实例`, { keyType });
      return contractInstances[cacheKey];
    }
    
    // 确保区块链服务已初始化
    await blockchainService.initialize();
    
    // 使用getContractInstanceByName方法获取合约实例
    const contract = await blockchainService.getContractInstanceByName(CONTRACT_NAME, keyType);
    
    // 缓存合约实例
    contractInstances[cacheKey] = contract;
    
    Logger.info(`${CONTRACT_NAME}合约初始化成功`, { 
      address: contract.address,
      keyType,
      cacheKey
    });
    
    return contract;
  } catch (error) {
    Logger.error(`${CONTRACT_NAME}合约初始化失败: ${error.message}`, { error });
    throw error;
  }
}

/**
 * 获取合约地址
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getContractAddress(req, res) {
  try {
    // 使用AddressConfig获取合约地址
    const address = AddressConfig.getContractAddress(CONTRACT_NAME);
    return sendResponse(res, { address });
  } catch (error) {
    Logger.error(`获取${CONTRACT_NAME}合约地址失败: ${error.message}`, { error });
    return sendResponse(res, null, error.message, 500);
  }
}

/**
 * registerProperty - 注册房产
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function registerProperty(req, res) {
  try {
    Logger.info('API调用: registerProperty', { 
      interface: 'registerProperty',
      method: 'POST',
      params: req.body
    });
    
    const { 
      propertyId, 
      country, 
      metadataURI
    } = req.body;
    
    // 验证参数
    if (!propertyId || !country || !metadataURI) {
      Logger.warn('参数验证失败: registerProperty', {
        interface: 'registerProperty',
        method: 'POST',
        params: req.body
      });
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    // 初始化区块链服务并获取合约实例
    await blockchainService.initialize();
    const contract = await initContract('ADMIN');
    
    // 发送交易
    const receipt = await blockchainService.sendContractTransaction(
      contract,
      'registerProperty',
      [propertyId, country, metadataURI]
    );
    
    Logger.info('注册房产成功', {
      interface: 'registerProperty',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      propertyId,
      country
    });
    
    return sendResponse(res, { 
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      propertyId,
      country,
      metadataURI
    });
  } catch (error) {
    Logger.error('注册房产失败', { 
      error: error.message,
      interface: 'registerProperty',
      params: req.body
    });
    return sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * registerPropertyAndCreateToken - 注册房产并创建代币
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function registerPropertyAndCreateToken(req, res) {
  try {
    Logger.info('API调用: registerPropertyAndCreateToken', { 
      interface: 'registerPropertyAndCreateToken',
      method: 'POST',
      params: req.body
    });
    
    const { 
      propertyId, 
      country, 
      metadataURI,
      tokenName,
      tokenSymbol,
      initialSupply,
      tokenImplementation
    } = req.body;
    
    // 验证参数
    if (!propertyId || !country || !metadataURI || !tokenName || !tokenSymbol || !initialSupply) {
      Logger.warn('参数验证失败: registerPropertyAndCreateToken', {
        interface: 'registerPropertyAndCreateToken',
        method: 'POST',
        params: req.body
      });
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    // 处理代币实现地址
    let tokenImplAddress = tokenImplementation;
    if (!tokenImplAddress) {
      // 如果没有提供，使用部署文件中的PropertyToken地址
      tokenImplAddress = AddressConfig.getContractAddress('PropertyToken');
    }
    
    // 验证地址
    if (!Validation.isValidAddress(tokenImplAddress)) {
      return sendResponse(res, { error: '无效的代币实现地址' }, 400);
    }
    
    // 初始化区块链服务并获取合约实例
    await blockchainService.initialize();
    const contract = await initContract('ADMIN');
    
    // 发送交易
    const receipt = await blockchainService.sendContractTransaction(
      contract,
      'registerPropertyAndCreateToken',
      [
        propertyId,
        country,
        metadataURI,
        tokenName,
        tokenSymbol,
        ethers.parseUnits(initialSupply.toString(), 18),
        tokenImplAddress
      ]
    );
    
    Logger.info('注册房产并创建代币成功', {
      interface: 'registerPropertyAndCreateToken',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      propertyId,
      tokenName
    });
    
    // 解析事件获取更多信息
    let propertyIdHash, tokenAddress;
    
    // 合约函数返回值是元组[bytes32, address]
    // 尝试从事件中获取propertyIdHash和tokenAddress
    if (receipt.logs && receipt.logs.length > 0) {
      try {
        const abiInfo = AbiConfig.getContractAbi(CONTRACT_NAME);
        const iface = new ethers.Interface(abiInfo.abi);
        
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === 'PropertyRegistered') {
              propertyIdHash = parsed.args[0];
              tokenAddress = parsed.args[4];
              break;
            }
          } catch (e) {
            // 静默处理解析错误，继续尝试下一个日志
          }
        }
      } catch (e) {
        Logger.warn('解析注册事件失败', { error: e.message });
      }
    }
    
    return sendResponse(res, { 
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      propertyId,
      propertyIdHash: propertyIdHash || null,
      tokenAddress: tokenAddress || null,
      country,
      metadataURI,
      tokenName,
      tokenSymbol
    });
  } catch (error) {
    Logger.error('注册房产并创建代币失败', { 
      error: error.message,
      interface: 'registerPropertyAndCreateToken',
      params: req.body
    });
    return sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * createProperty - 创建房产并铸造代币（RealEstateFacade合约的createProperty方法）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function createProperty(req, res) {
  try {
    Logger.info('API调用: createProperty', { 
      interface: 'createProperty',
      method: 'POST',
      params: req.body
    });
    
    const { 
      propertyId, 
      country, 
      metadataURI,
      tokenName,
      tokenSymbol,
      initialSupply,
      tokenImplementation
    } = req.body;
    
    // 验证参数
    if (!propertyId || !country || !metadataURI || !tokenName || !tokenSymbol || !initialSupply) {
      Logger.warn('参数验证失败: createProperty', {
        interface: 'createProperty',
        method: 'POST',
        params: req.body
      });
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    // 处理代币实现地址
    let tokenImplAddress = tokenImplementation;
    if (!tokenImplAddress) {
      // 如果没有提供，使用部署文件中的PropertyToken地址
      tokenImplAddress = AddressConfig.getContractAddress('PropertyToken');
    }
    
    // 验证地址
    if (!Validation.isValidAddress(tokenImplAddress)) {
      return sendResponse(res, { error: '无效的代币实现地址' }, 400);
    }
    
    // 初始化区块链服务并获取合约实例
    await blockchainService.initialize();
    const contract = await initContract('ADMIN');
    
    // 发送交易
    const receipt = await blockchainService.sendContractTransaction(
      contract,
      'registerPropertyAndCreateToken',
      [
        propertyId,
        country,
        metadataURI,
        tokenName,
        tokenSymbol,
        ethers.parseUnits(initialSupply.toString(), 18),
        tokenImplAddress
      ]
    );
    
    Logger.info('创建房产并铸造代币成功', {
      interface: 'createProperty',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      propertyId,
      tokenName
    });
    
    // 解析事件获取更多信息
    let propertyIdHash, tokenAddress;
    
    // 尝试从事件中获取propertyIdHash和tokenAddress
    if (receipt.logs && receipt.logs.length > 0) {
      try {
        const abiInfo = AbiConfig.getContractAbi(CONTRACT_NAME);
        const iface = new ethers.Interface(abiInfo.abi);
        
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === 'PropertyRegistered') {
              propertyIdHash = parsed.args[0];
              tokenAddress = parsed.args[4];
              break;
            }
          } catch (e) {
            // 静默处理解析错误，继续尝试下一个日志
          }
        }
      } catch (e) {
        Logger.warn('解析注册事件失败', { error: e.message });
      }
    }
    
    return sendResponse(res, { 
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      propertyId,
      propertyIdHash: propertyIdHash || null,
      tokenAddress: tokenAddress || null,
      country,
      metadataURI,
      tokenName,
      tokenSymbol
    });
  } catch (error) {
    Logger.error('创建房产并铸造代币失败', { 
      error: error.message,
      interface: 'createProperty',
      params: req.body
    });
    return sendResponse(res, { error: error.message }, 500);
  }
}

// 导出所有方法
module.exports = {
  getContractAddress,
  registerProperty,
  registerPropertyAndCreateToken,
  createProperty
}; 