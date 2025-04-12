/**
 * 交易管理控制器
 * 负责处理与TradingManager合约的交互
 */
const BaseController = require('../BaseController');
const { Logger } = require('../../../common');

class TradingManagerController extends BaseController {
  /**
   * @swagger
   * /api/v1/core/trading-manager/create-order:
   *   post:
   *     summary: 创建交易订单
   *     description: 创建代币交易挂单
   *     tags: [TradingManager]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *               - amount
   *               - price
   *               - isSellOrder
   *             properties:
   *               token:
   *                 type: string
   *                 description: 代币合约地址
   *               amount:
   *                 type: string
   *                 description: 代币数量
   *               price:
   *                 type: string
   *                 description: 单价
   *               isSellOrder:
   *                 type: boolean
   *                 description: 是否为卖单(true)或买单(false)
   *     responses:
   *       200:
   *         description: 订单创建成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: 参数错误或合约错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async createOrder(req, res) {
    const { token, amount, price, isSellOrder } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { token, amount, price, isSellOrder })) {
      return;
    }
    
    // 验证地址格式
    if (!token.startsWith('0x') || token.length !== 42) {
      return res.status(400).json({
        success: false,
        error: '无效的代币地址格式'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const tx = await contract.createOrder(token, amount, price, isSellOrder);
        const receipt = await this.waitForTransaction(tx);
        
        // 尝试从事件中提取订单ID
        const orderId = receipt.events?.OrderCreated?.args?.orderId || 0;
        
        return {
          transactionHash: receipt.transactionHash,
          orderId,
          token,
          amount,
          price,
          isSellOrder
        };
      },
      `创建${isSellOrder ? '卖' : '买'}单成功`,
      { token, amount, price, isSellOrder },
      `创建${isSellOrder ? '卖' : '买'}单失败`
    );
  }

  /**
   * @swagger
   * /api/v1/core/trading-manager/cancel-order/{orderId}:
   *   delete:
   *     summary: 取消订单
   *     description: 取消指定ID的交易订单
   *     tags: [TradingManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 订单ID
   *     responses:
   *       200:
   *         description: 订单取消成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: 参数错误或合约错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async cancelOrder(req, res) {
    const orderId = parseInt(req.params.orderId);
    
    if (isNaN(orderId) || orderId < 0) {
      return res.status(400).json({
        success: false,
        error: '无效的订单ID'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const tx = await contract.cancelOrder(orderId);
        const receipt = await this.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.transactionHash,
          orderId
        };
      },
      `取消订单成功: ${orderId}`,
      { orderId },
      `取消订单失败: ${orderId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/trading-manager/execute-order/{orderId}:
   *   post:
   *     summary: 执行订单
   *     description: 执行指定ID的交易订单
   *     tags: [TradingManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 订单ID
   *     responses:
   *       200:
   *         description: 订单执行成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: 参数错误或合约错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async executeOrder(req, res) {
    const orderId = parseInt(req.params.orderId);
    
    if (isNaN(orderId) || orderId < 0) {
      return res.status(400).json({
        success: false,
        error: '无效的订单ID'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const tx = await contract.executeOrder(orderId);
        const receipt = await this.waitForTransaction(tx);
        
        // 尝试从事件中提取交易ID
        const tradeId = receipt.events?.OrderExecuted?.args?.tradeId || 0;
        
        return {
          transactionHash: receipt.transactionHash,
          orderId,
          tradeId,
          status: '交易成功'
        };
      },
      `执行订单成功: ${orderId}`,
      { orderId },
      `执行订单失败: ${orderId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/trading-manager/order/{orderId}:
   *   get:
   *     summary: 获取订单详情
   *     description: 获取指定ID订单的详细信息
   *     tags: [TradingManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 订单ID
   *     responses:
   *       200:
   *         description: 订单详情获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       404:
   *         description: 订单不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getOrder(req, res) {
    const orderId = parseInt(req.params.orderId);
    
    if (isNaN(orderId) || orderId < 0) {
      return res.status(400).json({
        success: false,
        error: '无效的订单ID'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const order = await contract.getOrder(orderId);
        
        if (!order.active && order.seller === '0x0000000000000000000000000000000000000000') {
          return res.status(404).json({
            success: false,
            error: `订单不存在: ${orderId}`
          });
        }
        
        return {
          id: order.id,
          seller: order.seller,
          token: order.token,
          amount: order.amount.toString(),
          price: order.price.toString(),
          timestamp: order.timestamp.toString(),
          active: order.active,
          isSellOrder: order.isSellOrder
        };
      },
      `获取订单详情成功: ${orderId}`,
      { orderId },
      `获取订单详情失败: ${orderId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/trading-manager/user-orders/{address}:
   *   get:
   *     summary: 获取用户订单
   *     description: 获取指定用户的所有订单ID
   *     tags: [TradingManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: address
   *         required: true
   *         schema:
   *           type: string
   *         description: 用户地址
   *     responses:
   *       200:
   *         description: 用户订单获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   */
  async getUserOrders(req, res) {
    const { address } = req.params;
    
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return res.status(400).json({
        success: false,
        error: '无效的用户地址'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const orderIds = await contract.getUserOrders(address);
        
        return {
          address,
          orderIds: orderIds.map(id => id.toString())
        };
      },
      `获取用户订单成功: ${address}`,
      { address },
      `获取用户订单失败: ${address}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/trading-manager/trade/{tradeId}:
   *   get:
   *     summary: 获取交易详情
   *     description: 获取指定ID交易的详细信息
   *     tags: [TradingManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: tradeId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 交易ID
   *     responses:
   *       200:
   *         description: 交易详情获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       404:
   *         description: 交易不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getTrade(req, res) {
    const tradeId = parseInt(req.params.tradeId);
    
    if (isNaN(tradeId) || tradeId < 0) {
      return res.status(400).json({
        success: false,
        error: '无效的交易ID'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const trade = await contract.getTrade(tradeId);
        
        if (trade.buyer === '0x0000000000000000000000000000000000000000' && 
            trade.seller === '0x0000000000000000000000000000000000000000') {
          return res.status(404).json({
            success: false,
            error: `交易不存在: ${tradeId}`
          });
        }
        
        return {
          id: trade.id,
          orderId: trade.orderId,
          buyer: trade.buyer,
          seller: trade.seller,
          token: trade.token,
          amount: trade.amount.toString(),
          price: trade.price.toString(),
          timestamp: trade.timestamp.toString(),
          isSellOrder: trade.isSellOrder
        };
      },
      `获取交易详情成功: ${tradeId}`,
      { tradeId },
      `获取交易详情失败: ${tradeId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/trading-manager/user-trades/{address}:
   *   get:
   *     summary: 获取用户交易
   *     description: 获取指定用户的所有交易ID
   *     tags: [TradingManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: address
   *         required: true
   *         schema:
   *           type: string
   *         description: 用户地址
   *     responses:
   *       200:
   *         description: 用户交易获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   */
  async getUserTrades(req, res) {
    const { address } = req.params;
    
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return res.status(400).json({
        success: false,
        error: '无效的用户地址'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const tradeIds = await contract.getUserTrades(address);
        
        return {
          address,
          tradeIds: tradeIds.map(id => id.toString())
        };
      },
      `获取用户交易成功: ${address}`,
      { address },
      `获取用户交易失败: ${address}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/trading-manager/token-trades/{tokenAddress}:
   *   get:
   *     summary: 获取代币交易
   *     description: 获取指定代币的所有交易ID
   *     tags: [TradingManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: tokenAddress
   *         required: true
   *         schema:
   *           type: string
   *         description: 代币合约地址
   *     responses:
   *       200:
   *         description: 代币交易获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   */
  async getTokenTrades(req, res) {
    const { tokenAddress } = req.params;
    
    if (!tokenAddress || !tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
      return res.status(400).json({
        success: false,
        error: '无效的代币地址'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const tradeIds = await contract.getTokenTrades(tokenAddress);
        
        return {
          tokenAddress,
          tradeIds: tradeIds.map(id => id.toString())
        };
      },
      `获取代币交易成功: ${tokenAddress}`,
      { tokenAddress },
      `获取代币交易失败: ${tokenAddress}`
    );
  }
}

module.exports = new TradingManagerController(); 