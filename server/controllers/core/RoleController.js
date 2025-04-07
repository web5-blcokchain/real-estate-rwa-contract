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
    const { contractAddress, address, role } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, address, role })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(address)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RoleManager', contractAddress);
        
        // 调用合约方法
        const tx = await contract.grantRole(role, address);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          address,
          role
        };
      },
      '角色授予成功',
      { address, role },
      '角色授予失败'
    );
  }

  /**
   * 撤销角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async revokeRole(req, res) {
    const { contractAddress, address, role } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, address, role })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(address)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RoleManager', contractAddress);
        
        // 调用合约方法
        const tx = await contract.revokeRole(role, address);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          address,
          role
        };
      },
      '角色撤销成功',
      { address, role },
      '角色撤销失败'
    );
  }

  /**
   * 检查角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async hasRole(req, res) {
    const { contractAddress } = req.query;
    const { address, role } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, address, role })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RoleManager', contractAddress);
        
        // 调用合约方法
        const hasRole = await contract.hasRole(role, address);

        return {
          address,
          role,
          hasRole
        };
      },
      '角色检查完成',
      { address, role },
      '角色检查失败'
    );
  }

  /**
   * 获取角色管理员
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoleAdmin(req, res) {
    const { contractAddress } = req.query;
    const { role } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, role })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RoleManager', contractAddress);
        
        // 调用合约方法
        const adminRole = await contract.getRoleAdmin(role);

        return {
          role,
          adminRole
        };
      },
      '获取角色管理员成功',
      { role },
      '获取角色管理员失败'
    );
  }

  /**
   * 获取角色成员数量
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoleMemberCount(req, res) {
    const { contractAddress } = req.query;
    const { role } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, role })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RoleManager', contractAddress);
        
        // 调用合约方法
        const count = await contract.getRoleMemberCount(role);

        return {
          role,
          count: count.toString()
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
    const { contractAddress } = req.query;
    const { role, index } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, role, index })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RoleManager', contractAddress);
        
        // 调用合约方法
        const member = await contract.getRoleMember(role, parseInt(index));

        return {
          role,
          index,
          member
        };
      },
      '获取角色成员成功',
      { role, index },
      '获取角色成员失败'
    );
  }
}

module.exports = RoleController; 