/**
 * 系统管理控制器
 */
const { Logger, Validation } = require('../../../shared/src');
const blockchainService = require('../services/blockchainService');
const { success, error, paginated } = require('../utils/responseFormatter');
const fs = require('fs');
const path = require('path');

/**
 * 获取系统状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getSystemStatus(req, res, next) {
  try {
    // 检查RealEstateFacade合约实例是否存在
    let facade;
    try {
      facade = await blockchainService.createContract('RealEstateFacade');
    } catch (contractErr) {
      Logger.warn(`找不到合约地址: RealEstateFacade`, { error: contractErr });
      return success(res, {
        statusCode: -1,
        statusName: 'CONTRACT_NOT_DEPLOYED',
        error: 'RealEstateFacade合约未部署'
      });
    }
    
    // 获取系统合约地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    
    // 获取系统合约实例
    const system = await blockchainService.createContract('RealEstateSystem', { address: systemAddress });
    
    // 获取系统状态
    const status = await blockchainService.callContractMethod(system, 'getSystemStatus');
    
    // 状态映射
    const statusMap = {
      0: 'UNINITIALIZED',
      1: 'ACTIVE',
      2: 'PAUSED',
      3: 'LOCKED'
    };
    
    return success(res, {
      statusCode: parseInt(status),
      statusName: statusMap[status] || 'UNKNOWN'
    });
  } catch (err) {
    Logger.error(`获取系统状态失败: ${err.message}`, { error: err });
    return next(err);
  }
}

/**
 * 获取系统版本信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getSystemVersion(req, res, next) {
  try {
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    
    // 获取系统合约实例
    const system = await blockchainService.createContract('RealEstateSystem', { address: systemAddress });
    
    // 获取当前版本
    const version = await blockchainService.callContractMethod(system, 'getVersion');
    
    // 获取版本历史记录数量
    const versionHistoryCount = await blockchainService.callContractMethod(system, 'getVersionHistoryCount');
    
    return success(res, {
      currentVersion: parseInt(version),
      versionHistoryCount: parseInt(versionHistoryCount.toString())
    });
  } catch (err) {
    Logger.error(`获取系统版本信息失败: ${err.message}`, { error: err });
    return error(res, '获取系统版本信息失败', 500);
  }
}

/**
 * 获取系统版本历史
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getVersionHistory(req, res, next) {
  try {
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    
    // 获取系统合约实例
    const system = await blockchainService.createContract('RealEstateSystem', { address: systemAddress });
    
    // 获取版本历史记录数量
    const totalCount = await blockchainService.callContractMethod(system, 'getVersionHistoryCount');
    const totalItems = parseInt(totalCount.toString());
    
    // 计算分页信息
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    
    // 获取版本历史记录
    let versionHistory = [];
    for (let i = startIndex; i < endIndex && i < totalItems; i++) {
      try {
        // 假设有一个通过索引获取版本历史的方法
        const versionData = await blockchainService.callContractMethod(system, 'getVersionHistoryAtIndex', [i]);
        
        versionHistory.push({
          index: i,
          version: parseInt(versionData.version),
          timestamp: new Date(parseInt(versionData.timestamp.toString()) * 1000).toISOString(),
          description: versionData.description
        });
      } catch (err) {
        Logger.warn(`获取版本历史记录失败，索引: ${i}`, { error: err.message });
      }
    }
    
    // 返回分页结果
    return paginated(res, versionHistory, {
      page,
      pageSize: limit,
      totalItems,
      totalPages
    });
  } catch (err) {
    Logger.error(`获取系统版本历史失败: ${err.message}`, { error: err });
    return error(res, '获取系统版本历史失败', 500);
  }
}

/**
 * 获取系统组件信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getSystemComponents(req, res, next) {
  try {
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取各个组件地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
    const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
    const rewardManagerAddress = await blockchainService.callContractMethod(facade, 'rewardManager');
    
    // 获取系统合约实例
    const system = await blockchainService.createContract('RealEstateSystem', { address: systemAddress });
    
    // 获取系统状态和版本
    const status = await blockchainService.callContractMethod(system, 'getSystemStatus');
    const version = await blockchainService.callContractMethod(system, 'getVersion');
    
    // 状态映射
    const statusMap = {
      0: 'UNINITIALIZED',
      1: 'ACTIVE',
      2: 'PAUSED',
      3: 'LOCKED'
    };
    
    return success(res, {
      system: {
        address: systemAddress,
        status: parseInt(status),
        statusName: statusMap[status] || 'UNKNOWN',
        version: parseInt(version)
      },
      components: {
        facade: {
          address: facade.address,
          name: 'RealEstateFacade'
        },
        roleManager: {
          address: roleManagerAddress,
          name: 'RoleManager'
        },
        propertyManager: {
          address: propertyManagerAddress,
          name: 'PropertyManager'
        },
        tradingManager: {
          address: tradingManagerAddress,
          name: 'TradingManager'
        },
        rewardManager: {
          address: rewardManagerAddress,
          name: 'RewardManager'
        }
      }
    });
  } catch (err) {
    Logger.error(`获取系统组件信息失败: ${err.message}`, { error: err });
    return error(res, '获取系统组件信息失败', 500);
  }
}

/**
 * 暂停系统
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function pauseSystem(req, res, next) {
  try {
    const { keyType } = req.body;
    if (!keyType) {
      return error(res, 'keyType不能为空', 400);
    }
    
    if (!['admin'].includes(keyType)) {
      return error(res, '只有管理员可以暂停系统', 403);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    
    // 创建钱包
    const provider = await blockchainService.getProvider();
    const wallet = await blockchainService.createWallet({ keyType });
    
    // 创建系统合约实例（带钱包）
    const system = await blockchainService.createContract('RealEstateSystem', { 
      address: systemAddress,
      wallet
    });
    
    // 获取调用者地址
    const callerAddress = await wallet.getAddress();
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const roleManager = await blockchainService.createContract('RoleManager', { address: roleManagerAddress });
    
    // 检查是否有管理员权限
    const ADMIN_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';
    const hasAdminRole = await blockchainService.callContractMethod(roleManager, 'hasRole', [ADMIN_ROLE, callerAddress]);
    
    if (!hasAdminRole) {
      return error(res, '只有管理员可以暂停系统', 403);
    }
    
    // 暂停系统
    const tx = await blockchainService.sendContractTransaction(
      system,
      'pause',
      [],
      { wallet }
    );
    
    return success(res, {
      success: true,
      txHash: tx.transactionHash,
      message: '系统已暂停'
    });
  } catch (err) {
    Logger.error(`暂停系统失败: ${err.message}`, { error: err });
    return error(res, '暂停系统失败', 500);
  }
}

/**
 * 恢复系统
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function unpauseSystem(req, res, next) {
  try {
    const { keyType } = req.body;
    if (!keyType) {
      return error(res, 'keyType不能为空', 400);
    }
    
    if (!['admin'].includes(keyType)) {
      return error(res, '只有管理员可以恢复系统', 403);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    
    // 创建钱包
    const provider = await blockchainService.getProvider();
    const wallet = await blockchainService.createWallet({ keyType });
    
    // 创建系统合约实例（带钱包）
    const system = await blockchainService.createContract('RealEstateSystem', { 
      address: systemAddress,
      wallet
    });
    
    // 获取调用者地址
    const callerAddress = await wallet.getAddress();
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const roleManager = await blockchainService.createContract('RoleManager', { address: roleManagerAddress });
    
    // 检查是否有管理员权限
    const ADMIN_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';
    const hasAdminRole = await blockchainService.callContractMethod(roleManager, 'hasRole', [ADMIN_ROLE, callerAddress]);
    
    if (!hasAdminRole) {
      return error(res, '只有管理员可以恢复系统', 403);
    }
    
    // 恢复系统
    const tx = await blockchainService.sendContractTransaction(
      system,
      'unpause',
      [],
      { wallet }
    );
    
    return success(res, {
      success: true,
      txHash: tx.transactionHash,
      message: '系统已恢复'
    });
  } catch (err) {
    Logger.error(`恢复系统失败: ${err.message}`, { error: err });
    return error(res, '恢复系统失败', 500);
  }
}

/**
 * 更新系统组件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function updateSystemComponent(req, res, next) {
  try {
    const { componentName, newAddress, keyType } = req.body;
    
    if (!componentName) {
      return error(res, '组件名称不能为空', 400);
    }
    
    if (!newAddress || !Validation.isValidAddress(newAddress)) {
      return error(res, '新地址无效', 400);
    }
    
    if (!keyType) {
      return error(res, 'keyType不能为空', 400);
    }
    
    if (!['admin'].includes(keyType)) {
      return error(res, '只有管理员可以更新系统组件', 403);
    }
    
    // 验证组件名称
    const validComponents = ['roleManager', 'propertyManager', 'tradingManager', 'rewardManager'];
    if (!validComponents.includes(componentName)) {
      return error(res, '无效的组件名称', 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    
    // 创建钱包
    const provider = await blockchainService.getProvider();
    const wallet = await blockchainService.createWallet({ keyType });
    
    // 获取调用者地址
    const callerAddress = await wallet.getAddress();
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const roleManager = await blockchainService.createContract('RoleManager', { address: roleManagerAddress });
    
    // 检查是否有管理员权限
    const ADMIN_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';
    const hasAdminRole = await blockchainService.callContractMethod(roleManager, 'hasRole', [ADMIN_ROLE, callerAddress]);
    
    if (!hasAdminRole) {
      return error(res, '只有管理员可以更新系统组件', 403);
    }
    
    // 获取当前组件地址
    const currentAddress = await blockchainService.callContractMethod(facade, componentName);
    
    // 创建Facade合约实例（带钱包）
    const facadeWithWallet = await blockchainService.createContract('RealEstateFacade', { 
      address: facade.address,
      wallet
    });
    
    // 更新组件
    const tx = await blockchainService.sendContractTransaction(
      facadeWithWallet,
      `set${componentName.charAt(0).toUpperCase() + componentName.slice(1)}`,
      [newAddress],
      { wallet }
    );
    
    return success(res, {
      success: true,
      component: componentName,
      oldAddress: currentAddress,
      newAddress,
      txHash: tx.transactionHash
    });
  } catch (err) {
    Logger.error(`更新系统组件失败: ${err.message}`, { error: err });
    return error(res, '更新系统组件失败', 500);
  }
}

/**
 * 升级系统版本
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function upgradeSystemVersion(req, res, next) {
  try {
    const { description, keyType } = req.body;
    
    if (!description) {
      return error(res, '版本描述不能为空', 400);
    }
    
    if (!keyType) {
      return error(res, 'keyType不能为空', 400);
    }
    
    if (!['admin'].includes(keyType)) {
      return error(res, '只有管理员可以升级系统版本', 403);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    
    // 创建钱包
    const provider = await blockchainService.getProvider();
    const wallet = await blockchainService.createWallet({ keyType });
    
    // 创建系统合约实例（带钱包）
    const system = await blockchainService.createContract('RealEstateSystem', { 
      address: systemAddress,
      wallet
    });
    
    // 获取调用者地址
    const callerAddress = await wallet.getAddress();
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const roleManager = await blockchainService.createContract('RoleManager', { address: roleManagerAddress });
    
    // 检查是否有管理员权限
    const ADMIN_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';
    const hasAdminRole = await blockchainService.callContractMethod(roleManager, 'hasRole', [ADMIN_ROLE, callerAddress]);
    
    if (!hasAdminRole) {
      return error(res, '只有管理员可以升级系统版本', 403);
    }
    
    // 获取当前版本
    const currentVersion = await blockchainService.callContractMethod(system, 'getVersion');
    
    // 升级版本
    const tx = await blockchainService.sendContractTransaction(
      system,
      'upgradeVersion',
      [description],
      { wallet }
    );
    
    // 获取新版本
    const newVersion = await blockchainService.callContractMethod(system, 'getVersion');
    
    return success(res, {
      success: true,
      oldVersion: parseInt(currentVersion),
      newVersion: parseInt(newVersion),
      description,
      txHash: tx.transactionHash
    });
  } catch (err) {
    Logger.error(`升级系统版本失败: ${err.message}`, { error: err });
    return error(res, '升级系统版本失败', 500);
  }
}

/**
 * 获取系统合约地址
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getSystemContracts(req, res, next) {
  try {
    // 读取config/deployment.json文件
    const configPath = path.join(__dirname, '../../../config/deployment.json');
    let deploymentConfig;
    
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      deploymentConfig = JSON.parse(configData);
    } catch (fileErr) {
      Logger.error(`读取部署配置文件失败: ${fileErr.message}`, { error: fileErr });
      return error(res, '读取部署配置文件失败', 500);
    }
    
    // 整理合约地址信息
    const contractAddresses = {
      network: deploymentConfig.network,
      timestamp: deploymentConfig.timestamp,
      deployer: deploymentConfig.deployer,
      deploymentMethod: deploymentConfig.deploymentMethod,
      status: deploymentConfig.status,
      contracts: {},
      implementations: {}
    };
    
    // 添加合约地址
    if (deploymentConfig.contracts) {
      contractAddresses.contracts = deploymentConfig.contracts;
    }
    
    // 添加实现地址
    if (deploymentConfig.implementations) {
      contractAddresses.implementations = deploymentConfig.implementations;
    }
    
    return success(res, contractAddresses);
  } catch (err) {
    Logger.error(`获取系统合约地址失败: ${err.message}`, { error: err });
    return error(res, '获取系统合约地址失败', 500);
  }
}

module.exports = {
  getSystemStatus,
  getSystemVersion,
  getVersionHistory,
  getSystemComponents,
  pauseSystem,
  unpauseSystem,
  updateSystemComponent,
  upgradeSystemVersion,
  getSystemContracts
}; 