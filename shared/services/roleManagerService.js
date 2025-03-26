const BaseContractService = require('./baseContractService');
const { ethers } = require('ethers');
const { ApiError } = require('../utils/errors');

/**
 * 角色管理服务类
 * 处理与RoleManager合约的交互
 */
class RoleManagerService extends BaseContractService {
  constructor() {
    super('RoleManager');
  }

  /**
   * 授予角色
   * @param {string} account 账户地址
   * @param {string} role 角色名称
   * @returns {Promise<Object>} 交易收据
   */
  async grantRole(account, role) {
    this.validateArgs(
      [account, role],
      [addr => ethers.utils.isAddress(addr), r => typeof r === 'string' && r.length > 0]
    );
    return this.executeWrite('grantRole', [account, role], { operationName: 'grantRole' });
  }

  /**
   * 撤销角色
   * @param {string} account 账户地址
   * @param {string} role 角色名称
   * @returns {Promise<Object>} 交易收据
   */
  async revokeRole(account, role) {
    this.validateArgs(
      [account, role],
      [addr => ethers.utils.isAddress(addr), r => typeof r === 'string' && r.length > 0]
    );
    return this.executeWrite('revokeRole', [account, role], { operationName: 'revokeRole' });
  }

  /**
   * 检查账户是否具有角色
   * @param {string} account 账户地址
   * @param {string} role 角色名称
   * @returns {Promise<boolean>} 是否具有角色
   */
  async hasRole(account, role) {
    this.validateArgs(
      [account, role],
      [addr => ethers.utils.isAddress(addr), r => typeof r === 'string' && r.length > 0]
    );
    return this.executeRead('hasRole', [account, role]);
  }

  /**
   * 获取角色管理员
   * @param {string} role 角色名称
   * @returns {Promise<string>} 管理员地址
   */
  async getRoleAdmin(role) {
    this.validateArgs([role], [r => typeof r === 'string' && r.length > 0]);
    return this.executeRead('getRoleAdmin', [role]);
  }

  /**
   * 设置角色管理员
   * @param {string} role 角色名称
   * @param {string} admin 管理员地址
   * @returns {Promise<Object>} 交易收据
   */
  async setRoleAdmin(role, admin) {
    this.validateArgs(
      [role, admin],
      [r => typeof r === 'string' && r.length > 0, addr => ethers.utils.isAddress(addr)]
    );
    return this.executeWrite('setRoleAdmin', [role, admin], { operationName: 'setRoleAdmin' });
  }

  /**
   * 获取角色成员数量
   * @param {string} role 角色名称
   * @returns {Promise<number>} 成员数量
   */
  async getRoleMemberCount(role) {
    this.validateArgs([role], [r => typeof r === 'string' && r.length > 0]);
    return this.executeRead('getRoleMemberCount', [role]);
  }

  /**
   * 获取角色成员
   * @param {string} role 角色名称
   * @param {number} index 成员索引
   * @returns {Promise<string>} 成员地址
   */
  async getRoleMember(role, index) {
    this.validateArgs(
      [role, index],
      [r => typeof r === 'string' && r.length > 0, idx => typeof idx === 'number' && idx >= 0]
    );
    return this.executeRead('getRoleMember', [role, index]);
  }

  /**
   * 获取所有角色
   * @returns {Promise<Array>} 角色列表
   */
  async getAllRoles() {
    return this.executeRead('getAllRoles');
  }

  /**
   * 获取账户的所有角色
   * @param {string} account 账户地址
   * @returns {Promise<Array>} 角色列表
   */
  async getAccountRoles(account) {
    this.validateArgs([account], [addr => ethers.utils.isAddress(addr)]);
    return this.executeRead('getAccountRoles', [account]);
  }

  /**
   * 检查账户是否具有任何角色
   * @param {string} account 账户地址
   * @returns {Promise<boolean>} 是否具有任何角色
   */
  async hasAnyRole(account) {
    this.validateArgs([account], [addr => ethers.utils.isAddress(addr)]);
    return this.executeRead('hasAnyRole', [account]);
  }

  /**
   * 检查账户是否具有所有角色
   * @param {string} account 账户地址
   * @param {Array<string>} roles 角色列表
   * @returns {Promise<boolean>} 是否具有所有角色
   */
  async hasAllRoles(account, roles) {
    this.validateArgs(
      [account, roles],
      [
        addr => ethers.utils.isAddress(addr),
        r => Array.isArray(r) && r.every(role => typeof role === 'string' && role.length > 0)
      ]
    );
    return this.executeRead('hasAllRoles', [account, roles]);
  }
}

module.exports = RoleManagerService; 