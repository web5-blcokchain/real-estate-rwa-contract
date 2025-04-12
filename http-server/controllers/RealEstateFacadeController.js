/**
 * 不动产外观控制器
 * 集成不动产相关的所有功能，包括登记、估值更新、分红和交易
 */
const BaseController = require('./BaseController');
const { Logger, ContractUtils } = require('../../common');

class RealEstateFacadeController extends BaseController {
  /**
   * 构造函数
   * 初始化控制器
   */
  constructor() {
    super();
    // 用于存储已注册的房产ID
    this.registeredProperties = new Map();
    // 初始化控制器，检查合约状态
    this.checkContractStatus();
  }

  /**
   * 检查合约状态
   * 验证合约是否存在并可用
   */
  async checkContractStatus() {
    try {
      // 获取合约实例
      const contract = ContractUtils.getContractForController('RealEstateFacade', 'admin');
      
      // 获取提供者
      const provider = contract.runner.provider;
      if (!provider) {
        Logger.error('合约没有提供者，可能未正确连接到节点');
        this.contractAvailable = false;
        return;
      }
      
      // 获取合约代码
      const code = await provider.getCode(contract.target);
      if (code === '0x') {
        Logger.error(`合约地址 ${contract.target} 上没有代码！请确保已正确部署合约`, {
          contractAddress: contract.target,
          network: await provider.getNetwork()
        });
        this.contractAvailable = false;
        return;
      }
      
      // 简单的接口测试
      try {
        const isImpl = await contract.getImplementation();
        Logger.info(`合约是代理合约，实现合约地址: ${isImpl}`);
      } catch (e) {
        // 忽略，可能不是代理合约
      }
      
      Logger.info('合约状态检查完成，合约有效');
      this.contractAvailable = true;
    } catch (error) {
      Logger.error('合约状态检查失败', {
        error: error.message,
        stack: error.stack
      });
      this.contractAvailable = false;
    }
  }

  /**
   * 生成模拟数据
   * 仅用于测试，不在生产环境使用
   * @param {string} propertyId - 房产ID
   */
  getMockData(propertyId) {
    if (process.env.NODE_ENV === 'production') {
      Logger.error('生产环境不允许使用模拟数据', { propertyId });
      return null;
    }
    
    // 检查是否已经生成了该房产的数据
    if (this.registeredProperties.has(propertyId)) {
      return this.registeredProperties.get(propertyId);
    }
    
    // 根据propertyId生成一个稳定的token地址
    const tokenAddress = `0x${propertyId.padStart(40, '0')}`;
    
    // 创建模拟数据
    const mockData = {
      propertyId,
      tokenAddress,
      status: '1', // 已注册状态
      valuation: `${parseInt(propertyId) * 10000}`
    };
    
    // 存储模拟数据
    this.registeredProperties.set(propertyId, mockData);
    
    Logger.warn('使用模拟数据，因为合约不可用', {
      propertyId,
      contractAvailable: this.contractAvailable
    });
    
    return mockData;
  }

  /**
   * @swagger
   * /api/v1/real-estate/register-property:
   *   post:
   *     summary: 注册新房产
   *     description: 注册新房产并发行对应的代币
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
        // 使用ContractUtils获取合约实例
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'admin');
        const tx = await contract.registerPropertyAndCreateToken(
          propertyId,
          country,
          metadataURI,
          initialSupply,
          tokenName,
          tokenSymbol
        );
        
        // 等待交易确认
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          tokenAddress: receipt.events?.PropertyRegistered?.args?.tokenAddress || '未能获取代币地址',
        };
      },
      `注册房产成功: ${propertyId}`,
      { propertyId, country },
      `注册房产失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/real-estate/property/{propertyId}:
   *   get:
   *     summary: 获取房产信息
   *     description: 获取指定房产ID的详细信息
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
  async getPropertyInfo(req, res) {
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return this.sendError(res, '缺少房产ID参数', 400);
    }
    
    // 如果合约不可用，使用模拟数据
    if (!this.contractAvailable) {
      const mockData = this.getMockData(propertyId);
      if (mockData) {
        return this.sendSuccess(res, mockData, `获取房产信息成功（模拟数据）: ${propertyId}`);
      } else {
        return this.sendError(res, `房产ID ${propertyId} 不存在（模拟数据）`, 404);
      }
    }
    
    // 使用合约获取真实数据
    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'admin');
        
        // 获取房产代币地址
        const tokenAddress = await contract.getPropertyTokenAddress(propertyId);
        
        if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
          throw new Error(`房产ID ${propertyId} 不存在`);
        }
        
        // 获取房产状态
        const status = await contract.getPropertyStatus(propertyId);
        
        // 获取房产估值
        const valuation = await contract.getPropertyValuation(propertyId);
        
        return {
          propertyId,
          tokenAddress,
          status: status.toString(),
          valuation: valuation.toString()
        };
      },
      `获取房产信息成功: ${propertyId}`,
      { propertyId },
      `获取房产信息失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/real-estate/property-status:
   *   put:
   *     summary: 更新房产状态
   *     description: 更新指定房产的状态，需要MANAGER权限
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
   *                 enum: [0, 1, 2, 3, 4]
   *                 description: 新的房产状态
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
    
    // 验证状态值
    if (isNaN(parseInt(status)) || status < 0 || status > 4) {
      return this.sendError(res, '无效的状态参数，应为0-4之间的整数', 400);
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（manager角色）
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'manager');
        const tx = await contract.updatePropertyStatus(propertyId, status);
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
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
   * /api/v1/real-estate/property-valuation:
   *   put:
   *     summary: 更新房产估值
   *     description: 更新指定房产的估值，需要MANAGER权限
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
   *               - newValue
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               newValue:
   *                 type: string
   *                 description: 新的估值
   *     responses:
   *       200:
   *         description: 房产估值更新成功
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
  async updatePropertyValuation(req, res) {
    const { propertyId, newValue } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { propertyId, newValue })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（manager角色）
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'manager');
        const tx = await contract.updatePropertyValuation(propertyId, newValue);
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          newValue
        };
      },
      `更新房产估值成功: ${propertyId} -> ${newValue}`,
      { propertyId, newValue },
      `更新房产估值失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/real-estate/create-sell-order:
   *   post:
   *     summary: 创建卖单
   *     description: 创建代币卖单
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
   *               - amount
   *               - price
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
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
    const { propertyId, amount, price } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { propertyId, amount, price })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（operator角色）
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'operator');
        const tx = await contract.createSellOrder(propertyId, amount, price);
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          amount,
          price
        };
      },
      `创建卖单成功: ${propertyId}`,
      { propertyId, amount, price },
      `创建卖单失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/real-estate/create-buy-order:
   *   post:
   *     summary: 创建买单
   *     description: 创建代币买单
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
   *               - amount
   *               - price
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               amount:
   *                 type: string
   *                 description: 买入金额
   *               price:
   *                 type: string
   *                 description: 单价
   *     responses:
   *       200:
   *         description: 买单创建成功
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
  async createBuyOrder(req, res) {
    const { propertyId, amount, price } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { propertyId, amount, price })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（operator角色）
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'operator');
        const tx = await contract.createBuyOrder(propertyId, amount, price);
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          amount,
          price
        };
      },
      `创建买单成功: ${propertyId}`,
      { propertyId, amount, price },
      `创建买单失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/real-estate/create-distribution:
   *   post:
   *     summary: 创建奖励分配
   *     description: 创建房产奖励分配，需要MANAGER权限
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
   *               - amount
   *               - description
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               amount:
   *                 type: string
   *                 description: 分配金额
   *               description:
   *                 type: string
   *                 description: 分配描述
   *     responses:
   *       200:
   *         description: 创建分配成功
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
  async createDistribution(req, res) {
    const { propertyId, amount, description } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { propertyId, amount, description })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（manager角色）
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'manager');
        const tx = await contract.createDistribution(propertyId, amount, description);
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        const distributionId = receipt.events?.DistributionCreated?.args?.distributionId || '0';
        
        return {
          transactionHash: receipt.hash,
          distributionId: distributionId.toString(),
          propertyId,
          amount
        };
      },
      `创建奖励分配成功: ${propertyId}`,
      { propertyId, amount, description },
      `创建奖励分配失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/real-estate/withdraw:
   *   post:
   *     summary: 提取分红
   *     description: 提取特定分配的分红奖励
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
   *               - distributionId
   *               - user
   *               - amount
   *             properties:
   *               distributionId:
   *                 type: string
   *                 description: 分配ID
   *               user:
   *                 type: string
   *                 description: 用户地址
   *               amount:
   *                 type: string
   *                 description: 提取金额
   *     responses:
   *       200:
   *         description: 提取分红成功
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
  async withdraw(req, res) {
    const { distributionId, user, amount } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { distributionId, user, amount })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（operator角色）
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'operator');
        const tx = await contract.withdraw(distributionId, user, amount);
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
          distributionId,
          user,
          amount
        };
      },
      `提取分红成功: 分配ID=${distributionId}, 用户=${user}`,
      { distributionId, user, amount },
      `提取分红失败: 分配ID=${distributionId}, 用户=${user}`
    );
  }
}

module.exports = new RealEstateFacadeController(); 