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
    
    try {
      // 检查本地缓存
      const propertyCache = require('../utils/propertyCache');
      const cachedProperty = propertyCache.getProperty(propertyId);
      
      // 如果找到缓存，并且不是强制刷新模式，返回缓存数据
      if (cachedProperty && req.query.refresh !== 'true') {
        Logger.info(`从缓存获取房产信息: ${propertyId}`);
        return this.sendSuccess(res, '获取房产信息成功', {
          propertyId: propertyId,
          ...cachedProperty,
          fromCache: true,
          cachedAt: cachedProperty.cachedAt
        });
      }
      
      // 如果没有缓存或者是强制刷新模式，从链上获取
      if (!this.contractAvailable) {
        // 如果合约不可用但有缓存，返回缓存数据并加上警告
        if (cachedProperty) {
          Logger.warn(`区块链合约不可用，返回缓存数据: ${propertyId}`);
          return this.sendSuccess(res, '获取房产信息成功(从缓存)', {
            propertyId: propertyId,
            ...cachedProperty,
            fromCache: true,
            cachedAt: cachedProperty.cachedAt,
            warning: '区块链合约不可用，返回的是缓存数据'
          });
        }
        return this.sendError(res, '区块链合约不可用，无法获取房产信息', 503);
      }
      
      // 从链上获取房产信息
      return await this.handleContractAction(
        res,
        async () => {
          const contract = ContractUtils.getContractForController('PropertyManager', 'admin');
          const exists = await contract.propertyExists(propertyId);
          
          if (!exists) {
            // 如果链上不存在但缓存存在，返回缓存并加上警告
            if (cachedProperty) {
              Logger.warn(`链上未找到房产 ${propertyId}，返回缓存数据`);
              return {
                propertyId: propertyId,
                ...cachedProperty,
                fromCache: true,
                cachedAt: cachedProperty.cachedAt,
                warning: '链上未找到此房产，返回的是缓存数据'
              };
            }
            throw new Error(`房产ID ${propertyId} 不存在`);
          }
          
          const property = await contract.getProperty(propertyId);
          const facadeContract = ContractUtils.getContractForController('RealEstateFacade', 'admin');
          const tokenAddress = await facadeContract.getPropertyTokenAddress(propertyId);
          
          // 格式化返回数据，添加空值检查
          const formattedProperty = {
            propertyId: propertyId,
            status: property?.status ? Number(property.status) : 0,
            country: property?.country || '',
            metadataURI: property?.metadataURI || '',
            initialSupply: property?.initialSupply ? property.initialSupply.toString() : '0',
            valuation: property?.valuation ? property.valuation.toString() : '0',
            tokenAddress: tokenAddress || '0x0000000000000000000000000000000000000000',
            statusDescription: this.getStatusDescription(Number(property?.status || 0)),
            createdAt: property?.creationTime ? Number(property.creationTime) * 1000 : Date.now(), // 转换为毫秒
            fromChain: true,
            updatedAt: new Date().toISOString()
          };
          
          // 更新本地缓存
          try {
            // 组装缓存数据格式
            const cacheData = {
              success: true,
              data: formattedProperty
            };
            
            // 确保缓存目录存在
            const fs = require('fs');
            const path = require('path');
            const CACHE_DIR = path.resolve(__dirname, '../../cache');
            if (!fs.existsSync(CACHE_DIR)) {
              fs.mkdirSync(CACHE_DIR, { recursive: true });
            }
            
            // 更新缓存
            let cacheExists = false;
            let existingCache = {};
            const PROPERTY_CACHE_FILE = path.join(CACHE_DIR, 'property-cache.json');
            
            if (fs.existsSync(PROPERTY_CACHE_FILE)) {
              try {
                const fileContent = fs.readFileSync(PROPERTY_CACHE_FILE, 'utf8');
                existingCache = JSON.parse(fileContent);
                cacheExists = true;
              } catch (e) {
                Logger.warn(`解析房产缓存文件失败: ${e.message}`);
              }
            }
            
            // 更新或添加房产数据
            existingCache[propertyId] = {
              ...formattedProperty,
              cachedAt: new Date().toISOString()
            };
            
            // 写入缓存文件
            fs.writeFileSync(
              PROPERTY_CACHE_FILE,
              JSON.stringify(existingCache, null, 2),
              'utf8'
            );
            
            Logger.info(`房产数据已更新到缓存: ${propertyId}`);
          } catch (cacheError) {
            Logger.error(`更新房产缓存失败: ${cacheError.message}`, cacheError);
          }
          
          return formattedProperty;
        },
        `获取房产信息成功: ${propertyId}`,
        { propertyId },
        `获取房产信息失败: ${propertyId}`
      );
    } catch (error) {
      Logger.error(`获取房产信息时出错: ${error.message}`, {
        propertyId,
        error: error.stack
      });
      return this.sendError(res, `获取房产信息失败: ${error.message}`, 500);
    }
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
   * @swagger
   * /api/v1/real-estate/token-approve:
   *   post:
   *     summary: 授权代币
   *     description: 授权代币给指定地址
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
   *               - spender
   *               - amount
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               spender:
   *                 type: string
   *                 description: 被授权地址
   *               amount:
   *                 type: string
   *                 description: 授权金额
   *     responses:
   *       200:
   *         description: 授权成功
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
  async approveToken(req, res) {
    const { propertyId, spender, amount } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { propertyId, spender, amount })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例
        const contract = ContractUtils.getContractForController('RealEstateFacade', 'admin');
        
        // 获取代币地址
        const tokenAddress = await contract.getPropertyTokenAddress(propertyId);
        
        if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
          throw new Error(`房产ID ${propertyId} 没有关联的代币`);
        }
        
        // 获取ERC20代币合约实例
        const tokenContract = await ContractUtils.getContract('SimpleERC20', tokenAddress, contract.runner);
        
        // 执行授权
        const tx = await tokenContract.approve(spender, amount);
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          tokenAddress,
          spender,
          amount
        };
      },
      `代币授权成功: 房产=${propertyId}, 授权地址=${spender}`,
      { propertyId, spender, amount },
      `代币授权失败: 房产=${propertyId}, 授权地址=${spender}`
    );
  }

  /**
   * @swagger
   * /api/v1/real-estate/token-allowance/{propertyId}/{owner}/{spender}:
   *   get:
   *     summary: 查询代币授权额度
   *     description: 查询指定地址对代币的授权额度
   *     tags: [RealEstateFacade]
   *     parameters:
   *       - in: path
   *         name: propertyId
   *         required: true
   *         schema:
   *           type: string
   *         description: 房产ID
   *       - in: path
   *         name: owner
   *         required: true
   *         schema:
   *           type: string
   *         description: 代币所有者地址
   *       - in: path
   *         name: spender
   *         required: true
   *         schema:
   *           type: string
   *         description: 被授权地址
   *     responses:
   *       200:
   *         description: 查询成功
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
  async getTokenAllowance(req, res) {
    try {
      const { propertyId, owner, spender } = req.params;
      
      if (!propertyId || !owner || !spender) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }

      // 获取 RealEstateFacade 合约实例
      const contract = await ContractUtils.getContractForController('RealEstateFacade', 'admin');
      
      // 获取代币地址
      const tokenAddress = await contract.getPropertyTokenAddress(propertyId);
      
      // 获取 ERC20 合约实例
      const tokenContract = await ContractUtils.getReadonlyContractWithProvider('SimpleERC20', tokenAddress, contract.runner.provider);
      
      // 查询授权额度
      const allowance = await tokenContract.allowance(owner, spender);
      
      return res.json({
        success: true,
        data: {
          tokenAddress,
          owner,
          spender,
          allowance: allowance.toString()
        }
      });
    } catch (error) {
      Logger.error('获取代币授权额度失败', error);
      return res.status(500).json({
        success: false,
        message: '获取代币授权额度失败',
        error: error.message
      });
    }
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

  /**
   * 获取房产状态描述
   * @param {Number} status - 房产状态数值
   * @returns {String} 状态描述
   */
  getStatusDescription(status) {
    const statusMap = {
      0: '未初始化',
      1: '已注册',
      2: '可售',
      3: '交易中',
      4: '已售出',
      5: '暂停交易',
      6: '已下架'
    };
    
    return statusMap[status] || '未知状态';
  }
}

module.exports = new RealEstateFacadeController(); 