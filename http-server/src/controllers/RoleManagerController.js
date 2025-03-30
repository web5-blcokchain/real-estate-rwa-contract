/**
 * RoleManager控制器
 * 处理RoleManager合约的API请求
 */

const { ethers } = require('ethers');
const blockchainService = require('../services/blockchainService');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { createSuccessResponse, createTransactionResponse } = require('../utils/responseHelper');

// 系统中定义的角色列表
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  TOKEN_MANAGER: 'TOKEN_MANAGER',
  FEE_MANAGER: 'FEE_MANAGER',
  RENT_MANAGER: 'RENT_MANAGER',
  REDEMPTION_MANAGER: 'REDEMPTION_MANAGER',
  MARKETPLACE_MANAGER: 'MARKETPLACE_MANAGER'
};

// RoleManager控制器
const RoleManagerController = {
  /**
   * 获取所有角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getRoles(req, res, next) {
    try {
      const roles = Object.values(ROLES);
      res.json(createSuccessResponse(roles, '获取角色列表成功'));
    } catch (error) {
      logger.error('获取角色列表失败', error);
      next(error);
    }
  },

  /**
   * 检查地址是否拥有指定角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async checkRole(req, res, next) {
    try {
      const { role, address } = req.params;
      
      // 验证参数
      if (!role || !Object.values(ROLES).includes(role.toUpperCase())) {
        throw new ApiError('无效的角色', 400, 'INVALID_ROLE');
      }
      
      if (!address || !ethers.isAddress(address)) {
        throw new ApiError('无效的地址', 400, 'INVALID_ADDRESS');
      }
      
      // 获取角色哈希
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role.toUpperCase()));
      
      // 检查角色
      const hasRole = await blockchainService.callReadMethod(
        'RoleManager',
        'hasRole',
        [roleHash, address]
      );
      
      res.json(createSuccessResponse({ 
        address,
        role: role.toUpperCase(),
        hasRole
      }, '检查角色成功'));
    } catch (error) {
      logger.error('检查角色失败', error);
      next(error);
    }
  },

  /**
   * 获取指定角色的所有成员
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getRoleMembers(req, res, next) {
    try {
      const { role } = req.params;
      
      // 验证参数
      if (!role || !Object.values(ROLES).includes(role.toUpperCase())) {
        throw new ApiError('无效的角色', 400, 'INVALID_ROLE');
      }
      
      // 获取角色哈希
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role.toUpperCase()));
      
      // 获取角色成员数量
      const memberCount = await blockchainService.callReadMethod(
        'RoleManager',
        'getRoleMemberCount',
        [roleHash]
      );
      
      // 获取所有成员地址
      const members = [];
      for (let i = 0; i < memberCount; i++) {
        const member = await blockchainService.callReadMethod(
          'RoleManager',
          'getRoleMember',
          [roleHash, i]
        );
        members.push(member);
      }
      
      res.json(createSuccessResponse({
        role: role.toUpperCase(),
        memberCount: memberCount.toString(),
        members
      }, '获取角色成员成功'));
    } catch (error) {
      logger.error('获取角色成员失败', error);
      next(error);
    }
  },

  /**
   * 授予角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async grantRole(req, res, next) {
    try {
      const { role, address } = req.body;
      
      // 验证参数
      if (!role || !Object.values(ROLES).includes(role.toUpperCase())) {
        throw new ApiError('无效的角色', 400, 'INVALID_ROLE');
      }
      
      if (!address || !ethers.isAddress(address)) {
        throw new ApiError('无效的地址', 400, 'INVALID_ADDRESS');
      }
      
      // 获取角色哈希
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role.toUpperCase()));
      
      // 检查是否已有角色
      const hasRole = await blockchainService.callReadMethod(
        'RoleManager',
        'hasRole',
        [roleHash, address]
      );
      
      if (hasRole) {
        throw new ApiError('地址已拥有该角色', 400, 'ALREADY_HAS_ROLE');
      }
      
      // 授予角色
      const result = await blockchainService.callWriteMethod(
        'RoleManager',
        'grantRole',
        [roleHash, address],
        'admin'
      );
      
      res.json(createTransactionResponse(result.txHash, '角色授予请求已提交'));
    } catch (error) {
      logger.error('授予角色失败', error);
      next(error);
    }
  },

  /**
   * 撤销角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async revokeRole(req, res, next) {
    try {
      const { role, address } = req.body;
      
      // 验证参数
      if (!role || !Object.values(ROLES).includes(role.toUpperCase())) {
        throw new ApiError('无效的角色', 400, 'INVALID_ROLE');
      }
      
      if (!address || !ethers.isAddress(address)) {
        throw new ApiError('无效的地址', 400, 'INVALID_ADDRESS');
      }
      
      // 获取角色哈希
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role.toUpperCase()));
      
      // 检查是否有角色
      const hasRole = await blockchainService.callReadMethod(
        'RoleManager',
        'hasRole',
        [roleHash, address]
      );
      
      if (!hasRole) {
        throw new ApiError('地址没有该角色', 400, 'DOES_NOT_HAVE_ROLE');
      }
      
      // 撤销角色
      const result = await blockchainService.callWriteMethod(
        'RoleManager',
        'revokeRole',
        [roleHash, address],
        'admin'
      );
      
      res.json(createTransactionResponse(result.txHash, '角色撤销请求已提交'));
    } catch (error) {
      logger.error('撤销角色失败', error);
      next(error);
    }
  },

  /**
   * 获取角色管理员
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  async getRoleAdmin(req, res, next) {
    try {
      const { role } = req.params;
      
      // 验证参数
      if (!role || !Object.values(ROLES).includes(role.toUpperCase())) {
        throw new ApiError('无效的角色', 400, 'INVALID_ROLE');
      }
      
      // 获取角色哈希
      const roleHash = ethers.keccak256(ethers.toUtf8Bytes(role.toUpperCase()));
      
      // 获取管理员角色哈希
      const adminRoleHash = await blockchainService.callReadMethod(
        'RoleManager',
        'getRoleAdmin',
        [roleHash]
      );
      
      // 尝试获取角色名称
      let adminRoleName = '未知角色';
      for (const [name, value] of Object.entries(ROLES)) {
        if (adminRoleHash === ethers.keccak256(ethers.toUtf8Bytes(value))) {
          adminRoleName = value;
          break;
        }
      }
      
      res.json(createSuccessResponse({
        role: role.toUpperCase(),
        adminRole: adminRoleName,
        adminRoleHash
      }, '获取角色管理员成功'));
    } catch (error) {
      logger.error('获取角色管理员失败', error);
      next(error);
    }
  }
};

module.exports = RoleManagerController; 