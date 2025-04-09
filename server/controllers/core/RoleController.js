const { ContractUtils, AddressUtils } = require('../../../common');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');

/**
 * 角色控制器
 * 使用新的权限管理系统，通过System合约管理角色
 */
class RoleController extends BaseController {
  /**
   * 授予角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async grantRole(role, account) {
    // 验证参数
    if (!role || !account) {
      throw new Error('角色ID和账户地址不能为空');
    }

    // 获取合约实例 - 现在使用System合约而不是RoleManager
    const contract = this.getContract('RealEstateSystem', 'admin');
    
    // 调用合约方法
    const tx = await contract.grantRole(role, account);
    
    // 等待交易确认
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      role,
      account
    };
  }

  /**
   * 撤销角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async revokeRole(role, account) {
    // 验证参数
    if (!role || !account) {
      throw new Error('角色ID和账户地址不能为空');
    }

    // 获取合约实例 - 现在使用System合约而不是RoleManager
    const contract = this.getContract('RealEstateSystem', 'admin');
    
    // 调用合约方法
    const tx = await contract.revokeRole(role, account);
    
    // 等待交易确认
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      role,
      account
    };
  }

  /**
   * 检查是否拥有角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async hasRole(role, account) {
    // 验证参数
    if (!role || !account) {
      throw new Error('角色ID和账户地址不能为空');
    }

    // 获取合约实例 - 现在使用System合约而不是RoleManager
    const contract = this.getContract('RealEstateSystem', 'admin');
    
    // 调用合约方法
    const hasRole = await contract.hasRole(role, account);

    return {
      role,
      account,
      hasRole
    };
  }

  /**
   * 获取角色的管理员角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRole(roleId) {
    // 验证参数
    if (!roleId) {
      throw new Error('角色ID不能为空');
    }

    // 获取合约实例 - 现在使用System合约而不是RoleManager
    const contract = this.getContract('RealEstateSystem', 'admin');
    
    // 调用合约方法
    const adminRole = await contract.getRoleAdmin(roleId);

    return {
      role: roleId,
      adminRole,
      isDefault: roleId === await contract.DEFAULT_ADMIN_ROLE()
    };
  }

  /**
   * 获取所有角色及其成员
   */
  async getRoles() {
    // 获取合约实例 - 现在使用System合约而不是RoleManager
    const contract = this.getContract('RealEstateSystem', 'admin');
    
    // 从RoleConstants获取角色
    const roles = [
      await contract.DEFAULT_ADMIN_ROLE(),
      await contract.ADMIN_ROLE(),
      await contract.MANAGER_ROLE(),
      await contract.OPERATOR_ROLE(),
      await contract.PAUSER_ROLE(),
      await contract.UPGRADER_ROLE()
    ];
    
    // 获取每个角色的成员
    const roleData = await Promise.all(roles.map(async (role) => {
      try {
        // 获取角色管理员
        const adminRole = await contract.getRoleAdmin(role);
        
        // 获取角色名称
        let roleName = "Unknown Role";
        
        // 根据角色值确定名称
        if (role === await contract.DEFAULT_ADMIN_ROLE()) roleName = "DEFAULT_ADMIN_ROLE";
        else if (role === await contract.ADMIN_ROLE()) roleName = "ADMIN_ROLE";
        else if (role === await contract.MANAGER_ROLE()) roleName = "MANAGER_ROLE";
        else if (role === await contract.OPERATOR_ROLE()) roleName = "OPERATOR_ROLE";
        else if (role === await contract.PAUSER_ROLE()) roleName = "PAUSER_ROLE";
        else if (role === await contract.UPGRADER_ROLE()) roleName = "UPGRADER_ROLE";
        
        // 获取该角色的事件
        const filter = contract.filters.RoleGranted(role, null, null);
        const events = await contract.queryFilter(filter);
        
        // 从事件中提取成员地址
        const members = events
          .map(event => event.args.account)
          // 过滤掉重复的地址
          .filter((address, index, self) => 
            self.indexOf(address) === index
          );
        
        // 验证每个成员是否仍然拥有该角色
        const confirmedMembers = await Promise.all(
          members.map(async (address) => {
            const hasRole = await contract.hasRole(role, address);
            return hasRole ? address : null;
          })
        );
        
        return {
          roleId: role,
          name: roleName,
          adminRole,
          members: confirmedMembers.filter(address => address !== null)
        };
      } catch (error) {
        console.error(`获取角色 ${role} 信息时出错:`, error);
        return {
          roleId: role,
          name: "Error",
          adminRole: null,
          members: []
        };
      }
    }));

    return roleData;
  }

  /**
   * 获取特定角色的成员
   */
  async getRoleMembers(role) {
    // 验证参数
    if (!role) {
      throw new Error('角色ID不能为空');
    }

    // 获取合约实例 - 现在使用System合约而不是RoleManager
    const contract = this.getContract('RealEstateSystem', 'admin');
    
    // 获取该角色的事件
    const filter = contract.filters.RoleGranted(role, null, null);
    const events = await contract.queryFilter(filter);
    
    // 从事件中提取成员地址
    const members = events
      .map(event => event.args.account)
      // 过滤掉重复的地址
      .filter((address, index, self) => 
        self.indexOf(address) === index
      );
    
    // 验证每个成员是否仍然拥有该角色
    const confirmedMembers = await Promise.all(
      members.map(async (address) => {
        const hasRole = await contract.hasRole(role, address);
        return hasRole ? address : null;
      })
    );
    
    return {
      role,
      count: confirmedMembers.filter(address => address !== null).length,
      members: confirmedMembers.filter(address => address !== null)
    };
  }
}

module.exports = RoleController; 