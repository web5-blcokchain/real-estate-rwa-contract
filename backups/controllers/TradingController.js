// 导入共通工具
const { ContractUtils, AddressUtils, Logger } = require('../../../common');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');

/**
 * 交易控制器
 */
class TradingController extends BaseController {
  /**
   * 执行交易
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async executeTrade(req, res) {
    const { tokenAddress, seller, buyer, amount, price } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { tokenAddress, seller, buyer, amount, price })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(tokenAddress) || !AddressUtils.isValid(seller) || !AddressUtils.isValid(buyer)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('TradingManager', 'admin');
        
        // 调用合约方法
        const tx = await contract.executeTrade(tokenAddress, seller, buyer, amount, price);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          tokenAddress,
          seller,
          buyer,
          amount,
          price
        };
      },
      '交易执行成功',
      { tokenAddress, seller, buyer, amount, price },
      '交易执行失败'
    );
  }

  /**
   * 批量执行交易
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async batchExecuteTrade(req, res) {
    const { trades } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { trades })) {
      return;
    }

    if (trades.length === 0) {
      return ResponseUtils.sendError(res, '交易列表不能为空', 400);
    }

    // 验证参数格式
    for (const trade of trades) {
      if (!trade.tokenAddress || !trade.seller || !trade.buyer || !trade.amount || !trade.price) {
        return ResponseUtils.sendError(res, '交易参数格式错误', 400);
      }

      // 验证地址格式
      if (!AddressUtils.isValid(trade.tokenAddress) || 
          !AddressUtils.isValid(trade.seller) || 
          !AddressUtils.isValid(trade.buyer)) {
        return ResponseUtils.sendError(res, '无效的地址格式', 400);
      }
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('TradingManager', 'admin');
        
        // 调用合约方法
        const tx = await contract.batchExecuteTrade(
          trades.map(t => t.tokenAddress),
          trades.map(t => t.seller),
          trades.map(t => t.buyer),
          trades.map(t => t.amount),
          trades.map(t => t.price)
        );
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          tradesCount: trades.length
        };
      },
      '批量交易执行成功',
      { tradesCount: trades.length },
      '批量交易执行失败'
    );
  }

  /**
   * 获取交易历史
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTradeHistory(req, res) {
    const { tokenAddress } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { tokenAddress })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(tokenAddress)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('TradingManager', 'admin');
        
        // 调用合约方法
        const history = await contract.getTradeHistory(tokenAddress);

        return {
          tokenAddress,
          history
        };
      },
      '获取交易历史成功',
      { tokenAddress },
      '获取交易历史失败'
    );
  }
}

module.exports = TradingController; 