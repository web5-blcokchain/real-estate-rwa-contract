/**
 * 系统管理控制器
 */
const { Logger, Validation } = require('../../../shared/src');
const contractService = require('../services/contractService');
const { success, error, paginated } = require('../utils/responseFormatter');

/**
 * 获取系统状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getSystemStatus(req, res, next) {
  try {
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await contractService.callMethod(facade, 'system');
    
    // 获取系统合约实例
    const system = await contractService.createContractInstance('RealEstateSystem', { address: systemAddress });
    
    // 获取系统状态
    const status = await contractService.callMethod(system, 'getSystemStatus');
    
    // 状态映射
    const statusMap = {
      0: 'UNINITIALIZED',
      1: 'ACTIVE',
      2: 'PAUSED',
      3: 'LOCKED'
    };
    
    return res.json(success({
      statusCode: parseInt(status),
      statusName: statusMap[status] || 'UNKNOWN'
    }));
  } catch (err) {
    Logger.error(`获取系统状态失败: ${err.message}`, { error: err });
    return res.status(500).json(error('获取系统状态失败', err));
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
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await contractService.callMethod(facade, 'system');
    
    // 获取系统合约实例
    const system = await contractService.createContractInstance('RealEstateSystem', { address: systemAddress });
    
    // 获取当前版本
    const version = await contractService.callMethod(system, 'getVersion');
    
    // 获取版本历史记录数量
    const versionHistoryCount = await contractService.callMethod(system, 'getVersionHistoryCount');
    
    return res.json(success({
      currentVersion: parseInt(version),
      versionHistoryCount: parseInt(versionHistoryCount.toString())
    }));
  } catch (err) {
    Logger.error(`获取系统版本信息失败: ${err.message}`, { error: err });
    return res.status(500).json(error('获取系统版本信息失败', err));
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
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await contractService.callMethod(facade, 'system');
    
    // 获取系统合约实例
    const system = await contractService.createContractInstance('RealEstateSystem', { address: systemAddress });
    
    // 获取版本历史记录数量
    const totalCount = await contractService.callMethod(system, 'getVersionHistoryCount');
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
        const versionData = await contractService.callMethod(system, 'getVersionHistoryAtIndex', [i]);
        
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
    return res.json(paginated(versionHistory, {
      page,
      pageSize: limit,
      totalItems,
      totalPages
    }));
  } catch (err) {
    Logger.error(`获取系统版本历史失败: ${err.message}`, { error: err });
    return res.status(500).json(error('获取系统版本历史失败', err));
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
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取各个组件地址
    const systemAddress = await contractService.callMethod(facade, 'system');
    const roleManagerAddress = await contractService.callMethod(facade, 'roleManager');
    const propertyManagerAddress = await contractService.callMethod(facade, 'propertyManager');
    const tradingManagerAddress = await contractService.callMethod(facade, 'tradingManager');
    const rewardManagerAddress = await contractService.callMethod(facade, 'rewardManager');
    
    // 获取系统合约实例
    const system = await contractService.createContractInstance('RealEstateSystem', { address: systemAddress });
    
    // 获取系统状态和版本
    const status = await contractService.callMethod(system, 'getSystemStatus');
    const version = await contractService.callMethod(system, 'getVersion');
    
    // 状态映射
    const statusMap = {
      0: 'UNINITIALIZED',
      1: 'ACTIVE',
      2: 'PAUSED',
      3: 'LOCKED'
    };
    
    return res.json(success({
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
    }));
  } catch (err) {
    Logger.error(`获取系统组件信息失败: ${err.message}`, { error: err });
    return res.status(500).json(error('获取系统组件信息失败', err));
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
    const { privateKey } = req.body;
    if (!privateKey) {
      return res.status(400).json(error('私钥不能为空'));
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await contractService.callMethod(facade, 'system');
    
    // 创建钱包
    const provider = await contractService.blockchainService.getProvider();
    const wallet = await contractService.blockchainService.createWalletFromPrivateKey(privateKey, provider);
    
    // 创建系统合约实例（带钱包）
    const system = await contractService.createContractInstance('RealEstateSystem', { 
      address: systemAddress,
      wallet
    });
    
    // 获取调用者地址
    const callerAddress = await wallet.getAddress();
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await contractService.callMethod(facade, 'roleManager');
    const roleManager = await contractService.createContractInstance('RoleManager', { address: roleManagerAddress });
    
    // 检查是否有管理员权限
    const ADMIN_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';
    const hasAdminRole = await contractService.callMethod(roleManager, 'hasRole', [ADMIN_ROLE, callerAddress]);
    
    if (!hasAdminRole) {
      return res.status(403).json(error('只有管理员可以暂停系统'));
    }
    
    // 暂停系统
    const tx = await contractService.sendTransaction(
      system,
      'pause',
      [],
      { wallet }
    );
    
    return res.json(success({
      success: true,
      txHash: tx.transactionHash,
      message: '系统已暂停'
    }));
  } catch (err) {
    Logger.error(`暂停系统失败: ${err.message}`, { error: err });
    return res.status(500).json(error('暂停系统失败', err));
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
    const { privateKey } = req.body;
    if (!privateKey) {
      return res.status(400).json(error('私钥不能为空'));
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await contractService.callMethod(facade, 'system');
    
    // 创建钱包
    const provider = await contractService.blockchainService.getProvider();
    const wallet = await contractService.blockchainService.createWalletFromPrivateKey(privateKey, provider);
    
    // 创建系统合约实例（带钱包）
    const system = await contractService.createContractInstance('RealEstateSystem', { 
      address: systemAddress,
      wallet
    });
    
    // 获取调用者地址
    const callerAddress = await wallet.getAddress();
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await contractService.callMethod(facade, 'roleManager');
    const roleManager = await contractService.createContractInstance('RoleManager', { address: roleManagerAddress });
    
    // 检查是否有管理员权限
    const ADMIN_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';
    const hasAdminRole = await contractService.callMethod(roleManager, 'hasRole', [ADMIN_ROLE, callerAddress]);
    
    if (!hasAdminRole) {
      return res.status(403).json(error('只有管理员可以恢复系统'));
    }
    
    // 恢复系统
    const tx = await contractService.sendTransaction(
      system,
      'unpause',
      [],
      { wallet }
    );
    
    return res.json(success({
      success: true,
      txHash: tx.transactionHash,
      message: '系统已恢复'
    }));
  } catch (err) {
    Logger.error(`恢复系统失败: ${err.message}`, { error: err });
    return res.status(500).json(error('恢复系统失败', err));
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
    const { componentName, newAddress, privateKey } = req.body;
    
    if (!componentName) {
      return res.status(400).json(error('组件名称不能为空'));
    }
    
    if (!newAddress || !Validation.isValidAddress(newAddress)) {
      return res.status(400).json(error('新地址无效'));
    }
    
    if (!privateKey) {
      return res.status(400).json(error('私钥不能为空'));
    }
    
    // 验证组件名称
    const validComponents = ['roleManager', 'propertyManager', 'tradingManager', 'rewardManager'];
    if (!validComponents.includes(componentName)) {
      return res.status(400).json(error('无效的组件名称'));
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await contractService.callMethod(facade, 'system');
    
    // 创建钱包
    const provider = await contractService.blockchainService.getProvider();
    const wallet = await contractService.blockchainService.createWalletFromPrivateKey(privateKey, provider);
    
    // 获取调用者地址
    const callerAddress = await wallet.getAddress();
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await contractService.callMethod(facade, 'roleManager');
    const roleManager = await contractService.createContractInstance('RoleManager', { address: roleManagerAddress });
    
    // 检查是否有管理员权限
    const ADMIN_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';
    const hasAdminRole = await contractService.callMethod(roleManager, 'hasRole', [ADMIN_ROLE, callerAddress]);
    
    if (!hasAdminRole) {
      return res.status(403).json(error('只有管理员可以更新系统组件'));
    }
    
    // 获取当前组件地址
    const currentAddress = await contractService.callMethod(facade, componentName);
    
    // 创建Facade合约实例（带钱包）
    const facadeWithWallet = await contractService.createContractInstance('RealEstateFacade', { 
      address: facade.address,
      wallet
    });
    
    // 更新组件
    const tx = await contractService.sendTransaction(
      facadeWithWallet,
      `set${componentName.charAt(0).toUpperCase() + componentName.slice(1)}`,
      [newAddress],
      { wallet }
    );
    
    return res.json(success({
      success: true,
      component: componentName,
      oldAddress: currentAddress,
      newAddress,
      txHash: tx.transactionHash
    }));
  } catch (err) {
    Logger.error(`更新系统组件失败: ${err.message}`, { error: err });
    return res.status(500).json(error('更新系统组件失败', err));
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
    const { description, privateKey } = req.body;
    
    if (!description) {
      return res.status(400).json(error('版本描述不能为空'));
    }
    
    if (!privateKey) {
      return res.status(400).json(error('私钥不能为空'));
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await contractService.createContractInstance('RealEstateFacade');
    
    // 获取系统合约地址
    const systemAddress = await contractService.callMethod(facade, 'system');
    
    // 创建钱包
    const provider = await contractService.blockchainService.getProvider();
    const wallet = await contractService.blockchainService.createWalletFromPrivateKey(privateKey, provider);
    
    // 创建系统合约实例（带钱包）
    const system = await contractService.createContractInstance('RealEstateSystem', { 
      address: systemAddress,
      wallet
    });
    
    // 获取调用者地址
    const callerAddress = await wallet.getAddress();
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await contractService.callMethod(facade, 'roleManager');
    const roleManager = await contractService.createContractInstance('RoleManager', { address: roleManagerAddress });
    
    // 检查是否有管理员权限
    const ADMIN_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';
    const hasAdminRole = await contractService.callMethod(roleManager, 'hasRole', [ADMIN_ROLE, callerAddress]);
    
    if (!hasAdminRole) {
      return res.status(403).json(error('只有管理员可以升级系统版本'));
    }
    
    // 获取当前版本
    const currentVersion = await contractService.callMethod(system, 'getVersion');
    
    // 升级版本
    const tx = await contractService.sendTransaction(
      system,
      'upgradeVersion',
      [description],
      { wallet }
    );
    
    // 获取新版本
    const newVersion = await contractService.callMethod(system, 'getVersion');
    
    return res.json(success({
      success: true,
      oldVersion: parseInt(currentVersion),
      newVersion: parseInt(newVersion),
      description,
      txHash: tx.transactionHash
    }));
  } catch (err) {
    Logger.error(`升级系统版本失败: ${err.message}`, { error: err });
    return res.status(500).json(error('升级系统版本失败', err));
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
  upgradeSystemVersion
}; 