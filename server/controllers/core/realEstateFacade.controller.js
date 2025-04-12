/**
 * 房地产门面控制器
 * 负责处理与RealEstateFacade合约的交互
 */
const BaseController = require('../BaseController');
const { Logger } = require('../../../common');

class RealEstateFacadeController extends BaseController {
  /**
   * @swagger
   * /api/v1/core/real-estate-facade/register-property:
   *   post:
   *     summary: 注册新房产
   *     description: 注册新房产并发行代币
   *     tags: [RealEstateFacade]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - propertyId
   *               - country
   *               - metadataURI
   *               - initialSupply
   *               - tokenName
   *               - tokenSymbol
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               country:
   *                 type: string
   *                 description: 国家
   *               metadataURI:
   *                 type: string
   *                 description: 元数据URI
   *               initialSupply:
   *                 type: string
   *                 description: 初始代币供应量
   *               tokenName:
   *                 type: string
   *                 description: 代币名称
   *               tokenSymbol:
   *                 type: string
   *                 description: 代币符号
   *     responses:
   *       200:
   *         description: 房产注册成功
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
  async registerProperty(req, res) {
    const { propertyId, country, metadataURI, initialSupply, tokenName, tokenSymbol } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { propertyId, country, metadataURI, initialSupply, tokenName, tokenSymbol })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 调用合约方法
        const contract = this.getContract();
        const tx = await contract.registerProperty(
          propertyId,
          country,
          metadataURI,
          initialSupply,
          tokenName,
          tokenSymbol
        );
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);
        return {
          transactionHash: receipt.transactionHash,
          tokenAddress: receipt.events?.PropertyRegistered?.address || '未能获取代币地址',
          propertyId
        };
      },
      `注册房产成功: ${propertyId}`,
      { propertyId, country },
      `注册房产失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/real-estate-facade/property/{propertyId}:
   *   get:
   *     summary: 获取房产信息
   *     description: 获取指定房产的详细信息
   *     tags: [RealEstateFacade]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: propertyId
   *         required: true
   *         schema:
   *           type: string
   *         description: 房产ID
   *     responses:
   *       200:
   *         description: 房产信息获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       404:
   *         description: 房产不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getProperty(req, res) {
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: '缺少房产ID参数'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const propertyData = await contract.getPropertyInfo(propertyId);
        
        // 确保房产存在
        if (!propertyData || !propertyData.exists) {
          return res.status(404).json({
            success: false,
            error: `房产不存在: ${propertyId}`
          });
        }
        
        return {
          propertyId: propertyData.propertyId,
          status: propertyData.status,
          country: propertyData.country,
          metadataURI: propertyData.metadataURI,
          tokenAddress: propertyData.tokenAddress,
          owner: propertyData.owner
        };
      },
      `获取房产信息成功: ${propertyId}`,
      { propertyId },
      `获取房产信息失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/real-estate-facade/update-property-status:
   *   put:
   *     summary: 更新房产状态
   *     description: 更新指定房产的状态
   *     tags: [RealEstateFacade]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - propertyId
   *               - status
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               status:
   *                 type: integer
   *                 description: 房产状态
   *                 enum: [0, 1, 2, 3, 4, 5]
   *     responses:
   *       200:
   *         description: 房产状态更新成功
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
  async updatePropertyStatus(req, res) {
    const { propertyId, status } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { propertyId, status })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract('manager');
        const tx = await contract.updatePropertyStatus(propertyId, status);
        const receipt = await this.waitForTransaction(tx);
        return {
          transactionHash: receipt.transactionHash,
          propertyId,
          newStatus: status
        };
      },
      `更新房产状态成功: ${propertyId} -> ${status}`,
      { propertyId, status },
      `更新房产状态失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/real-estate-facade/list-properties:
   *   get:
   *     summary: 获取房产列表
   *     description: 获取系统中的所有房产列表
   *     tags: [RealEstateFacade]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: integer
   *           enum: [0, 1, 2, 3, 4, 5]
   *         description: 可选的状态过滤
   *     responses:
   *       200:
   *         description: 房产列表获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   */
  async listProperties(req, res) {
    const { status } = req.query;
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        
        // 如果提供了状态过滤参数，则获取对应状态的房产
        if (status !== undefined) {
          const propertyIds = await contract.getPropertiesByStatus(status);
          return { properties: propertyIds };
        } else {
          // 否则获取所有房产
          const propertyIds = await contract.getAllProperties();
          return { properties: propertyIds };
        }
      },
      `获取房产列表成功${status !== undefined ? ` (状态=${status})` : ''}`,
      { status },
      '获取房产列表失败'
    );
  }

  /**
   * @swagger
   * /api/v1/core/real-estate-facade/create-sell-order:
   *   post:
   *     summary: 创建卖单
   *     description: 创建房产代币卖单
   *     tags: [RealEstateFacade]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tokenAddress
   *               - amount
   *               - price
   *             properties:
   *               tokenAddress:
   *                 type: string
   *                 description: 代币合约地址
   *               amount:
   *                 type: string
   *                 description: 卖出金额
   *               price:
   *                 type: string
   *                 description: 单价
   *     responses:
   *       200:
   *         description: 卖单创建成功
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
  async createSellOrder(req, res) {
    const { tokenAddress, amount, price } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { tokenAddress, amount, price })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const tx = await contract.createSellOrder(tokenAddress, amount, price);
        const receipt = await this.waitForTransaction(tx);
        
        // 从事件中提取订单ID
        const orderId = receipt.events?.OrderCreated?.args?.orderId || 0;
        
        return {
          transactionHash: receipt.transactionHash,
          orderId,
          tokenAddress,
          amount,
          price
        };
      },
      `创建卖单成功: ${tokenAddress}`,
      { tokenAddress, amount, price },
      `创建卖单失败: ${tokenAddress}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/real-estate-facade/buy-tokens:
   *   post:
   *     summary: 购买代币
   *     description: 购买指定卖单的代币
   *     tags: [RealEstateFacade]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - orderId
   *             properties:
   *               orderId:
   *                 type: integer
   *                 description: 卖单ID
   *     responses:
   *       200:
   *         description: 代币购买成功
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
  async buyTokens(req, res) {
    const { orderId } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { orderId })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const tx = await contract.buyTokens(orderId);
        const receipt = await this.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.transactionHash,
          orderId,
          status: '交易成功'
        };
      },
      `购买代币成功: 订单ID=${orderId}`,
      { orderId },
      `购买代币失败: 订单ID=${orderId}`
    );
  }
}

module.exports = new RealEstateFacadeController(); 