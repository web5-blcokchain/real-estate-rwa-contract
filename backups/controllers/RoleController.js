const { ContractUtils, AddressUtils } = require('../../../common');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');

/**
 * 角色控制器
 */
class RoleController extends BaseController {
  /**
   * 授予角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async grantRole(req, res) {
    const { role, account } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { role, account })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RoleManager', 'admin');
        
        // 调用合约方法
        const tx = await contract.grantRole(role, account);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          role,
          account
        };
      },
      '角色授予成功',
      { role, account },
      '角色授予失败'
    );
  }

  /**
   * 撤销角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async revokeRole(req, res) {
    const { role, account } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { role, account })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RoleManager', 'admin');
        
        // 调用合约方法
        const tx = await contract.revokeRole(role, account);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          role,
          account
        };
      },
      '角色撤销成功',
      { role, account },
      '角色撤销失败'
    );
  }

  /**
   * 检查是否拥有角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async hasRole(req, res) {
    const { role, account } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { role, account })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RoleManager', 'admin');
        
        // 调用合约方法
        const hasRole = await contract.hasRole(role, account);

        return {
          role,
          account,
          hasRole
        };
      },
      '角色检查成功',
      { role, account },
      '角色检查失败'
    );
  }

  /**
   * 获取角色的管理员角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoleAdmin(req, res) {
    const { roleId } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { roleId })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RoleManager', 'admin');
        
        // 调用合约方法
        const adminRole = await contract.getRoleAdmin(roleId);

        return {
          role: roleId,
          adminRole
        };
      },
      '获取管理员角色成功',
      { roleId },
      '获取管理员角色失败'
    );
  }

  /**
   * 获取角色成员数量
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoleMemberCount(req, res) {
    const { role } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { role })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RoleManager', 'admin');
        
        // 调用合约方法
        const count = await contract.getRoleMemberCount(role);

        return {
          role,
          count: count.toNumber()
        };
      },
      '获取角色成员数量成功',
      { role },
      '获取角色成员数量失败'
    );
  }

  /**
   * 获取角色成员
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoleMember(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RoleManager', 'admin');
        
        // 获取所有角色
        const roles = [
          'DEFAULT_ADMIN_ROLE',
          'MINTER_ROLE',
          'PAUSER_ROLE',
          'PROPERTY_MANAGER_ROLE',
          'TRADING_MANAGER_ROLE',
          'REWARD_MANAGER_ROLE'
        ];
        
        // 获取每个角色的成员数量和成员
        const roleData = await Promise.all(roles.map(async (role) => {
          const count = await contract.getRoleMemberCount(role);
          const members = [];
          
          for (let i = 0; i < count; i++) {
            const member = await contract.getRoleMember(role, i);
            members.push(member);
          }
          
          return {
            role,
            count: count.toNumber(),
            members
          };
        }));

        return roleData;
      },
      '获取所有角色成员成功',
      {},
      '获取所有角色成员失败'
    );
  }
}

module.exports = RoleController; 