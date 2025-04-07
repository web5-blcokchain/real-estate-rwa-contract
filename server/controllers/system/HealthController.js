const { ethers } = require('ethers');
const { Logger, EnvUtils } = require('../../../common');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');

/**
 * 健康检查控制器
 */
class HealthController extends BaseController {
  constructor() {
    super();
    this.provider = new ethers.JsonRpcProvider(EnvUtils.getRpcUrl());
  }

  /**
   * 检查系统健康状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkHealth(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        // 检查区块链连接
        const blockNumber = await this.provider.getBlockNumber();
        
        // 检查数据库连接
        // TODO: 添加数据库连接检查

        // 检查缓存服务
        // TODO: 添加缓存服务检查

        return {
          status: 'healthy',
          blockNumber,
          timestamp: new Date().toISOString()
        };
      },
      '系统健康检查通过',
      {},
      '系统健康检查失败'
    );
  }

  /**
   * 获取系统信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSystemInfo(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        const network = await this.provider.getNetwork();
        
        return {
          network: {
            name: network.name,
            chainId: network.chainId
          },
          node: {
            version: process.version,
            platform: process.platform,
            memory: process.memoryUsage()
          },
          timestamp: new Date().toISOString()
        };
      },
      '获取系统信息成功',
      {},
      '获取系统信息失败'
    );
  }
}

module.exports = HealthController; 