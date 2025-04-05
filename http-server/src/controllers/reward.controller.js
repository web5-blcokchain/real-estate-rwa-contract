/**
 * 奖励分红控制器
 */
const { Logger, Validation } = require('../../../shared/src');
const contractService = require('../services/contractService');
const { success, error, paginated } = require('../utils/responseFormatter');

/**
 * 获取所有分红分配
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getAllDistributions(req, res, next) {
  try {
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const propertyIdHash = req.query.property;
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取RewardManager合约实例
    const rewardManagerAddress = await contractService.callMethod(facade, 'rewardManager');
    const rewardManager = await contractService.createContractInstance('RewardManager', { address: rewardManagerAddress });
    
    // 获取分红总数
    const totalCount = await contractService.callMethod(rewardManager, 'getTotalDistributions');
    const totalItems = parseInt(totalCount.toString());
    
    // 计算分页信息
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    
    // 获取分红列表
    let distributions = [];
    for (let i = startIndex; i < endIndex; i++) {
      try {
        // 获取分红ID
        const distributionId = await contractService.callMethod(rewardManager, 'getDistributionIdAtIndex', [i]);
        
        // 获取分红详情
        const distribution = await contractService.callMethod(rewardManager, 'getDistribution', [distributionId]);
        
        // 如果设置了房产过滤，则检查该分红是否属于指定房产
        if (propertyIdHash && distribution.propertyIdHash !== propertyIdHash) {
          continue;
        }
        
        // 获取房产信息
        let propertyInfo = {};
        try {
          const propertyManager = await contractService.callMethod(facade, 'propertyManager');
          const propertyManagerContract = await contractService.createContractInstance('PropertyManager', { address: propertyManager });
          
          const property = await contractService.callMethod(propertyManagerContract, 'getProperty', [distribution.propertyIdHash]);
          
          propertyInfo = {
            propertyId: property.propertyId,
            token: property.token
          };
          
          // 获取通证符号
          if (property.token !== '0x0000000000000000000000000000000000000000') {
            const tokenContract = await contractService.createContractInstance('PropertyToken', { address: property.token });
            propertyInfo.tokenSymbol = await contractService.callMethod(tokenContract, 'symbol');
          }
        } catch (err) {
          Logger.warn(`获取房产信息失败: ${distribution.propertyIdHash}`, { error: err.message });
        }
        
        // 整理分红数据
        distributions.push({
          distributionId: distributionId.toString(),
          propertyIdHash: distribution.propertyIdHash,
          amount: distribution.amount.toString(),
          description: distribution.description,
          timestamp: parseInt(distribution.timestamp.toString()) * 1000, // 转换为毫秒
          distributedBy: distribution.distributedBy,
          ...propertyInfo
        });
      } catch (err) {
        Logger.warn(`获取分红索引 ${i} 失败`, { error: err.message });
      }
    }
    
    // 返回分页结果
    return paginated(res, distributions, {
      page,
      pageSize: limit,
      totalItems,
      totalPages
    });
  } catch (err) {
    Logger.error('获取分红列表失败', { error: err });
    return next(err);
  }
}

/**
 * 获取分红详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getDistributionById(req, res, next) {
  try {
    const { distributionId } = req.params;
    
    // 验证分红ID
    if (isNaN(parseInt(distributionId))) {
      return error(res, {
        message: '无效的分红ID',
        code: 'INVALID_DISTRIBUTION_ID'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取RewardManager合约实例
    const rewardManagerAddress = await contractService.callMethod(facade, 'rewardManager');
    const rewardManager = await contractService.createContractInstance('RewardManager', { address: rewardManagerAddress });
    
    // 获取分红详情
    const distribution = await contractService.callMethod(rewardManager, 'getDistribution', [distributionId]);
    
    // 检查分红是否存在
    if (!distribution || distribution.distributedBy === '0x0000000000000000000000000000000000000000') {
      return error(res, {
        message: `分红不存在: ${distributionId}`,
        code: 'DISTRIBUTION_NOT_FOUND'
      }, 404);
    }
    
    // 获取房产信息
    let propertyInfo = {};
    let tokenHolders = [];
    
    try {
      // 获取房产管理器
      const propertyManager = await contractService.callMethod(facade, 'propertyManager');
      const propertyManagerContract = await contractService.createContractInstance('PropertyManager', { address: propertyManager });
      
      // 获取房产详情
      const property = await contractService.callMethod(propertyManagerContract, 'getProperty', [distribution.propertyIdHash]);
      
      propertyInfo = {
        propertyId: property.propertyId,
        propertyIdHash: distribution.propertyIdHash,
        token: property.token,
        status: parseInt(property.status.toString())
      };
      
      // 获取通证信息和持有人
      if (property.token !== '0x0000000000000000000000000000000000000000') {
        const tokenContract = await contractService.createContractInstance('PropertyToken', { address: property.token });
        propertyInfo.tokenSymbol = await contractService.callMethod(tokenContract, 'symbol');
        propertyInfo.tokenName = await contractService.callMethod(tokenContract, 'name');
        propertyInfo.totalSupply = (await contractService.callMethod(tokenContract, 'totalSupply')).toString();
        
        // 获取通证持有人分红明细
        const holdersCount = Math.min(10, await contractService.callMethod(rewardManager, 'getHoldersClaimableCount', [distributionId]));
        for (let i = 0; i < holdersCount; i++) {
          try {
            const holderAddress = await contractService.callMethod(rewardManager, 'getHolderAddressAtIndex', [distributionId, i]);
            const holderAmount = await contractService.callMethod(rewardManager, 'getHolderClaimableAmount', [distributionId, holderAddress]);
            const claimed = await contractService.callMethod(rewardManager, 'hasHolderClaimedReward', [distributionId, holderAddress]);
            
            tokenHolders.push({
              address: holderAddress,
              amount: holderAmount.toString(),
              claimed
            });
          } catch (err) {
            Logger.warn(`获取持有人分红信息失败: ${i}`, { error: err.message });
          }
        }
      }
    } catch (err) {
      Logger.warn(`获取房产或通证信息失败: ${distribution.propertyIdHash}`, { error: err.message });
    }
    
    // 整理分红数据
    const distributionData = {
      distributionId: distributionId.toString(),
      propertyIdHash: distribution.propertyIdHash,
      amount: distribution.amount.toString(),
      description: distribution.description,
      timestamp: parseInt(distribution.timestamp.toString()) * 1000, // 转换为毫秒
      distributedBy: distribution.distributedBy,
      ...propertyInfo,
      holders: tokenHolders
    };
    
    return success(res, distributionData);
  } catch (err) {
    Logger.error(`获取分红详情失败: ${req.params.distributionId}`, { error: err });
    return next(err);
  }
}

/**
 * 创建分红分配
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function createDistribution(req, res, next) {
  try {
    const { propertyIdHash, amount, description, privateKey } = req.body;
    
    // 验证参数
    if (!propertyIdHash || !amount || !description || !privateKey) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证私钥格式
    if (!Validation.isValidPrivateKey(privateKey)) {
      return error(res, {
        message: '无效的私钥格式',
        code: 'INVALID_PRIVATE_KEY'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 验证房产存在
    const propertyManager = await contractService.callMethod(facade, 'propertyManager');
    const propertyManagerContract = await contractService.createContractInstance('PropertyManager', { address: propertyManager });
    
    try {
      const property = await contractService.callMethod(propertyManagerContract, 'getProperty', [propertyIdHash]);
      
      // 检查房产是否存在
      if (property.propertyId === '') {
        return error(res, {
          message: `房产不存在: ${propertyIdHash}`,
          code: 'PROPERTY_NOT_FOUND'
        }, 404);
      }
      
      // 检查是否已创建通证
      if (property.token === '0x0000000000000000000000000000000000000000') {
        return error(res, {
          message: `该房产尚未创建通证，无法分配分红`,
          code: 'TOKEN_NOT_CREATED'
        }, 400);
      }
    } catch (err) {
      Logger.error(`验证房产失败: ${propertyIdHash}`, { error: err });
      return error(res, {
        message: '验证房产失败',
        code: 'PROPERTY_VALIDATION_FAILED',
        details: err.message
      }, 500);
    }
    
    // 创建分红
    try {
      const facadeWithWallet = await contractService.createContractInstance('RealEstateFacade', { privateKey });
      
      const tx = await contractService.sendTransaction(
        facadeWithWallet,
        'distributeRewards',
        [propertyIdHash, amount, description],
        { 
          privateKey,
          value: amount // 发送分红金额
        }
      );
      
      // 从事件中获取新创建的分红ID
      let distributionId = null;
      
      // 如果有事件，解析事件数据
      if (tx.logs && tx.logs.length > 0) {
        // 查找RewardDistributed事件
        for (const log of tx.logs) {
          try {
            // 解析事件数据
            const event = facadeWithWallet.interface.parseLog(log);
            if (event.name === 'RewardDistributed') {
              distributionId = event.args.distributionId.toString();
              break;
            }
          } catch (e) {
            // 忽略无法解析的日志
          }
        }
      }
      
      // 如果无法从事件获取分红ID，则尝试从RewardManager获取最新分红
      if (!distributionId) {
        const rewardManagerAddress = await contractService.callMethod(facade, 'rewardManager');
        const rewardManager = await contractService.createContractInstance('RewardManager', { address: rewardManagerAddress });
        const totalDistributions = await contractService.callMethod(rewardManager, 'getTotalDistributions');
        const latestDistributionId = await contractService.callMethod(rewardManager, 'getDistributionIdAtIndex', [totalDistributions - 1]);
        distributionId = latestDistributionId.toString();
      }
      
      // 返回结果
      return success(res, {
        distributionId,
        txHash: tx.hash,
        propertyIdHash,
        amount
      }, 201);
    } catch (err) {
      Logger.error(`创建分红失败: ${err.message}`, { error: err });
      return error(res, {
        message: '创建分红失败',
        code: 'DISTRIBUTION_CREATION_FAILED',
        details: err.message
      }, 500);
    }
  } catch (err) {
    Logger.error('创建分红失败', { error: err });
    return next(err);
  }
}

/**
 * 领取分红奖励
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function claimRewards(req, res, next) {
  try {
    const { distributionId } = req.params;
    const { privateKey } = req.body;
    
    // 验证分红ID
    if (isNaN(parseInt(distributionId))) {
      return error(res, {
        message: '无效的分红ID',
        code: 'INVALID_DISTRIBUTION_ID'
      }, 400);
    }
    
    // 验证私钥格式
    if (!privateKey || !Validation.isValidPrivateKey(privateKey)) {
      return error(res, {
        message: '无效的私钥格式',
        code: 'INVALID_PRIVATE_KEY'
      }, 400);
    }
    
    // 创建钱包
    const provider = await contractService.blockchainService.getProvider();
    const wallet = await contractService.blockchainService.createWalletFromPrivateKey(privateKey, provider);
    const address = await wallet.getAddress();
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取RewardManager合约实例
    const rewardManagerAddress = await contractService.callMethod(facade, 'rewardManager');
    const rewardManager = await contractService.createContractInstance('RewardManager', { 
      address: rewardManagerAddress,
      wallet
    });
    
    // 验证分红存在
    try {
      const distribution = await contractService.callMethod(rewardManager, 'getDistribution', [distributionId]);
      
      if (!distribution || distribution.distributedBy === '0x0000000000000000000000000000000000000000') {
        return error(res, {
          message: `分红不存在: ${distributionId}`,
          code: 'DISTRIBUTION_NOT_FOUND'
        }, 404);
      }
    } catch (err) {
      return error(res, {
        message: `分红不存在: ${distributionId}`,
        code: 'DISTRIBUTION_NOT_FOUND'
      }, 404);
    }
    
    // 检查是否已领取
    const claimed = await contractService.callMethod(rewardManager, 'hasHolderClaimedReward', [distributionId, address]);
    
    if (claimed) {
      return error(res, {
        message: '您已经领取过此分红',
        code: 'ALREADY_CLAIMED'
      }, 400);
    }
    
    // 获取可领取金额
    const claimableAmount = await contractService.callMethod(rewardManager, 'getHolderClaimableAmount', [distributionId, address]);
    
    if (claimableAmount.eq(0)) {
      return error(res, {
        message: '没有可领取的分红',
        code: 'NO_CLAIMABLE_AMOUNT'
      }, 400);
    }
    
    // 领取分红
    const tx = await contractService.sendTransaction(
      rewardManager,
      'claimReward',
      [distributionId],
      { wallet }
    );
    
    // 返回结果
    return success(res, {
      txHash: tx.hash,
      amount: claimableAmount.toString()
    });
  } catch (err) {
    Logger.error(`领取分红失败: ${req.params.distributionId}`, { error: err });
    return next(err);
  }
}

/**
 * 获取可领取金额
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getClaimableAmount(req, res, next) {
  try {
    const { distributionId, address } = req.params;
    
    // 验证分红ID
    if (isNaN(parseInt(distributionId))) {
      return error(res, {
        message: '无效的分红ID',
        code: 'INVALID_DISTRIBUTION_ID'
      }, 400);
    }
    
    // 验证地址格式
    if (!address || !Validation.isValidAddress(address)) {
      return error(res, {
        message: '无效的地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取RewardManager合约实例
    const rewardManagerAddress = await contractService.callMethod(facade, 'rewardManager');
    const rewardManager = await contractService.createContractInstance('RewardManager', { address: rewardManagerAddress });
    
    // 验证分红存在
    try {
      const distribution = await contractService.callMethod(rewardManager, 'getDistribution', [distributionId]);
      
      if (!distribution || distribution.distributedBy === '0x0000000000000000000000000000000000000000') {
        return error(res, {
          message: `分红不存在: ${distributionId}`,
          code: 'DISTRIBUTION_NOT_FOUND'
        }, 404);
      }
    } catch (err) {
      return error(res, {
        message: `分红不存在: ${distributionId}`,
        code: 'DISTRIBUTION_NOT_FOUND'
      }, 404);
    }
    
    // 获取可领取金额
    const claimableAmount = await contractService.callMethod(rewardManager, 'getHolderClaimableAmount', [distributionId, address]);
    
    // 检查是否已领取
    const claimed = await contractService.callMethod(rewardManager, 'hasHolderClaimedReward', [distributionId, address]);
    
    // 返回结果
    return success(res, {
      claimable: claimableAmount.toString(),
      claimed: claimed ? '1' : '0',
      total: claimableAmount.toString()
    });
  } catch (err) {
    Logger.error(`获取可领取金额失败: ${req.params.distributionId} ${req.params.address}`, { error: err });
    return next(err);
  }
}

/**
 * 获取用户可领取的奖励列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getUserClaimableRewards(req, res, next) {
  try {
    const { address } = req.params;
    
    // 验证地址格式
    if (!Validation.isValidAddress(address)) {
      return error(res, {
        message: '无效的钱包地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取RewardManager合约实例
    const rewardManagerAddress = await contractService.callMethod(facade, 'rewardManager');
    const rewardManager = await contractService.createContractInstance('RewardManager', { address: rewardManagerAddress });
    
    // 获取分红总数
    const totalCount = await contractService.callMethod(rewardManager, 'getTotalDistributions');
    
    // 获取用户可领取的奖励列表
    let claimableRewards = [];
    
    for (let i = 0; i < totalCount; i++) {
      try {
        const distributionId = await contractService.callMethod(rewardManager, 'getDistributionIdAtIndex', [i]);
        const claimableAmount = await contractService.callMethod(rewardManager, 'getHolderClaimableAmount', [distributionId, address]);
        
        // 跳过没有可领取金额的分红
        if (claimableAmount.eq(0)) {
          continue;
        }
        
        // 检查是否已领取
        const claimed = await contractService.callMethod(rewardManager, 'hasHolderClaimedReward', [distributionId, address]);
        
        // 跳过已领取的分红
        if (claimed) {
          continue;
        }
        
        // 获取分红详情
        const distribution = await contractService.callMethod(rewardManager, 'getDistribution', [distributionId]);
        
        // 获取房产信息
        let propertyInfo = {};
        try {
          const propertyManager = await contractService.callMethod(facade, 'propertyManager');
          const propertyManagerContract = await contractService.createContractInstance('PropertyManager', { address: propertyManager });
          
          const property = await contractService.callMethod(propertyManagerContract, 'getProperty', [distribution.propertyIdHash]);
          
          propertyInfo = {
            propertyId: property.propertyId,
            token: property.token
          };
          
          // 获取通证符号
          if (property.token !== '0x0000000000000000000000000000000000000000') {
            const tokenContract = await contractService.createContractInstance('PropertyToken', { address: property.token });
            propertyInfo.tokenSymbol = await contractService.callMethod(tokenContract, 'symbol');
          }
        } catch (err) {
          Logger.warn(`获取房产信息失败: ${distribution.propertyIdHash}`, { error: err.message });
        }
        
        // 整理分红数据
        claimableRewards.push({
          distributionId: distributionId.toString(),
          propertyIdHash: distribution.propertyIdHash,
          totalAmount: distribution.amount.toString(),
          claimableAmount: claimableAmount.toString(),
          description: distribution.description,
          timestamp: parseInt(distribution.timestamp.toString()) * 1000, // 转换为毫秒
          ...propertyInfo
        });
      } catch (err) {
        Logger.warn(`获取分红索引 ${i} 失败`, { error: err.message });
      }
    }
    
    // 返回结果
    return success(res, claimableRewards);
  } catch (err) {
    Logger.error(`获取用户可领取奖励失败: ${req.params.address}`, { error: err });
    return next(err);
  }
}

module.exports = {
  getAllDistributions,
  getDistributionById,
  createDistribution,
  claimRewards,
  getClaimableAmount,
  getUserClaimableRewards
}; 