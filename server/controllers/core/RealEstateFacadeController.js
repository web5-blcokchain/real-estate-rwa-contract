const { ContractUtils, Logger, AddressUtils, EnvUtils } = require('../../../common');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');

/**
 * 房地产外观控制器
 */
class RealEstateFacadeController extends BaseController {
  /**
   * 注册房产并创建代币
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async registerPropertyAndCreateToken(req, res) {
    const { propertyId, propertyData, tokenData } = req.body;
    const contractAddress = EnvUtils.getRealEstateFacadeAddress();
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, propertyData, tokenData, contractAddress })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RealEstateFacade', contractAddress);

        // 调用合约方法
        const tx = await contract.registerPropertyAndCreateToken(
          propertyId,
          propertyData,
          tokenData
        );

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          propertyId
        };
      },
      '房产注册成功',
      { propertyId },
      '房产注册失败'
    );
  }

  /**
   * 更新房产状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePropertyStatus(req, res) {
    const { propertyId, status } = req.body;
    const contractAddress = EnvUtils.getRealEstateFacadeAddress();
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, status, contractAddress })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RealEstateFacade', contractAddress);

        // 调用合约方法
        const tx = await contract.updatePropertyStatus(propertyId, status);

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          propertyId,
          status
        };
      },
      '房产状态更新成功',
      { propertyId, status },
      '房产状态更新失败'
    );
  }

  /**
   * 执行交易
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async executeTrade(req, res) {
    const { propertyId, buyer, seller, price } = req.body;
    const contractAddress = EnvUtils.getRealEstateFacadeAddress();
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, buyer, seller, price, contractAddress })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(buyer) || !AddressUtils.isValid(seller)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RealEstateFacade', contractAddress);

        // 调用合约方法
        const tx = await contract.executeTrade(
          propertyId,
          buyer,
          seller,
          price
        );

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          propertyId,
          buyer,
          seller,
          price
        };
      },
      '交易执行成功',
      { propertyId, buyer, seller, price },
      '交易执行失败'
    );
  }

  /**
   * 分发奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async distributeRewards(req, res) {
    const { propertyId, rewards } = req.body;
    const contractAddress = EnvUtils.getRealEstateFacadeAddress();
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, rewards, contractAddress })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RealEstateFacade', contractAddress);

        // 调用合约方法
        const tx = await contract.distributeRewards(propertyId, rewards);

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          propertyId,
          rewards
        };
      },
      '奖励分发成功',
      { propertyId, rewards },
      '奖励分发失败'
    );
  }

  /**
   * 获取版本
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getVersion(req, res) {
    const contractAddress = EnvUtils.getRealEstateFacadeAddress();
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RealEstateFacade', contractAddress);

        // 调用合约方法
        const version = await contract.getVersion();

        return { version };
      },
      '获取版本成功',
      {},
      '获取版本失败'
    );
  }

  /**
   * 领取奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async claimRewards(req, res) {
    const { propertyId, holder } = req.body;
    const contractAddress = EnvUtils.getRealEstateFacadeAddress();
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, holder, contractAddress })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(holder)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('RealEstateFacade', contractAddress);

        // 调用合约方法
        const tx = await contract.claimRewards(propertyId, holder);

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          propertyId,
          holder
        };
      },
      '奖励领取成功',
      { propertyId, holder },
      '奖励领取失败'
    );
  }
}

module.exports = RealEstateFacadeController; 