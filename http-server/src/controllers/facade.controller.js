/**
 * RealEstateFacade合约控制器
 * 简化版本 - 直接使用ethers.js V6
 */
const { Logger, Validation, ContractAddress } = require('../../../shared/src');
const blockchainService = require('../services/blockchainService');
const { success, error } = require('../utils/responseFormatter');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// 缓存ABI，避免重复读取
let FACADE_ABI = null;

/**
 * 获取合约ABI
 * @param {string} contractName - 合约名称
 */
async function getContractABI(contractName) {
  if (contractName === 'RealEstateFacade' && FACADE_ABI) {
    return FACADE_ABI;
  }
  
  // 查找可能的ABI位置
  const possiblePaths = [
    path.join(__dirname, `../../../contracts/artifacts/contracts/${contractName}.sol/${contractName}.json`),
    path.join(__dirname, `../../../shared/src/abis/${contractName}.json`),
    path.join(__dirname, `../../../contracts/abis/${contractName}.json`)
  ];
  
  for (const abiPath of possiblePaths) {
    try {
      if (fs.existsSync(abiPath)) {
        const fileContent = fs.readFileSync(abiPath, 'utf8');
        const jsonContent = JSON.parse(fileContent);
        const abi = jsonContent.abi || jsonContent;
        
        if (contractName === 'RealEstateFacade') {
          FACADE_ABI = abi;
        }
        
        return abi;
      }
    } catch (e) {
      Logger.debug(`读取ABI文件失败: ${abiPath}: ${e.message}`);
    }
  }
  
  throw new Error(`无法找到${contractName}合约的ABI`);
}

/**
 * 直接创建合约实例
 * @param {string} contractName - 合约名称
 * @param {Object} options - 选项
 */
async function createContract(contractName, options = {}) {
  const { keyType, address } = options;
  
  // 获取钱包
  let wallet;
  try {
    wallet = await blockchainService.createWallet({ keyType });
  } catch (walletErr) {
    Logger.error(`创建钱包失败: ${walletErr.message}`);
    throw new Error(`创建钱包失败: ${walletErr.message}`);
  }
  
  // 获取合约地址
  const contractAddress = address || ContractAddress.getContractAddress(contractName);
  if (!contractAddress) {
    throw new Error(`无法获取${contractName}合约地址`);
  }
  
  // 获取ABI
  const abi = await getContractABI(contractName);
  
  // 直接使用ethers.js创建合约实例
  return new ethers.Contract(contractAddress, abi, wallet);
}

/**
 * 注册不动产并创建对应的代币
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function registerPropertyAndCreateToken(req, res, next) {
  try {
    const {
      propertyId,
      country,
      metadataURI,
      tokenName,
      tokenSymbol,
      initialSupply,
      propertyTokenImplementation,
      keyType
    } = req.body;

    // 验证参数
    if (!propertyId || !country || !metadataURI || !tokenName || !tokenSymbol || !initialSupply || !propertyTokenImplementation || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // 验证keyType是否为admin
    if (keyType !== 'admin') {
      return error(res, {
        message: '注册房产并创建代币需要ADMIN_ROLE权限',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, 403);
    }

    // 验证地址格式
    if (!Validation.isValidAddress(propertyTokenImplementation)) {
      return error(res, {
        message: '无效的代币实现合约地址',
        code: 'INVALID_ADDRESS'
      }, 400);
    }

    // 创建合约实例
    const realEstateFacade = await createContract('RealEstateFacade', { keyType });
    
    try {
      // 直接调用合约方法
      const tx = await realEstateFacade.registerPropertyAndCreateToken(
        propertyId,
        country,
        metadataURI,
        tokenName,
        tokenSymbol,
        initialSupply,
        propertyTokenImplementation,
        { gasLimit: 5000000 }
      );
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      // 从事件中提取信息
      let propertyIdHash, tokenAddress;
      
      // 尝试从回执中获取事件信息
      if (receipt.logs) {
        const iface = new ethers.Interface(FACADE_ABI);
        
        for (const log of receipt.logs) {
          try {
            const parsedLog = iface.parseLog({
              topics: log.topics,
              data: log.data
            });
            
            if (parsedLog && parsedLog.name === 'PropertyRegistered') {
              propertyIdHash = parsedLog.args.propertyIdHash || parsedLog.args[0];
              tokenAddress = parsedLog.args.tokenAddress || parsedLog.args[4];
              break;
            }
          } catch (e) {
            // 忽略解析错误，继续下一个日志
          }
        }
      }
      
      return success(res, {
        txHash: receipt.hash,
        propertyIdHash,
        tokenAddress,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });
    } catch (txError) {
      Logger.error(`交易失败: ${txError.message}`);
      return error(res, {
        message: `交易失败: ${txError.message}`,
        code: 'TRANSACTION_FAILED'
      }, 500);
    }
  } catch (err) {
    Logger.error(`注册不动产并创建代币失败: ${err.message}`, { error: err });
    return error(res, {
      message: `操作失败: ${err.message}`,
      code: 'OPERATION_FAILED'
    }, 500);
  }
}

/**
 * 更新不动产状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function updatePropertyStatus(req, res, next) {
  try {
    const { propertyIdHash, status, keyType } = req.body;

    // 验证参数
    if (!propertyIdHash || status === undefined || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // 验证propertyIdHash格式
    if (!Validation.isValidBytes32(propertyIdHash)) {
      return error(res, {
        message: '无效的不动产ID哈希格式',
        code: 'INVALID_PROPERTY_ID_HASH'
      }, 400);
    }

    // 验证状态值
    const validStatuses = [0, 1, 2, 3]; // Active, Locked, Suspended, Archived
    if (!validStatuses.includes(Number(status))) {
      return error(res, {
        message: '无效的状态值，有效值为: 0(活跃), 1(锁定), 2(暂停), 3(归档)',
        code: 'INVALID_STATUS'
      }, 400);
    }

    // 验证keyType
    if (!['admin', 'manager'].includes(keyType)) {
      return error(res, {
        message: '无效的密钥类型，更新状态需要manager或admin权限',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }

    // 创建合约实例
    const realEstateFacade = await createContract('RealEstateFacade', { keyType });
    
    try {
      // 直接调用合约方法
      const tx = await realEstateFacade.updatePropertyStatus(propertyIdHash, status, { gasLimit: 500000 });
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      return success(res, {
        txHash: receipt.hash,
        propertyIdHash,
        newStatus: status.toString(),
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });
    } catch (txError) {
      Logger.error(`交易失败: ${txError.message}`);
      return error(res, {
        message: `交易失败: ${txError.message}`,
        code: 'TRANSACTION_FAILED'
      }, 500);
    }
  } catch (err) {
    Logger.error(`更新不动产状态失败: ${err.message}`, { error: err });
    return error(res, {
      message: `操作失败: ${err.message}`,
      code: 'OPERATION_FAILED'
    }, 500);
  }
}

/**
 * 领取奖励
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function claimRewards(req, res, next) {
  try {
    const { distributionId, keyType } = req.body;

    // 验证参数
    if (!distributionId || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // 创建合约实例和钱包
    const realEstateFacade = await createContract('RealEstateFacade', { keyType });
    const wallet = await blockchainService.createWallet({ keyType });
    const account = await wallet.getAddress();
    
    try {
      // 直接调用合约方法
      const tx = await realEstateFacade.claimRewards(distributionId, { gasLimit: 500000 });
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      return success(res, {
        txHash: receipt.hash,
        distributionId,
        account,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });
    } catch (txError) {
      Logger.error(`交易失败: ${txError.message}`);
      return error(res, {
        message: `交易失败: ${txError.message}`,
        code: 'TRANSACTION_FAILED'
      }, 500);
    }
  } catch (err) {
    Logger.error(`领取奖励失败: ${err.message}`, { error: err });
    return error(res, {
      message: `操作失败: ${err.message}`,
      code: 'OPERATION_FAILED'
    }, 500);
  }
}

/**
 * 执行交易
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function executeTrade(req, res, next) {
  try {
    const { orderId, keyType, value: inputValue } = req.body;

    // 验证参数
    if (!orderId || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // 创建合约实例
    const realEstateFacade = await createContract('RealEstateFacade', { keyType });
    
    try {
      // 获取交易信息
      const tradeInfo = await realEstateFacade.getTradeInfo(orderId);
      const price = tradeInfo.price;
      
      // 设置交易金额
      const value = inputValue || price;
      
      // 直接调用合约方法
      const tx = await realEstateFacade.executeTrade(orderId, { 
        value: BigInt(value),
        gasLimit: 500000 
      });
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      return success(res, {
        txHash: receipt.hash,
        orderId: orderId.toString(),
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });
    } catch (txError) {
      Logger.error(`交易失败: ${txError.message}`);
      return error(res, {
        message: `交易失败: ${txError.message}`,
        code: 'TRANSACTION_FAILED'
      }, 500);
    }
  } catch (err) {
    Logger.error(`执行交易失败: ${err.message}`, { error: err });
    return error(res, {
      message: `操作失败: ${err.message}`,
      code: 'OPERATION_FAILED'
    }, 500);
  }
}

/**
 * 获取RealEstateFacade合约版本
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getVersion(req, res, next) {
  try {
    // 创建只读合约实例
    const provider = await blockchainService.getProvider();
    const address = ContractAddress.getContractAddress('RealEstateFacade');
    const abi = await getContractABI('RealEstateFacade');
    const contract = new ethers.Contract(address, abi, provider);
    
    // 获取版本
    const version = await contract.getVersion();
    
    return success(res, {
      version: version.toString()
    });
  } catch (err) {
    Logger.error(`获取合约版本失败: ${err.message}`, { error: err });
    return error(res, {
      message: `操作失败: ${err.message}`,
      code: 'OPERATION_FAILED'
    }, 500);
  }
}

/**
 * 分配奖励
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function distributeRewards(req, res, next) {
  try {
    const { propertyIdHash, amount, description, keyType } = req.body;

    // 验证参数
    if (!propertyIdHash || !amount || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }

    // 验证propertyIdHash格式
    if (!Validation.isValidBytes32(propertyIdHash)) {
      return error(res, {
        message: '无效的不动产ID哈希格式',
        code: 'INVALID_PROPERTY_ID_HASH'
      }, 400);
    }

    // 只有manager和admin可以分配奖励
    if (!['admin', 'manager'].includes(keyType)) {
      return error(res, {
        message: '分配奖励需要manager或admin权限',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }

    // 创建合约实例
    const realEstateFacade = await createContract('RealEstateFacade', { keyType });
    const rewardDescription = description || '收益分配';
    
    try {
      // 直接调用合约方法
      const tx = await realEstateFacade.distributeRewards(
        propertyIdHash, 
        amount, 
        rewardDescription, 
        { 
          value: BigInt(amount),
          gasLimit: 500000 
        }
      );
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      return success(res, {
        txHash: receipt.hash,
        propertyIdHash,
        amount,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });
    } catch (txError) {
      Logger.error(`交易失败: ${txError.message}`);
      return error(res, {
        message: `交易失败: ${txError.message}`,
        code: 'TRANSACTION_FAILED'
      }, 500);
    }
  } catch (err) {
    Logger.error(`分配奖励失败: ${err.message}`, { error: err });
    return error(res, {
      message: `操作失败: ${err.message}`,
      code: 'OPERATION_FAILED'
    }, 500);
  }
}

module.exports = {
  registerPropertyAndCreateToken,
  updatePropertyStatus,
  claimRewards,
  executeTrade,
  getVersion,
  distributeRewards
}; 