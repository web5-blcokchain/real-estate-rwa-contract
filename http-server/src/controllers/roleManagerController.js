/**
 * RoleManager控制器
 * 提供角色管理相关API
 */
const { ethers } = require('ethers');
const { Logger } = require('../../../shared/src');
const validateParams = require('../utils/validateParams');
const { isEthAddress, isNonEmptyString, isPrivateKey } = require('../utils/validators');
const { callContractMethod, sendContractTransaction } = require('../utils/contract');

/**
 * 授予角色
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function grantRole(req, res, next) {
  try {
    const { role, account, privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { role, account, privateKey },
      [
        ['role', isNonEmptyString],
        ['account', isEthAddress],
        ['privateKey', isPrivateKey]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    
    // 记录日志（敏感信息已隐藏）
    Logger.info('授予角色', {
      role,
      account,
      from: wallet.address
    });
    
    // 调用合约授予角色
    const receipt = await sendContractTransaction(
      'RoleManager',
      'grantRole',
      [role, account],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        role,
        account,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 撤销角色
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function revokeRole(req, res, next) {
  try {
    const { role, account, privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { role, account, privateKey },
      [
        ['role', isNonEmptyString],
        ['account', isEthAddress],
        ['privateKey', isPrivateKey]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    
    // 记录日志（敏感信息已隐藏）
    Logger.info('撤销角色', {
      role,
      account,
      from: wallet.address
    });
    
    // 调用合约撤销角色
    const receipt = await sendContractTransaction(
      'RoleManager',
      'revokeRole',
      [role, account],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        role,
        account,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 检查账户是否拥有角色
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function hasRole(req, res, next) {
  try {
    const { role, account } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { role, account },
      [
        ['role', isNonEmptyString],
        ['account', isEthAddress]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('检查角色', { role, account });
    
    // 调用合约检查角色
    const hasRole = await callContractMethod(
      'RoleManager',
      'hasRole',
      [role, account]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        role,
        account,
        hasRole
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取角色成员列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getRoleMembers(req, res, next) {
  try {
    const { role } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { role },
      [
        ['role', isNonEmptyString]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('获取角色成员列表', { role });
    
    // 调用合约获取角色成员
    const members = await callContractMethod(
      'RoleManager',
      'getRoleMembers',
      [role]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        role,
        members
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取账户的所有角色
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getAccountRoles(req, res, next) {
  try {
    const { account } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { account },
      [
        ['account', isEthAddress]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('获取账户角色', { account });
    
    // 调用合约获取账户角色
    const roles = await callContractMethod(
      'RoleManager',
      'getAccountRoles',
      [account]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        account,
        roles
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取所有可用角色
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getAllRoles(req, res, next) {
  try {
    // 记录日志
    Logger.info('获取所有可用角色');
    
    // 调用合约获取所有角色
    const roles = await callContractMethod(
      'RoleManager',
      'getAllRoles',
      []
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        roles
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 创建新角色
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function createRole(req, res, next) {
  try {
    const { roleName, privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { roleName, privateKey },
      [
        ['roleName', isNonEmptyString],
        ['privateKey', isPrivateKey]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    
    // 记录日志（敏感信息已隐藏）
    Logger.info('创建新角色', {
      roleName,
      from: wallet.address
    });
    
    // 调用合约创建角色
    const receipt = await sendContractTransaction(
      'RoleManager',
      'createRole',
      [roleName],
      { wallet }
    );
    
    // 获取生成的角色ID
    let roleId = 'unknown';
    if (receipt.events && receipt.events.length > 0) {
      // 假设第一个事件是RoleCreated事件，包含roleId
      // 实际情况可能需要更精确的事件解析
      roleId = receipt.events[0].args.role;
    }
    
    // 返回结果
    return res.status(201).json({
      success: true,
      data: {
        roleName,
        roleId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

module.exports = {
  grantRole,
  revokeRole,
  hasRole,
  getRoleMembers,
  getAccountRoles,
  getAllRoles,
  createRole
}; 