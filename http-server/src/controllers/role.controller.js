/**
 * 角色管理控制器
 */
const { Logger, Validation } = require('../../../shared/src');
const blockchainService = require('../services/blockchainService');
const { success, error, paginated } = require('../utils/responseFormatter');

/**
 * 获取所有角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getAllRoles(req, res, next) {
  try {
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const roleManager = await blockchainService.createContract('RoleManager', { address: roleManagerAddress });
    
    // 预定义角色名称
    const roleNames = {
      '0x0000000000000000000000000000000000000000000000000000000000000000': 'DEFAULT_ROLE',
      '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c': 'ADMIN_ROLE',
      '0x6148a9658a54b229f7084f635f852f1b8a7f29d4c8a7d5967fca2bc55baedc21': 'PROPERTY_MANAGER_ROLE',
      '0x0e2a6e1a51243bdf4099a8f4e9db921ebd43987d4d743a9d8d97c96dbaba6f78': 'TRADING_MANAGER_ROLE',
      '0x8f81d7d56fb814bae9a36d155e044d73783afc1894c6bbc6a7ebb180caec709a': 'REWARD_MANAGER_ROLE'
    };
    
    // 获取所有角色
    let roles = [];
    
    // 获取各个预定义角色的成员
    for (const [roleId, roleName] of Object.entries(roleNames)) {
      try {
        // 获取该角色的成员数量
        const memberCount = await blockchainService.callContractMethod(roleManager, 'getRoleMemberCount', [roleId]);
        
        // 获取该角色的所有成员
        let members = [];
        for (let i = 0; i < Math.min(memberCount.toNumber(), 20); i++) {
          try {
            const memberAddress = await blockchainService.callContractMethod(roleManager, 'getRoleMember', [roleId, i]);
            members.push(memberAddress);
          } catch (err) {
            Logger.warn(`获取角色成员失败: ${roleName}, 索引: ${i}`, { error: err.message });
          }
        }
        
        roles.push({
          roleId,
          roleName,
          adminRole: await blockchainService.callContractMethod(roleManager, 'getRoleAdmin', [roleId]),
          memberCount: memberCount.toString(),
          members
        });
      } catch (err) {
        Logger.warn(`获取角色信息失败: ${roleName}`, { error: err.message });
      }
    }
    
    return success(res, roles);
  } catch (err) {
    Logger.error('获取角色列表失败', { error: err });
    return next(err);
  }
}

/**
 * 获取角色详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getRoleById(req, res, next) {
  try {
    const { roleId } = req.params;
    
    // 验证角色ID
    if (!Validation.isValidBytes32(roleId)) {
      return error(res, {
        message: '无效的角色ID格式',
        code: 'INVALID_ROLE_ID'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const roleManager = await blockchainService.createContract('RoleManager', { address: roleManagerAddress });
    
    // 预定义角色名称
    const roleNames = {
      '0x0000000000000000000000000000000000000000000000000000000000000000': 'DEFAULT_ROLE',
      '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c': 'ADMIN_ROLE',
      '0x6148a9658a54b229f7084f635f852f1b8a7f29d4c8a7d5967fca2bc55baedc21': 'PROPERTY_MANAGER_ROLE',
      '0x0e2a6e1a51243bdf4099a8f4e9db921ebd43987d4d743a9d8d97c96dbaba6f78': 'TRADING_MANAGER_ROLE',
      '0x8f81d7d56fb814bae9a36d155e044d73783afc1894c6bbc6a7ebb180caec709a': 'REWARD_MANAGER_ROLE'
    };
    
    // 获取角色名称
    const roleName = roleNames[roleId] || 'CUSTOM_ROLE';
    
    // 获取该角色的成员数量
    const memberCount = await blockchainService.callContractMethod(roleManager, 'getRoleMemberCount', [roleId]);
    
    // 获取该角色的所有成员
    let members = [];
    for (let i = 0; i < Math.min(memberCount.toNumber(), 100); i++) {
      try {
        const memberAddress = await blockchainService.callContractMethod(roleManager, 'getRoleMember', [roleId, i]);
        members.push(memberAddress);
      } catch (err) {
        Logger.warn(`获取角色成员失败: ${roleName}, 索引: ${i}`, { error: err.message });
      }
    }
    
    // 获取该角色的管理员角色
    const adminRole = await blockchainService.callContractMethod(roleManager, 'getRoleAdmin', [roleId]);
    const adminRoleName = roleNames[adminRole] || 'CUSTOM_ADMIN_ROLE';
    
    // 整理角色数据
    const roleData = {
      roleId,
      roleName,
      adminRole,
      adminRoleName,
      memberCount: memberCount.toString(),
      members
    };
    
    return success(res, roleData);
  } catch (err) {
    Logger.error(`获取角色详情失败: ${req.params.roleId}`, { error: err });
    return next(err);
  }
}

/**
 * 授予角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function grantRole(req, res, next) {
  try {
    const { roleId, account, keyType } = req.body;
    
    // 验证参数
    if (!roleId || !account || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证角色ID
    if (!Validation.isValidBytes32(roleId)) {
      return error(res, {
        message: '无效的角色ID格式',
        code: 'INVALID_ROLE_ID'
      }, 400);
    }
    
    // 验证地址格式
    if (!Validation.isValidAddress(account)) {
      return error(res, {
        message: '无效的钱包地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 验证keyType
    if (!['admin', 'manager', 'operator'].includes(keyType)) {
      return error(res, {
        message: '无效的keyType',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例（带keyType）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    
    // 预定义角色名称（用于日志）
    const roleNames = {
      '0x0000000000000000000000000000000000000000000000000000000000000000': 'DEFAULT_ROLE',
      '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c': 'ADMIN_ROLE',
      '0x6148a9658a54b229f7084f635f852f1b8a7f29d4c8a7d5967fca2bc55baedc21': 'PROPERTY_MANAGER_ROLE',
      '0x0e2a6e1a51243bdf4099a8f4e9db921ebd43987d4d743a9d8d97c96dbaba6f78': 'TRADING_MANAGER_ROLE',
      '0x8f81d7d56fb814bae9a36d155e044d73783afc1894c6bbc6a7ebb180caec709a': 'REWARD_MANAGER_ROLE'
    };
    
    const roleName = roleNames[roleId] || 'CUSTOM_ROLE';
    
    // 授予角色
    try {
      const tx = await blockchainService.sendContractTransaction(
        facade,
        'grantRole',
        [roleId, account],
        { keyType }
      );
      
      // 返回结果
      return success(res, {
        txHash: tx.hash,
        roleId,
        roleName,
        account
      });
    } catch (err) {
      Logger.error(`授予角色失败: ${err.message}`, { error: err });
      return error(res, {
        message: '授予角色失败',
        code: 'GRANT_ROLE_FAILED',
        details: err.message
      }, 500);
    }
  } catch (err) {
    Logger.error('授予角色失败', { error: err });
    return next(err);
  }
}

/**
 * 撤销角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function revokeRole(req, res, next) {
  try {
    const { roleId, account, keyType } = req.body;
    
    // 验证参数
    if (!roleId || !account || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证角色ID
    if (!Validation.isValidBytes32(roleId)) {
      return error(res, {
        message: '无效的角色ID格式',
        code: 'INVALID_ROLE_ID'
      }, 400);
    }
    
    // 验证地址格式
    if (!Validation.isValidAddress(account)) {
      return error(res, {
        message: '无效的钱包地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 验证keyType
    if (!['admin', 'manager', 'operator'].includes(keyType)) {
      return error(res, {
        message: '无效的keyType',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例（带keyType）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    
    // 预定义角色名称（用于日志）
    const roleNames = {
      '0x0000000000000000000000000000000000000000000000000000000000000000': 'DEFAULT_ROLE',
      '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c': 'ADMIN_ROLE',
      '0x6148a9658a54b229f7084f635f852f1b8a7f29d4c8a7d5967fca2bc55baedc21': 'PROPERTY_MANAGER_ROLE',
      '0x0e2a6e1a51243bdf4099a8f4e9db921ebd43987d4d743a9d8d97c96dbaba6f78': 'TRADING_MANAGER_ROLE',
      '0x8f81d7d56fb814bae9a36d155e044d73783afc1894c6bbc6a7ebb180caec709a': 'REWARD_MANAGER_ROLE'
    };
    
    const roleName = roleNames[roleId] || 'CUSTOM_ROLE';
    
    // 撤销角色
    try {
      const tx = await blockchainService.sendContractTransaction(
        facade,
        'revokeRole',
        [roleId, account],
        { keyType }
      );
      
      // 返回结果
      return success(res, {
        txHash: tx.hash,
        roleId,
        roleName,
        account
      });
    } catch (err) {
      Logger.error(`撤销角色失败: ${err.message}`, { error: err });
      return error(res, {
        message: '撤销角色失败',
        code: 'REVOKE_ROLE_FAILED',
        details: err.message
      }, 500);
    }
  } catch (err) {
    Logger.error('撤销角色失败', { error: err });
    return next(err);
  }
}

/**
 * 检查账户是否拥有角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function hasRole(req, res, next) {
  try {
    const { roleId, account } = req.query;
    
    // 验证参数
    if (!roleId || !account) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证角色ID
    if (!Validation.isValidBytes32(roleId)) {
      return error(res, {
        message: '无效的角色ID格式',
        code: 'INVALID_ROLE_ID'
      }, 400);
    }
    
    // 验证地址格式
    if (!Validation.isValidAddress(account)) {
      return error(res, {
        message: '无效的钱包地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const roleManager = await blockchainService.createContract('RoleManager', { address: roleManagerAddress });
    
    // 预定义角色名称
    const roleNames = {
      '0x0000000000000000000000000000000000000000000000000000000000000000': 'DEFAULT_ROLE',
      '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c': 'ADMIN_ROLE',
      '0x6148a9658a54b229f7084f635f852f1b8a7f29d4c8a7d5967fca2bc55baedc21': 'PROPERTY_MANAGER_ROLE',
      '0x0e2a6e1a51243bdf4099a8f4e9db921ebd43987d4d743a9d8d97c96dbaba6f78': 'TRADING_MANAGER_ROLE',
      '0x8f81d7d56fb814bae9a36d155e044d73783afc1894c6bbc6a7ebb180caec709a': 'REWARD_MANAGER_ROLE'
    };
    
    const roleName = roleNames[roleId] || 'CUSTOM_ROLE';
    
    // 检查是否拥有角色
    const hasRole = await blockchainService.callContractMethod(roleManager, 'hasRole', [roleId, account]);
    
    // 返回结果
    return success(res, {
      roleId,
      roleName,
      account,
      hasRole
    });
  } catch (err) {
    Logger.error('检查角色失败', { error: err });
    return next(err);
  }
}

/**
 * 获取账户的所有角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getAccountRoles(req, res, next) {
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
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取RoleManager合约实例
    const roleManagerAddress = await blockchainService.callContractMethod(facade, 'roleManager');
    const roleManager = await blockchainService.createContract('RoleManager', { address: roleManagerAddress });
    
    // 预定义角色
    const predefinedRoles = [
      {
        roleId: '0x0000000000000000000000000000000000000000000000000000000000000000',
        roleName: 'DEFAULT_ROLE'
      },
      {
        roleId: '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c',
        roleName: 'ADMIN_ROLE'
      },
      {
        roleId: '0x6148a9658a54b229f7084f635f852f1b8a7f29d4c8a7d5967fca2bc55baedc21',
        roleName: 'PROPERTY_MANAGER_ROLE'
      },
      {
        roleId: '0x0e2a6e1a51243bdf4099a8f4e9db921ebd43987d4d743a9d8d97c96dbaba6f78',
        roleName: 'TRADING_MANAGER_ROLE'
      },
      {
        roleId: '0x8f81d7d56fb814bae9a36d155e044d73783afc1894c6bbc6a7ebb180caec709a',
        roleName: 'REWARD_MANAGER_ROLE'
      }
    ];
    
    // 检查账户拥有的角色
    let accountRoles = [];
    
    for (const role of predefinedRoles) {
      try {
        const hasRole = await blockchainService.callContractMethod(roleManager, 'hasRole', [role.roleId, address]);
        
        if (hasRole) {
          accountRoles.push({
            roleId: role.roleId,
            roleName: role.roleName
          });
        }
      } catch (err) {
        Logger.warn(`检查角色失败: ${role.roleName}`, { error: err.message });
      }
    }
    
    // 返回结果
    return success(res, {
      account: address,
      roles: accountRoles
    });
  } catch (err) {
    Logger.error(`获取账户角色失败: ${req.params.address}`, { error: err });
    return next(err);
  }
}

/**
 * 设置用户角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function setUserRole(req, res, next) {
  try {
    const { address } = req.params;
    const { role, keyType } = req.body;
    
    // 验证参数
    if (!address || !role || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证地址格式
    if (!Validation.isValidAddress(address)) {
      return error(res, {
        message: '无效的钱包地址格式',
        code: 'INVALID_ADDRESS'
      }, 400);
    }
    
    // 验证角色
    const validRoles = ['USER', 'MANAGER', 'OPERATOR'];
    if (!validRoles.includes(role)) {
      return error(res, {
        message: '无效的角色值，有效值为: USER, MANAGER, OPERATOR',
        code: 'INVALID_ROLE'
      }, 400);
    }
    
    // 验证keyType
    if (!['admin', 'manager', 'operator'].includes(keyType)) {
      return error(res, {
        message: '无效的keyType，有效值为: admin, manager, operator',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例（带keyType）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });
    
    // 角色映射
    const roleMapping = {
      'USER': '0x0000000000000000000000000000000000000000000000000000000000000000', // DEFAULT_ROLE
      'MANAGER': '0x6148a9658a54b229f7084f635f852f1b8a7f29d4c8a7d5967fca2bc55baedc21', // PROPERTY_MANAGER_ROLE
      'OPERATOR': '0x0e2a6e1a51243bdf4099a8f4e9db921ebd43987d4d743a9d8d97c96dbaba6f78', // TRADING_MANAGER_ROLE
    };
    
    const roleId = roleMapping[role];
    
    // 授予角色
    try {
      // 先撤销之前的所有角色
      for (const [roleName, id] of Object.entries(roleMapping)) {
        if (roleName !== role) {
          try {
            const hasRole = await blockchainService.callContractMethod(facade, 'hasRole', [id, address]);
            if (hasRole) {
              await blockchainService.sendContractTransaction(
                facade,
                'revokeRole',
                [id, address],
                { keyType }
              );
              Logger.info(`已撤销角色 ${roleName} 从地址 ${address}`);
            }
          } catch (error) {
            Logger.warn(`撤销角色失败: ${roleName}`, { error: error.message });
          }
        }
      }
      
      // 授予新角色
      const tx = await blockchainService.sendContractTransaction(
        facade,
        'grantRole',
        [roleId, address],
        { keyType }
      );
      
      // 返回结果
      return success(res, {
        transactionHash: tx.hash,
        address,
        role,
        roleId
      });
    } catch (err) {
      Logger.error(`设置用户角色失败: ${err.message}`, { error: err });
      return error(res, {
        message: '设置用户角色失败',
        code: 'SET_USER_ROLE_FAILED',
        details: err.message
      }, 500);
    }
  } catch (err) {
    Logger.error('设置用户角色失败', { error: err });
    return next(err);
  }
}

/**
 * 批量设置用户角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function setBatchRoles(req, res, next) {
  try {
    const { users, keyType } = req.body;
    
    // 验证参数
    if (!users || !Array.isArray(users) || users.length === 0 || !keyType) {
      return error(res, {
        message: '缺少必填参数',
        code: 'MISSING_PARAMETERS'
      }, 400);
    }
    
    // 验证keyType
    if (!['admin', 'manager', 'operator'].includes(keyType)) {
      return error(res, {
        message: '无效的keyType，有效值为: admin, manager, operator',
        code: 'INVALID_KEY_TYPE'
      }, 400);
    }
    
    // 获取RealEstateFacade合约实例（带keyType）
    const facade = await blockchainService.createContract('RealEstateFacade', { keyType });
    
    // 角色映射
    const roleMapping = {
      'USER': '0x0000000000000000000000000000000000000000000000000000000000000000', // DEFAULT_ROLE
      'MANAGER': '0x6148a9658a54b229f7084f635f852f1b8a7f29d4c8a7d5967fca2bc55baedc21', // PROPERTY_MANAGER_ROLE
      'OPERATOR': '0x0e2a6e1a51243bdf4099a8f4e9db921ebd43987d4d743a9d8d97c96dbaba6f78', // TRADING_MANAGER_ROLE
    };
    
    // 批量设置角色
    const results = [];
    
    for (const user of users) {
      const { address, role } = user;
      
      // 验证地址格式
      if (!Validation.isValidAddress(address)) {
        results.push({
          address,
          role,
          success: false,
          error: '无效的钱包地址格式'
        });
        continue;
      }
      
      // 验证角色
      const validRoles = ['USER', 'MANAGER', 'OPERATOR'];
      if (!validRoles.includes(role)) {
        results.push({
          address,
          role,
          success: false,
          error: '无效的角色值，有效值为: USER, MANAGER, OPERATOR'
        });
        continue;
      }
      
      try {
        const roleId = roleMapping[role];
        
        // 先撤销之前的所有角色
        for (const [roleName, id] of Object.entries(roleMapping)) {
          if (roleName !== role) {
            try {
              const hasRole = await blockchainService.callContractMethod(facade, 'hasRole', [id, address]);
              if (hasRole) {
                await blockchainService.sendContractTransaction(
                  facade,
                  'revokeRole',
                  [id, address],
                  { keyType }
                );
                Logger.info(`已撤销角色 ${roleName} 从地址 ${address}`);
              }
            } catch (error) {
              Logger.warn(`撤销角色失败: ${roleName} 从地址 ${address}`, { error: error.message });
            }
          }
        }
        
        // 授予新角色
        const tx = await blockchainService.sendContractTransaction(
          facade,
          'grantRole',
          [roleId, address],
          { keyType }
        );
        
        results.push({
          address,
          role,
          success: true,
          transactionHash: tx.hash
        });
      } catch (err) {
        Logger.error(`设置用户角色失败: ${address} - ${role}`, { error: err });
        results.push({
          address,
          role,
          success: false,
          error: err.message
        });
      }
    }
    
    // 返回结果
    return success(res, {
      results
    });
  } catch (err) {
    Logger.error('批量设置用户角色失败', { error: err });
    return next(err);
  }
}

module.exports = {
  getAllRoles,
  getRoleById,
  grantRole,
  revokeRole,
  hasRole,
  getAccountRoles,
  setUserRole,
  setBatchRoles
}; 