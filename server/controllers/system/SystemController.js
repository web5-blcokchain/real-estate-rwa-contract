const { EnvUtils } = require('../../../common');
const Logger = require('../../../common/logger');
const Utils = require('../../../common/utils');
const { ResponseUtils } = require('../../utils');
const { ethers } = require('ethers');
const BaseController = require('../BaseController');

/**
 * 系统控制器
 */
class SystemController extends BaseController {
  constructor() {
    super();
    // 初始化Provider，用于直接与链交互的方法
    this.provider = new ethers.JsonRpcProvider(EnvUtils.getNetworkConfig().rpcUrl);
  }

  /**
   * 获取系统版本
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getVersion(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContractFor('RealEstateSystem', 'admin');
        
        // 调用合约方法
        const version = await contract.version();

        return { version };
      },
      '获取系统版本成功',
      {},
      '获取系统版本失败'
    );
  }

  /**
   * 获取合约地址
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getContractAddresses(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContractFor('RealEstateSystem', 'admin');
        
        // 调用合约方法
        const addresses = await contract.getContractAddresses();

        return { addresses };
      },
      '获取合约地址成功',
      {},
      '获取合约地址失败'
    );
  }

  /**
   * 获取合约角色
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getContractRoles(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContractFor('RealEstateSystem', 'admin');
        
        // 调用合约方法
        const roles = await contract.getContractRoles();

        return { roles };
      },
      '获取合约角色成功',
      {},
      '获取合约角色失败'
    );
  }

  /**
   * 获取合约配置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getContractConfig(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContractFor('RealEstateSystem', 'admin');
        
        // 调用合约方法
        const config = await contract.getContractConfig();

        return { config };
      },
      '获取合约配置成功',
      {},
      '获取合约配置失败'
    );
  }

  /**
   * 获取区块信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getBlock(req, res) {
    const { blockNumber } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { blockNumber })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取区块信息
        const block = await this.provider.getBlock(blockNumber);
        return block;
      },
      '获取区块信息成功',
      { blockNumber },
      '获取区块信息失败'
    );
  }

  /**
   * 获取交易信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTransaction(req, res) {
    const { hash } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { hash })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取交易信息
        const tx = await this.provider.getTransaction(hash);
        return tx;
      },
      '获取交易信息成功',
      { hash },
      '获取交易信息失败'
    );
  }

  /**
   * 获取交易收据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTransactionReceipt(req, res) {
    const { hash } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { hash })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取交易收据
        const receipt = await this.provider.getTransactionReceipt(hash);
        return receipt;
      },
      '获取交易收据成功',
      { hash },
      '获取交易收据失败'
    );
  }

  /**
   * 获取账户余额
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getBalance(req, res) {
    const { address } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { address })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取账户余额
        const balance = await this.provider.getBalance(address);
        
        return {
          address,
          balance: ethers.formatEther(balance),
          wei: balance.toString()
        };
      },
      '获取账户余额成功',
      { address },
      '获取账户余额失败'
    );
  }
}

module.exports = SystemController; 