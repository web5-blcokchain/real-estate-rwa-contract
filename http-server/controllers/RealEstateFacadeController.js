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
        
        // 尝试从事件中获取代币地址
        let tokenAddress = receipt.events?.PropertyRegistered?.args?.tokenAddress || null;
        
        // 如果从事件中无法获取代币地址，尝试直接从合约查询
        if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
          try {
            Logger.info(`尝试从合约查询代币地址，propertyId: ${propertyId}`);
            tokenAddress = await contract.getPropertyTokenAddress(propertyId);
            
            if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
              Logger.warn(`无法获取代币地址，即使从合约直接查询. propertyId: ${propertyId}`);
              tokenAddress = '未能获取代币地址';
            }
          } catch (error) {
            Logger.error(`获取代币地址失败: ${error.message}`, { propertyId });
            tokenAddress = '未能获取代币地址';
          }
        }
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          tokenAddress,
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
    
    // 如果合约不可用，返回错误
    if (!this.contractAvailable) {
      return this.sendError(res, '区块链合约不可用，无法获取房产信息', 503);
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
   * /api/v1/real-estate/contract-info/{contractName}:
   *   get:
   *     summary: 获取合约接口信息
   *     description: 获取指定合约的接口信息，包括方法和事件
   *     tags: [RealEstateFacade]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: contractName
   *         required: true
   *         schema:
   *           type: string
   *         description: 合约名称
   *     responses:
   *       200:
   *         description: 获取合约接口信息成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: 参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getContractInterfaceInfo(req, res) {
    const { contractName } = req.params;
    
    if (!contractName) {
      return this.sendError(res, '缺少合约名称参数', 400);
    }
    
    try {
      // 使用ContractUtils获取合约接口信息
      const contractInfo = ContractUtils.getContractInterfaceInfo(contractName, 'admin');
      
      return this.sendSuccess(res, contractInfo, `获取合约接口信息成功: ${contractName}`);
    } catch (error) {
      return this.sendError(res, `获取合约接口信息失败: ${error.message}`, 400);
    }
  }

  /**
   * @swagger
   * /api/v1/real-estate/env-info:
   *   get:
   *     summary: 获取环境配置信息
   *     description: 返回当前环境的配置信息，包括网络ID、合约地址等
   *     tags: [RealEstateFacade]
   *     responses:
   *       200:
   *         description: 环境配置信息获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 network:
   *                   type: object
   *                   description: 网络信息
   *                 contracts:
   *                   type: object
   *                   description: 合约地址信息
   *                 merkleDistribution:
   *                   type: boolean
   *                   description: 是否支持Merkle树分配
   *       400:
   *         description: 获取失败
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getEnvInfo(req, res) {
    try {
      // 获取合约实例
      const facadeContract = ContractUtils.getReadonlyContractWithController('RealEstateFacade');
      const provider = facadeContract.runner.provider;
      
      // 获取网络信息
      const network = await provider.getNetwork();
      
      // 获取主要合约地址
      const propertyManagerAddress = await facadeContract.propertyManager();
      const propertyTokenFactoryAddress = await facadeContract.propertyTokenFactory();
      const rewardManagerAddress = await facadeContract.rewardManager();
      const tradingManagerAddress = await facadeContract.tradingManager();
      
      // 检查是否支持Merkle分配
      let supportsMerkleDistribution = false;
      try {
        // 尝试获取RewardManager合约实例
        const rewardManagerContract = ContractUtils.getReadonlyContractInstanceByAddress(
          rewardManagerAddress,
          'RewardManager'
        );
        
        // 检查是否存在merkleRoot方法（通过调用一个不存在的分配ID来测试）
        try {
          await rewardManagerContract.getDistributionMerkleRoot('0');
          supportsMerkleDistribution = true;
        } catch (error) {
          // 如果错误消息包含参数验证失败，而不是函数不存在，则可能支持
          if (error.message.includes('invalid distribution') || 
              error.message.includes('Distribution not found')) {
            supportsMerkleDistribution = true;
          }
        }
      } catch (error) {
        Logger.warn('检查Merkle分配支持时出错', { error: error.message });
      }
      
      // 构建响应
      const response = {
        network: {
          chainId: network.chainId.toString(),
          name: network.name
        },
        contracts: {
          realEstateFacade: facadeContract.target,
          propertyManager: propertyManagerAddress,
          propertyTokenFactory: propertyTokenFactoryAddress,
          rewardManager: rewardManagerAddress,
          tradingManager: tradingManagerAddress
        },
        merkleDistribution: supportsMerkleDistribution
      };
      
      // 返回成功响应
      return res.status(200).json({
        success: true,
        data: response,
        message: '环境配置信息获取成功'
      });
    } catch (error) {
      Logger.error('获取环境配置信息失败', {
        error: error.message,
        stack: error.stack
      });
      
      return res.status(400).json({
        success: false,
        message: `获取环境配置信息失败: ${error.message}`
      });
    }
  }

  /**
   * @swagger
   * /api/v1/real-estate/token-balance/{propertyId}/{userAddress}:
   *   get:
   *     summary: 获取用户代币余额
   *     description: 获取指定用户在特定房产代币中的余额
   *     tags: [RealEstateFacade]
   *     parameters:
   *       - in: path
   *         name: propertyId
   *         required: true
   *         schema:
   *           type: string
   *         description: 房产ID
   *       - in: path
   *         name: userAddress
   *         required: true
   *         schema:
   *           type: string
   *         description: 用户地址
   *     responses:
   *       200:
   *         description: 代币余额获取成功
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
  async getUserTokenBalance(req, res) {
    const { propertyId, userAddress } = req.params;
    
    if (!propertyId || !userAddress) {
      return this.sendError(res, '缺少必要参数: propertyId 或 userAddress', 400);
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例
        const contract = ContractUtils.getReadonlyContractWithProvider('RealEstateFacade');
        
        // 获取代币地址
        const tokenAddress = await contract.getPropertyTokenAddress(propertyId);
        
        if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
          throw new Error(`房产ID ${propertyId} 没有关联的代币`);
        }
        
        // 获取ERC20代币合约实例
        const tokenContract = ContractUtils.getERC20Contract(tokenAddress);
        
        // 获取用户余额
        const balance = await tokenContract.balanceOf(userAddress);
        
        // 获取代币总供应量
        const totalSupply = await tokenContract.totalSupply();
        
        // 获取代币信息
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        
        return {
          propertyId,
          userAddress,
          tokenAddress,
          balance: balance.toString(),
          totalSupply: totalSupply.toString(),
          name,
          symbol,
          decimals: Number(decimals)
        };
      },
      `获取用户代币余额成功: 房产=${propertyId}, 用户=${userAddress}`,
      { propertyId, userAddress },
      `获取用户代币余额失败: 房产=${propertyId}, 用户=${userAddress}`
    );
  }

  /** 
   * 注意：所有分红相关功能已移至RewardManagerController
   * 已移除的方法包括：
   * - createDistribution
   * - activateDistribution
   * - withdraw
   * - createMerkleDistribution
   * - withdrawMerkleDistribution
   * - updateDistributionStatus
   * - getUserDistribution
   * - recoverUnclaimedFunds
   * 
   * 请使用RewardManagerController中对应的方法和/api/reward/路由
   */
}

module.exports = new RealEstateFacadeController(); 