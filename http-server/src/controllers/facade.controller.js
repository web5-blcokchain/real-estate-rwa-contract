/**
 * RealEstateFacade合约控制器
 * 实现RealEstateFacade合约中尚未在其他控制器中实现的功能
 */
const { Logger, Validation } = require('../../../shared/src');
const blockchainService = require('../services/blockchainService');
const { success, error } = require('../utils/responseFormatter');

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

    // 验证keyType是否有效
    if (!['admin', 'manager', 'operator'].includes(keyType)) {
      return error(res, {
        message: '无效的密钥类型，有效值为: admin, manager, operator',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }

    // 验证地址格式
    if (!Validation.isValidAddress(propertyTokenImplementation)) {
      return error(res, {
        message: '无效的代币实现合约地址',
        code: 'INVALID_ADDRESS'
      }, 400);
    }

    // 获取RealEstateFacade合约实例（带钱包）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });

    // 注册不动产并创建代币
    const tx = await blockchainService.callContractMethod(
      facade,
      'registerPropertyAndCreateToken',
      [
        propertyId,
        country,
        metadataURI,
        tokenName,
        tokenSymbol,
        initialSupply,
        propertyTokenImplementation
      ],
      { gasLimit: 5000000 } // 为复杂操作提供足够的gas
    );

    // 等待交易完成
    const receipt = await tx.wait();

    // 从事件中获取propertyIdHash和tokenAddress
    let propertyIdHash, tokenAddress;
    for (const event of receipt.logs) {
      try {
        const parsedEvent = facade.interface.parseLog(event);
        if (parsedEvent && parsedEvent.name === 'PropertyRegistered') {
          propertyIdHash = parsedEvent.args.propertyIdHash;
          tokenAddress = parsedEvent.args.tokenAddress;
          break;
        }
      } catch (e) {
        // 忽略不能解析的事件
      }
    }

    return success(res, {
      txHash: receipt.hash,
      propertyIdHash,
      tokenAddress,
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber
    });
  } catch (err) {
    Logger.error('注册不动产并创建代币失败', { error: err });
    return next(err);
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

    // 验证keyType是否有效
    if (!['admin', 'manager', 'operator'].includes(keyType)) {
      return error(res, {
        message: '无效的密钥类型，有效值为: admin, manager, operator',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }

    // 获取RealEstateFacade合约实例（带钱包）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });

    // 获取当前状态以记录变更
    let currentStatus;
    try {
      // 获取PropertyManager合约地址
      const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
      const propertyManager = await blockchainService.createContract('PropertyManager', { address: propertyManagerAddress });
      currentStatus = await blockchainService.callContractMethod(propertyManager, 'getPropertyStatus', [propertyIdHash]);
    } catch (err) {
      Logger.warn(`无法获取不动产当前状态: ${propertyIdHash}`, { error: err.message });
    }

    // 更新不动产状态
    const tx = await blockchainService.callContractMethod(facade, 'updatePropertyStatus', [propertyIdHash, status]);
    const receipt = await tx.wait();

    return success(res, {
      txHash: receipt.hash,
      propertyIdHash,
      previousStatus: currentStatus !== undefined ? currentStatus.toString() : undefined,
      newStatus: status.toString(),
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber
    });
  } catch (err) {
    Logger.error(`更新不动产状态失败: ${req.body.propertyIdHash}`, { error: err });
    return next(err);
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

    // 验证keyType是否有效
    if (!['admin', 'manager', 'operator', 'user'].includes(keyType)) {
      return error(res, {
        message: '无效的密钥类型，有效值为: admin, manager, operator, user',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }

    // 获取RealEstateFacade合约实例（带钱包）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });

    // 获取钱包地址
    const wallet = await blockchainService.createWallet({ keyType });
    const account = await wallet.getAddress();

    // 调用合约方法
    const tx = await blockchainService.callContractMethod(facade, 'claimRewards', [distributionId]);
    const receipt = await tx.wait();

    return success(res, {
      txHash: receipt.hash,
      distributionId,
      account,
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber
    });
  } catch (err) {
    Logger.error(`领取奖励失败: ${req.body.distributionId}`, { error: err });
    return next(err);
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

    // 验证keyType是否有效
    if (!['admin', 'manager', 'operator', 'user'].includes(keyType)) {
      return error(res, {
        message: '无效的密钥类型，有效值为: admin, manager, operator, user',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }

    // 获取RealEstateFacade合约实例（带钱包）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });

    // 获取交易信息
    const { seller, token, amount, price } = await blockchainService.callContractMethod(
      facade,
      'getTradeInfo',
      [orderId]
    );

    // 确保value不小于price
    let finalValue;
    if (inputValue === undefined) {
      finalValue = price;
    } else if (BigInt(inputValue) < BigInt(price)) {
      return error(res, {
        message: '提供的ETH不足以支付订单价格',
        code: 'INSUFFICIENT_VALUE'
      }, 400);
    } else {
      finalValue = inputValue;
    }

    // 执行交易
    const tx = await blockchainService.callContractMethod(
      facade,
      'executeTrade',
      [orderId],
      { value: BigInt(finalValue) }
    );
    
    const receipt = await tx.wait();

    return success(res, {
      txHash: receipt.hash,
      orderId: orderId.toString(),
      seller,
      token,
      amount: amount.toString(),
      price: price.toString(),
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber
    });
  } catch (err) {
    Logger.error(`执行交易失败: ${req.body.orderId}`, { error: err });
    return next(err);
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
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取版本信息
    const version = await blockchainService.callContractMethod(facade, 'getVersion');
    
    return success(res, {
      version: version.toString()
    });
  } catch (err) {
    Logger.error('获取RealEstateFacade合约版本失败', { error: err });
    return next(err);
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

    // 验证keyType是否有效
    if (!['admin', 'manager', 'operator'].includes(keyType)) {
      return error(res, {
        message: '无效的密钥类型，有效值为: admin, manager, operator',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }

    // 获取RealEstateFacade合约实例（带钱包）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });

    // 准备分配描述
    const rewardDescription = description || '收益分配';

    // 分配奖励
    const tx = await blockchainService.sendContractTransaction(
      facade,
      'distributeRewards',
      [propertyIdHash, amount, rewardDescription],
      { 
        keyType,
        value: amount // 发送相应金额的ETH
      }
    );

    // 从事件中获取distributionId
    let distributionId;
    for (const event of tx.logs) {
      try {
        const parsedEvent = facade.interface.parseLog(event);
        if (parsedEvent && parsedEvent.name === 'RewardsDistributed') {
          distributionId = parsedEvent.args.distributionId.toString();
          break;
        }
      } catch (e) {
        // 忽略不能解析的事件
      }
    }

    return success(res, {
      txHash: tx.hash,
      distributionId,
      totalAmount: amount,
      gasUsed: tx.gasUsed.toString(),
      blockNumber: tx.blockNumber
    });
  } catch (err) {
    Logger.error(`分配奖励失败: ${req.body.propertyIdHash}`, { error: err });
    return next(err);
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