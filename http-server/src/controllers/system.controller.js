/**
 * 系统管理控制器
 */
const { Logger, Validation, Contract } = require('../../../shared/src');
const blockchainService = require('../services/blockchainService');
const { success, error, failure, paginated } = require('../utils/responseFormatter');
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
    Logger.info('正在获取系统组件信息');
    
    // 获取 RealEstateFacade 地址
    let facadeAddress = null;
    try {
      // 尝试从环境变量获取Facade地址
      facadeAddress = process.env.REALESTATEFACADE_ADDRESS || process.env.FACADE_ADDRESS || process.env.CONTRACT_REALESTATEFACADE;
      Logger.debug(`从环境变量获取到Facade地址: ${facadeAddress}`);
    } catch (error) {
      Logger.warn(`无法获取Facade地址: ${error.message}`);
    }
    
    // 创建 RealEstateFacade 合约实例
    let facadeContract = null;
    try {
      facadeContract = await blockchainService.createContract('RealEstateFacade', { address: facadeAddress });
      Logger.debug(`已创建RealEstateFacade合约实例，地址: ${facadeContract.address}`);
    } catch (error) {
      Logger.error(`创建RealEstateFacade合约实例失败: ${error.message}`);
    }
    
    // 默认组件对象
    const components = {};
    
    // 尝试从Facade获取System地址
    let systemAddress = null;
    try {
      systemAddress = await blockchainService.callContractMethod(facadeContract, 'system');
      Logger.debug(`从Facade获取System地址成功: ${systemAddress}`);
      components.system = systemAddress;
    } catch (error) {
      Logger.warn(`无法从Facade获取System地址: ${error.message}`);
      
      // 尝试从环境变量获取System地址
      try {
        systemAddress = process.env.REALESTATESYSTEM_ADDRESS || process.env.SYSTEM_ADDRESS || process.env.CONTRACT_REALESTATESYSTEM;
        if (systemAddress) {
          Logger.debug(`从环境变量获取到System地址: ${systemAddress}`);
          components.system = systemAddress;
        }
      } catch (envError) {
        Logger.warn(`从环境变量获取System地址失败: ${envError.message}`);
      }
    }
    
    // 创建System合约实例
    let systemContract = null;
    if (systemAddress) {
      try {
        systemContract = await blockchainService.createContract('RealEstateSystem', { address: systemAddress });
        Logger.debug(`已创建RealEstateSystem合约实例，地址: ${systemAddress}`);
      } catch (error) {
        Logger.error(`创建RealEstateSystem合约实例失败: ${error.message}`);
      }
    }
    
    // 尝试获取其他组件地址
    const componentNames = ['roleManager', 'propertyManager', 'tradingManager', 'rewardManager'];
    const methodNameMap = {
      roleManager: 'getRoleManagerAddress',
      propertyManager: 'getPropertyManagerAddress', 
      tradingManager: 'getTradingManagerAddress',
      rewardManager: 'getRewardManagerAddress'
    };
    
    // 环境变量名映射
    const envNameMap = {
      roleManager: ['ROLEMANAGER_ADDRESS', 'ROLE_MANAGER_ADDRESS', 'CONTRACT_ROLEMANAGER'],
      propertyManager: ['PROPERTYMANAGER_ADDRESS', 'PROPERTY_MANAGER_ADDRESS', 'CONTRACT_PROPERTYMANAGER'],
      tradingManager: ['TRADINGMANAGER_ADDRESS', 'TRADING_MANAGER_ADDRESS', 'CONTRACT_TRADINGMANAGER'],
      rewardManager: ['REWARDMANAGER_ADDRESS', 'REWARD_MANAGER_ADDRESS', 'CONTRACT_REWARDMANAGER']
    };
    
    // 尝试从System合约获取各组件地址，失败则从环境变量获取
    for (const componentName of componentNames) {
      try {
        if (systemContract) {
          const methodName = methodNameMap[componentName];
          const address = await blockchainService.callContractMethod(systemContract, methodName);
          Logger.debug(`从System获取${componentName}地址成功: ${address}`);
          components[componentName] = address;
        } else {
          throw new Error('System合约实例不可用');
        }
      } catch (error) {
        Logger.warn(`无法从System获取${componentName}地址: ${error.message}`);
        
        // 尝试从环境变量获取地址
        try {
          for (const envName of envNameMap[componentName]) {
            if (process.env[envName]) {
              components[componentName] = process.env[envName];
              Logger.debug(`从环境变量${envName}获取到${componentName}地址: ${components[componentName]}`);
              break;
            }
          }
        } catch (envError) {
          Logger.warn(`从环境变量获取${componentName}地址失败: ${envError.message}`);
        }
      }
    }
    
    // 获取系统状态和版本
    let status = -1;
    let version = '0.0.0';
    
    try {
      if (systemContract) {
        // 获取系统状态
        status = await blockchainService.callContractMethod(systemContract, 'getSystemStatus');
        Logger.debug(`获取系统状态成功: ${status}`);
        
        // 获取版本信息
        version = await blockchainService.callContractMethod(systemContract, 'getVersion');
        Logger.debug(`获取系统版本成功: ${version}`);
      } else {
        Logger.warn('System合约实例不可用，无法获取状态和版本');
      }
    } catch (error) {
      Logger.warn(`获取系统状态或版本失败: ${error.message}`);
    }
    
    // 状态名称映射
    const statusNames = {
      0: 'Unauthorized',
      1: 'Deployed',
      2: 'Initialized',
      3: 'Active',
      4: 'Paused',
      5: 'Upgraded',
      6: 'Deprecated'
    };
    
    // 构建结果
    const result = {
      address: systemAddress || null,
      status: Number(status),
      statusName: statusNames[Number(status)] || 'Unknown',
      version,
      components: {}
    };
    
    // 只添加有效的组件地址
    for (const [key, value] of Object.entries(components)) {
      if (value && typeof value === 'string' && value.startsWith('0x')) {
        result.components[key] = value;
      }
    }
    
    return success(res, result);
  } catch (error) {
    Logger.error(`获取系统组件信息失败: ${error.message}`, { error });
    return failure(res, error.message);
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

/**
 * 初始化系统
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function initializeSystem(req, res, next) {
  try {
    const { keyType } = req.body;
    
    // 验证参数
    if (!keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证keyType
    if (!['admin'].includes(keyType)) {
      return error(res, {
        message: '只有管理员可以初始化系统',
        code: 'PERMISSION_DENIED'
      }, 403);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });
    
    // 初始化系统
    const tx = await blockchainService.sendContractTransaction(
      facade,
      'initializeSystem',
      [],
      { keyType }
    );
    
    // 获取系统组件地址
    const systemAddress = await blockchainService.callContractMethod(facade, 'system');
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
    const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
    const rewardManagerAddress = await blockchainService.callContractMethod(facade, 'rewardManager');
    
    // 返回结果
    return success(res, {
      transactions: [
        {
          description: '初始化系统',
          hash: tx.hash
        }
      ],
      addresses: {
        RealEstateFacade: facade.address,
        RealEstateSystem: systemAddress,
        RoleManager: roleManagerAddress,
        PropertyManager: propertyManagerAddress,
        TradingManager: tradingManagerAddress,
        RewardManager: rewardManagerAddress
      }
    });
  } catch (err) {
    Logger.error(`初始化系统失败: ${err.message}`, { error: err });
    return error(res, {
      message: '初始化系统失败',
      code: 'INITIALIZATION_FAILED',
      details: err.message
    }, 500);
  }
}

/**
 * 升级系统组件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function upgradeSystemComponent(req, res, next) {
  try {
    const { component, newAddress, keyType } = req.body;
    
    // 验证参数
    if (!component || !newAddress || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证地址格式
    if (!Validation.isValidAddress(newAddress)) {
      return error(res, {
        message: '无效的合约地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 验证keyType
    if (!['admin'].includes(keyType)) {
      return error(res, {
        message: '只有管理员可以升级系统组件',
        code: 'PERMISSION_DENIED'
      }, 403);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });
    
    // 获取当前组件地址
    let oldAddress;
    let upgradeMethod;
    
    switch (component) {
      case 'PropertyToken':
        upgradeMethod = 'upgradePropertyTokenImplementation';
        // 获取PropertyManager合约实例
        const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
        const propertyManager = await blockchainService.createContract('PropertyManager', { address: propertyManagerAddress });
        oldAddress = await blockchainService.callContractMethod(propertyManager, 'propertyTokenImplementation');
        break;
      case 'RoleManager':
        upgradeMethod = 'upgradeRoleManager';
        oldAddress = await blockchainService.callContractMethod(facade, 'roleManager');
        break;
      case 'PropertyManager':
        upgradeMethod = 'upgradePropertyManager';
        oldAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
        break;
      case 'TradingManager':
        upgradeMethod = 'upgradeTradingManager';
        oldAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
        break;
      case 'RewardManager':
        upgradeMethod = 'upgradeRewardManager';
        oldAddress = await blockchainService.callContractMethod(facade, 'rewardManager');
        break;
      case 'RealEstateSystem':
        upgradeMethod = 'upgradeSystem';
        oldAddress = await blockchainService.callContractMethod(facade, 'system');
        break;
      default:
        return error(res, {
          message: '不支持的组件类型',
          code: 'UNSUPPORTED_COMPONENT'
        }, 400);
    }
    
    // 升级组件
    const tx = await blockchainService.sendContractTransaction(
      facade,
      upgradeMethod,
      [newAddress],
      { keyType }
    );
    
    // 返回结果
    return success(res, {
      component,
      oldAddress,
      newAddress,
      txHash: tx.hash
    });
  } catch (err) {
    Logger.error(`升级系统组件失败: ${err.message}`, { error: err });
    return error(res, {
      message: '升级系统组件失败',
      code: 'UPGRADE_FAILED',
      details: err.message
    }, 500);
  }
}

/**
 * 调用合约方法
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function callContractFunction(req, res, next) {
  try {
    const { contractName, contractAddress, methodName, params, keyType } = req.body;
    
    // 验证参数
    if (!contractName || !contractAddress || !methodName || !params || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证地址格式
    if (!Validation.isValidAddress(contractAddress)) {
      return error(res, {
        message: '无效的合约地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 验证参数格式
    if (!Array.isArray(params)) {
      return error(res, {
        message: 'params必须是数组',
        code: 'INVALID_PARAMS'
      }, 400);
    }
    
    // 创建合约实例
    const contract = await blockchainService.createContract(contractName, { 
      address: contractAddress,
      keyType
    });
    
    // 调用合约方法
    const result = await blockchainService.sendContractTransaction(
      contract,
      methodName,
      params,
      { keyType }
    );
    
    // 返回结果
    return success(res, {
      result: result.toString(),
      txHash: result.hash
    });
  } catch (err) {
    Logger.error(`调用合约方法失败: ${err.message}`, { error: err });
    return error(res, {
      message: '调用合约方法失败',
      code: 'CONTRACT_CALL_FAILED',
      details: err.message
    }, 500);
  }
}

/**
 * 发送交易
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function sendTransaction(req, res, next) {
  try {
    const { to, data, value, keyType } = req.body;
    
    // 验证参数
    if (!to || !data || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证地址格式
    if (!Validation.isValidAddress(to)) {
      return error(res, {
        message: '无效的目标地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 验证data格式
    if (!data.startsWith('0x')) {
      return error(res, {
        message: 'data必须是16进制格式且以0x开头',
        code: 'INVALID_DATA'
      }, 400);
    }
    
    // 创建钱包
    const wallet = await blockchainService.createWallet({ keyType });
    
    // 准备交易选项
    const txOptions = {
      to,
      data
    };
    
    // 设置value（如果有）
    if (value) {
      txOptions.value = value;
    }
    
    // 发送交易
    const tx = await wallet.sendTransaction(txOptions);
    const receipt = await tx.wait();
    
    // 返回结果
    return success(res, {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });
  } catch (err) {
    Logger.error(`发送交易失败: ${err.message}`, { error: err });
    return error(res, {
      message: '发送交易失败',
      code: 'TRANSACTION_FAILED',
      details: err.message
    }, 500);
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
  getSystemContracts,
  initializeSystem,
  upgradeSystemComponent,
  callContractFunction,
  sendTransaction
}; 