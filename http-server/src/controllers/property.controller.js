/**
 * 房产管理控制器
 */
const { Logger, Validation } = require('../../../shared/src');
const blockchainService = require('../services/blockchainService');
const { success, error, paginated } = require('../utils/responseFormatter');

/**
 * 获取所有房产
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getAllProperties(req, res, next) {
  try {
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status ? parseInt(req.query.status) : null;
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取PropertyManager合约实例
    const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
    const propertyManager = await blockchainService.createContract('PropertyManager', { address: propertyManagerAddress });
    
    // 获取房产总数
    const totalCount = await blockchainService.callContractMethod(propertyManager, 'getPropertyCount');
    const totalItems = parseInt(totalCount.toString());
    
    // 计算分页信息
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    
    // 获取房产列表
    let properties = [];
    for (let i = startIndex; i < endIndex; i++) {
      try {
        // 获取房产ID哈希
        const propertyIdHash = await blockchainService.callContractMethod(propertyManager, 'getPropertyIdHashAtIndex', [i]);
        
        // 获取房产详情
        const property = await blockchainService.callContractMethod(propertyManager, 'getProperty', [propertyIdHash]);
        
        // 如果指定了状态筛选，则检查
        if (status !== null && parseInt(property.status.toString()) !== status) {
          continue;
        }
        
        // 获取通证信息
        let tokenInfo = {};
        if (property.token !== '0x0000000000000000000000000000000000000000') {
          try {
            const tokenContract = await blockchainService.createContract('PropertyToken', { address: property.token });
            tokenInfo = {
              tokenName: await blockchainService.callContractMethod(tokenContract, 'name'),
              tokenSymbol: await blockchainService.callContractMethod(tokenContract, 'symbol'),
              totalSupply: (await blockchainService.callContractMethod(tokenContract, 'totalSupply')).toString()
            };
          } catch (err) {
            Logger.warn(`获取通证信息失败: ${property.token}`, { error: err.message });
          }
        }
        
        // 整理房产数据
        properties.push({
          propertyIdHash,
          propertyId: property.propertyId,
          country: property.country,
          metadataURI: property.metadataURI,
          registeredBy: property.registeredBy,
          registrationTime: parseInt(property.registrationTime.toString()) * 1000, // 转换为毫秒
          status: parseInt(property.status.toString()),
          token: property.token,
          ...tokenInfo
        });
      } catch (err) {
        Logger.warn(`获取房产索引 ${i} 失败`, { error: err.message });
      }
    }
    
    // 返回分页结果
    return paginated(res, properties, {
      page,
      pageSize: limit,
      totalItems,
      totalPages
    });
  } catch (err) {
    Logger.error('获取房产列表失败', { error: err });
    return next(err);
  }
}

/**
 * 根据ID获取房产详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getPropertyById(req, res, next) {
  try {
    const { propertyIdHash } = req.params;
    
    // 验证房产ID哈希
    if (!Validation.isValidBytes32(propertyIdHash)) {
      return error(res, {
        message: '无效的房产ID哈希格式',
        code: 'INVALID_PROPERTY_ID_HASH'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取PropertyManager合约实例
    const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
    const propertyManager = await blockchainService.createContract('PropertyManager', { address: propertyManagerAddress });
    
    // 获取房产详情
    const property = await blockchainService.callContractMethod(propertyManager, 'getProperty', [propertyIdHash]);
    
    // 检查房产是否存在
    if (!property || property.propertyId === '') {
      return error(res, {
        message: `房产不存在: ${propertyIdHash}`,
        code: 'PROPERTY_NOT_FOUND'
      }, 404);
    }
    
    // 获取通证信息
    let tokenInfo = {};
    if (property.token !== '0x0000000000000000000000000000000000000000') {
      try {
        const tokenContract = await blockchainService.createContract('PropertyToken', { address: property.token });
        tokenInfo = {
          tokenName: await blockchainService.callContractMethod(tokenContract, 'name'),
          tokenSymbol: await blockchainService.callContractMethod(tokenContract, 'symbol'),
          totalSupply: (await blockchainService.callContractMethod(tokenContract, 'totalSupply')).toString(),
          decimals: await blockchainService.callContractMethod(tokenContract, 'decimals')
        };
        
        // 获取当前售卖中的订单
        try {
          const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
          const tradingManager = await blockchainService.createContract('TradingManager', { address: tradingManagerAddress });
          
          // 获取活跃订单数量
          const activeOrdersCount = await blockchainService.callContractMethod(tradingManager, 'getActiveOrdersCountByToken', [property.token]);
          
          if (activeOrdersCount.gt(0)) {
            // 获取活跃订单
            let activeOrders = [];
            for (let i = 0; i < Math.min(activeOrdersCount.toNumber(), 5); i++) {
              try {
                const orderId = await blockchainService.callContractMethod(tradingManager, 'getActiveOrderIdByTokenAndIndex', [property.token, i]);
                const order = await blockchainService.callContractMethod(tradingManager, 'getOrder', [orderId]);
                
                activeOrders.push({
                  orderId: orderId.toString(),
                  seller: order.seller,
                  amount: order.amount.toString(),
                  price: order.price.toString()
                });
              } catch (err) {
                Logger.warn(`获取活跃订单失败: 索引 ${i}`, { error: err.message });
              }
            }
            
            tokenInfo.activeOrders = activeOrders;
            tokenInfo.activeOrdersCount = activeOrdersCount.toString();
          }
        } catch (err) {
          Logger.warn(`获取活跃订单信息失败: ${property.token}`, { error: err.message });
        }
      } catch (err) {
        Logger.warn(`获取通证信息失败: ${property.token}`, { error: err.message });
      }
    }
    
    // 整理房产数据
    const propertyData = {
      propertyIdHash,
      propertyId: property.propertyId,
      country: property.country,
      metadataURI: property.metadataURI,
      registeredBy: property.registeredBy,
      registrationTime: parseInt(property.registrationTime.toString()) * 1000, // 转换为毫秒
      status: parseInt(property.status.toString()),
      token: property.token,
      ...tokenInfo
    };
    
    // 尝试获取元数据
    if (property.metadataURI && property.metadataURI.startsWith('http')) {
      try {
        // 使用fetch获取元数据
        const response = await fetch(property.metadataURI);
        if (response.ok) {
          const metadata = await response.json();
          propertyData.metadata = metadata;
        }
      } catch (err) {
        Logger.warn(`获取房产元数据失败: ${property.metadataURI}`, { error: err.message });
      }
    }
    
    return success(res, propertyData);
  } catch (err) {
    Logger.error(`获取房产详情失败: ${req.params.propertyIdHash}`, { error: err });
    return next(err);
  }
}

/**
 * 注册新房产并创建通证
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function registerProperty(req, res, next) {
  try {
    const { 
      propertyId, 
      country, 
      metadataURI, 
      tokenName, 
      tokenSymbol, 
      initialSupply,
      walletType = 'PROPERTY_MANAGER'  // 使用默认的钱包类型，而不是用户提供的私钥
    } = req.body;
    
    // 验证参数
    if (!propertyId || !country || !metadataURI || !tokenName || !tokenSymbol || !initialSupply) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证初始供应量是否为有效数字
    if (isNaN(parseInt(initialSupply)) || parseInt(initialSupply) <= 0) {
      return error(res, {
        message: '初始供应量必须为正整数',
        code: 'INVALID_INITIAL_SUPPLY'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例（使用 keyType）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType: walletType });
    
    // 获取PropertyManager合约实例
    const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
    const propertyManager = await blockchainService.createContract('PropertyManager', { 
      address: propertyManagerAddress, 
      keyType: walletType 
    });
    
    // 计算房产ID哈希
    const propertyIdHash = await blockchainService.callContractMethod(propertyManager, 'calculatePropertyIdHash', [propertyId]);
    
    // 检查房产是否已存在
    try {
      const existingProperty = await blockchainService.callContractMethod(propertyManager, 'getProperty', [propertyIdHash]);
      
      if (existingProperty && existingProperty.propertyId !== '') {
        return error(res, {
          message: `房产已注册: ${propertyId}`,
          code: 'PROPERTY_ALREADY_REGISTERED',
          propertyIdHash
        }, 409);
      }
    } catch (err) {
      // 忽略不存在的错误，继续注册
    }
    
    // 注册房产并创建通证
    try {
      const tx = await blockchainService.sendContractTransaction(
        facade,
        'registerPropertyAndCreateToken',
        [propertyId, country, metadataURI, tokenName, tokenSymbol, initialSupply],
        { keyType: walletType }
      );
      
      // 获取通证地址
      let tokenAddress;
      
      // 如果有事件日志，尝试解析事件获取通证地址
      if (tx.logs && tx.logs.length > 0) {
        for (const log of tx.logs) {
          try {
            const event = facade.interface.parseLog(log);
            if (event.name === 'PropertyTokenCreated') {
              tokenAddress = event.args.token;
              break;
            }
          } catch (e) {
            // 忽略无法解析的日志
          }
        }
      }
      
      // 如果无法从事件获取通证地址，则直接查询
      if (!tokenAddress) {
        const property = await blockchainService.callContractMethod(propertyManager, 'getProperty', [propertyIdHash]);
        tokenAddress = property.token;
      }
      
      // 返回结果
      return success(res, {
        txHash: tx.hash,
        propertyIdHash,
        tokenAddress,
        propertyId,
        country,
        metadataURI,
        tokenName,
        tokenSymbol,
        initialSupply,
        walletType
      }, 201);
    } catch (err) {
      Logger.error(`注册房产失败: ${err.message}`, { error: err });
      return error(res, {
        message: '注册房产失败',
        code: 'PROPERTY_REGISTRATION_FAILED',
        details: err.message
      }, 500);
    }
  } catch (err) {
    Logger.error('注册房产失败', { error: err });
    return next(err);
  }
}

/**
 * 获取房产通证持有人列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getTokenHolders(req, res, next) {
  try {
    const { propertyIdHash } = req.params;
    
    // 验证房产ID哈希
    if (!Validation.isValidBytes32(propertyIdHash)) {
      return error(res, {
        message: '无效的房产ID哈希格式',
        code: 'INVALID_PROPERTY_ID_HASH'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取PropertyManager合约实例
    const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
    const propertyManager = await blockchainService.createContract('PropertyManager', { address: propertyManagerAddress });
    
    // 获取房产详情
    const property = await blockchainService.callContractMethod(propertyManager, 'getProperty', [propertyIdHash]);
    
    // 检查房产是否存在
    if (!property || property.propertyId === '') {
      return error(res, {
        message: `房产不存在: ${propertyIdHash}`,
        code: 'PROPERTY_NOT_FOUND'
      }, 404);
    }
    
    // 检查房产是否已创建通证
    if (property.token === '0x0000000000000000000000000000000000000000') {
      return error(res, {
        message: `该房产尚未创建通证`,
        code: 'TOKEN_NOT_CREATED'
      }, 400);
    }
    
    // 获取持有人数据
    // 注意：获取所有持有人需要链下索引或链上事件监听，这里简化为模拟数据
    // 实际应用中应该从数据库或通过解析Transfer事件来获取
    const holderData = [
      {
        address: property.registeredBy,
        balance: (await blockchainService.callContractMethod(
          await blockchainService.createContract('PropertyToken', { address: property.token }),
          'balanceOf',
          [property.registeredBy]
        )).toString(),
        percentage: '100'
      }
    ];
    
    return success(res, {
      propertyIdHash,
      propertyId: property.propertyId,
      token: property.token,
      holders: holderData
    });
  } catch (err) {
    Logger.error(`获取通证持有人失败: ${req.params.propertyIdHash}`, { error: err });
    return next(err);
  }
}

module.exports = {
  getAllProperties,
  getPropertyById,
  registerProperty,
  getTokenHolders
}; 