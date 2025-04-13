/**
 * 奖励管理控制器
 * 专注于分配、分红和奖励相关的功能
 */
const BaseController = require('./BaseController');
const { Logger, ContractUtils } = require('../../common');

class RewardManagerController extends BaseController {
  /**
   * 构造函数
   * 初始化控制器
   */
  constructor() {
    super();
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
      const contract = ContractUtils.getContractForController('RewardManager', 'admin');
      
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
        const version = await contract.getVersion();
        Logger.info(`奖励管理合约版本: ${version}`);
      } catch (e) {
        Logger.warn(`获取合约版本失败: ${e.message}`);
      }
      
      Logger.info('奖励管理合约状态检查完成，合约有效');
      this.contractAvailable = true;
    } catch (error) {
      Logger.error('奖励管理合约状态检查失败', {
        error: error.message,
        stack: error.stack
      });
      this.contractAvailable = false;
    }
  }

  /**
   * @swagger
   * /api/v1/reward/distributions:
   *   get:
   *     summary: 获取所有分配ID
   *     description: 获取系统中所有分配的ID列表
   *     tags: [RewardManager]
   *     responses:
   *       200:
   *         description: 成功获取分配ID列表
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: 获取分配ID失败
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getAllDistributions(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例
        const contract = ContractUtils.getReadonlyContractWithProvider('RewardManager');
        
        // 调用合约方法获取所有分配ID
        const distributionIds = await contract.getAllDistributionIds();
        
        // 将大数字转换为字符串
        const formattedIds = distributionIds.map(id => id.toString());
        
        return {
          distributionIds: formattedIds,
          count: formattedIds.length
        };
      },
      '获取分配ID列表成功',
      {},
      '获取分配ID列表失败'
    );
  }

  /**
   * @swagger
   * /api/v1/reward/distribution/{distributionId}:
   *   get:
   *     summary: 获取分配详情
   *     description: 获取特定分配ID的详细信息
   *     tags: [RewardManager]
   *     parameters:
   *       - in: path
   *         name: distributionId
   *         required: true
   *         schema:
   *           type: string
   *         description: 分配ID
   *     responses:
   *       200:
   *         description: 成功获取分配详情
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: 获取分配详情失败
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getDistributionDetails(req, res) {
    const { distributionId } = req.params;
    
    if (!distributionId) {
      return this.sendError(res, '缺少分配ID参数', 400);
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例
        const contract = ContractUtils.getReadonlyContractWithProvider('RewardManager');
        
        // 调用合约方法获取分配详情
        const distribution = await contract.getDistribution(distributionId);
        
        // 格式化返回数据
        const formattedDistribution = {
          distributionId: distribution[0].toString(),
          status: Number(distribution[1]),
          distributionType: Number(distribution[2]),
          createTime: Number(distribution[3]),
          startTime: Number(distribution[4]),
          endTime: Number(distribution[5]),
          propertyId: distribution[6],
          tokenAddress: distribution[7],
          totalAmount: distribution[8].toString(),
          merkleRoot: distribution[9],
          description: distribution[10]
        };
        
        // 获取已领取金额
        const claimedAmount = await contract.getDistributionClaimedAmount(distributionId);
        formattedDistribution.claimedAmount = claimedAmount.toString();
        formattedDistribution.remainingAmount = (BigInt(formattedDistribution.totalAmount) - BigInt(claimedAmount)).toString();
        
        // 添加状态描述
        const statusMap = {
          0: '待定',
          1: '激活',
          2: '完成',
          3: '取消'
        };
        formattedDistribution.statusDescription = statusMap[formattedDistribution.status] || '未知状态';
        
        // 添加分配类型描述
        const typeMap = {
          0: '分红',
          1: '租金',
          2: '奖金'
        };
        formattedDistribution.typeDescription = typeMap[formattedDistribution.distributionType] || '未知类型';
        
        return formattedDistribution;
      },
      `获取分配详情成功: ID=${distributionId}`,
      { distributionId },
      `获取分配详情失败: ID=${distributionId}`
    );
  }

  /**
   * @swagger
   * /api/v1/reward/create-distribution:
   *   post:
   *     summary: 创建新的分配
   *     description: 创建新的分配，包括分红、租金或奖金
   *     tags: [RewardManager]
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
   *               - stablecoinAddress
   *               - description
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               amount:
   *                 type: string
   *                 description: 分配金额
   *               stablecoinAddress:
   *                 type: string
   *                 description: 稳定币合约地址
   *               distributionType:
   *                 type: number
   *                 enum: [0, 1, 2]
   *                 description: 分配类型，0=分红，1=租金，2=奖金
   *                 default: 0
   *               endTime:
   *                 type: number
   *                 description: 结束时间戳（秒），0表示永不过期
   *                 default: 0
   *               description:
   *                 type: string
   *                 description: 分配描述
   *     responses:
   *       200:
   *         description: 分配创建成功
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
    const { propertyId, amount, stablecoinAddress, distributionType = 0, endTime = 0, description } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { propertyId, amount, stablecoinAddress, description })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        try {
          // 使用ContractUtils获取合约实例（manager角色）
          const contract = ContractUtils.getContractForController('RewardManager', 'manager');
          
          // 空的默克尔根（创建时默认为空，后续可以更新）
          const emptyMerkleRoot = '0x0000000000000000000000000000000000000000000000000000000000000000';
          
          // 调用合约方法创建分配
          const tx = await contract.createDistribution(
            propertyId,
            amount,
            stablecoinAddress,
            emptyMerkleRoot,
            distributionType,
            endTime,
            description
          );
          
          // 等待交易确认
          const receipt = await ContractUtils.waitForTransaction(tx);
          
          // 解析事件获取分配ID
          let distributionId = null;
          for (const log of receipt.logs) {
            try {
              const parsedLog = contract.interface.parseLog(log);
              if (parsedLog && parsedLog.name === 'DistributionCreated') {
                distributionId = parsedLog.args.distributionId.toString();
                break;
              }
            } catch (e) {
              // 忽略无法解析的日志
            }
          }
          
          if (!distributionId) {
            Logger.warn('无法从事件中解析分配ID');
          }
          
          return {
            transactionHash: receipt.hash,
            distributionId: distributionId || '未能获取分配ID',
            propertyId,
            amount,
            stablecoinAddress,
            distributionType
          };
        } catch (error) {
          Logger.error(`创建分配时出错: ${error.message}`, {
            propertyId,
            amount,
            stablecoinAddress,
            error: error.stack
          });
          throw error;
        }
      },
      `创建分配成功: ${propertyId}，金额: ${amount}`,
      { propertyId, amount, stablecoinAddress },
      `创建分配失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/reward/update-merkle-root:
   *   post:
   *     summary: 更新分配的默克尔根
   *     description: 为特定分配更新默克尔根，用于验证用户提取资格
   *     tags: [RewardManager]
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
   *               - merkleRoot
   *             properties:
   *               distributionId:
   *                 type: string
   *                 description: 分配ID
   *               merkleRoot:
   *                 type: string
   *                 description: 默克尔根（32字节十六进制字符串）
   *     responses:
   *       200:
   *         description: 默克尔根更新成功
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
  async updateMerkleRoot(req, res) {
    const { distributionId, merkleRoot } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { distributionId, merkleRoot })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（manager角色）
        const contract = ContractUtils.getContractForController('RewardManager', 'manager');
        
        // 验证默克尔根格式
        if (!merkleRoot.startsWith('0x') || merkleRoot.length !== 66) {
          throw new Error('默克尔根格式无效，必须是以0x开头的32字节十六进制字符串');
        }
        
        // 调用合约方法更新默克尔根
        const tx = await contract.updateMerkleRoot(distributionId, merkleRoot);
        
        // 等待交易确认
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
          distributionId,
          merkleRoot
        };
      },
      `更新默克尔根成功: 分配ID=${distributionId}`,
      { distributionId, merkleRoot },
      `更新默克尔根失败: 分配ID=${distributionId}`
    );
  }

  /**
   * @swagger
   * /api/v1/reward/distribution/{id}/status:
   *   put:
   *     summary: 更新分配状态
   *     description: 更新分配的状态（激活、完成或取消）
   *     tags: [RewardManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 分配ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: number
   *                 enum: [0, 1, 2, 3]
   *                 description: 0=待定, 1=激活, 2=完成, 3=取消
   *     responses:
   *       200:
   *         description: 状态更新成功
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
  async updateDistributionStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    
    // 验证必要参数
    if (!id || status === undefined) {
      return this.sendError(res, '缺少必要参数', 400);
    }
    
    // 验证状态值
    if (![0, 1, 2, 3].includes(Number(status))) {
      return this.sendError(res, '无效的状态参数，应为0、1、2或3', 400);
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（manager角色）
        const contract = ContractUtils.getContractForController('RewardManager', 'manager');
        
        // 调用更新分配状态方法
        const tx = await contract.updateDistributionStatus(id, status);
        
        // 等待交易确认
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        // 状态描述映射
        const statusMap = {
          0: '待定',
          1: '激活',
          2: '完成',
          3: '取消'
        };
        
        return {
          transactionHash: receipt.hash,
          distributionId: id,
          newStatus: status,
          statusDescription: statusMap[Number(status)] || '未知状态'
        };
      },
      `更新分配状态成功: ID=${id}, 新状态=${status}`,
      { id, status },
      `更新分配状态失败: ID=${id}`
    );
  }

  /**
   * @swagger
   * /api/v1/reward/distribution/{id}/withdraw:
   *   post:
   *     summary: 使用默克尔证明提取分红
   *     description: 使用默克尔证明提取特定分配的分红奖励
   *     tags: [RewardManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 分配ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userAddress
   *               - amount
   *             properties:
   *               userAddress:
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
  async withdrawMerkleDistribution(req, res) {
    const { id } = req.params;
    const { userAddress, amount } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { id, userAddress, amount })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        try {
          // 验证分配是否存在
          const rewardManagerContract = ContractUtils.getReadonlyContractWithProvider('RewardManager');
          const distribution = await rewardManagerContract.getDistribution(id);
          
          if (!distribution || !distribution[0]) {
            throw new Error(`分配ID ${id} 不存在`);
          }
          
          // 检查分配状态是否激活
          if (Number(distribution[1]) !== 1) {
            throw new Error(`分配ID ${id} 不处于激活状态，当前状态: ${distribution[1]}`);
          }
          
          // 从本地获取用户分配详情
          const merkleDistributionUtils = require('../utils/merkleDistributionUtils');
          const userDistribution = merkleDistributionUtils.getUserDistributionDetails(id, userAddress);
          
          if (!userDistribution) {
            throw new Error(`用户 ${userAddress} 在分配 ${id} 中没有分配`);
          }
          
          // 验证金额
          if (BigInt(amount) <= 0) {
            throw new Error('提取金额必须大于0');
          }
          
          if (BigInt(amount) > BigInt(userDistribution.amount)) {
            throw new Error(`请求金额超过分配金额，最大可用: ${userDistribution.amount}`);
          }
          
          // 使用ContractUtils获取合约实例（operator角色）
          const contract = ContractUtils.getContractForController('RewardManager', 'operator');
          
          // 获取用户已领取金额
          const claimedAmount = await contract.getUserClaimedAmount(id, userAddress);
          Logger.info(`用户 ${userAddress} 已领取金额: ${claimedAmount.toString()}, 请求领取: ${amount}`);
          
          // 检查是否超过可提取金额
          if (BigInt(claimedAmount) + BigInt(amount) > BigInt(userDistribution.amount)) {
            throw new Error(`金额超过剩余可分配金额，已领取: ${claimedAmount.toString()}, 剩余可领: ${BigInt(userDistribution.amount) - BigInt(claimedAmount)}`);
          }
          
          // 验证用户证明
          const isProofValid = merkleDistributionUtils.verifyProof(
            userAddress, 
            userDistribution.amount, 
            userDistribution.proof, 
            userDistribution.merkleRoot
          );
          
          if (!isProofValid) {
            throw new Error('用户提供的Merkle证明无效');
          }
          
          Logger.info(`用户证明验证通过，准备提取分配，用户: ${userAddress}, 金额: ${amount}, 分配ID: ${id}`);
          
          // 提取分配
          const tx = await contract.withdraw(
            id,
            userAddress,
            amount,
            userDistribution.amount,
            userDistribution.proof
          );
          
          // 等待交易确认
          const receipt = await ContractUtils.waitForTransaction(tx);
          
          return {
            transactionHash: receipt.hash,
            amount: amount,
            userAddress: userAddress,
            distributionId: id
          };
        } catch (error) {
          Logger.error(`提取Merkle分配时出错: ${error.message}`, {
            distributionId: id,
            userAddress,
            amount,
            error: error.stack
          });
          throw error;
        }
      },
      `提取分红成功: 分配ID=${id}, 用户=${userAddress}, 金额=${amount}`,
      { id, userAddress, amount },
      `提取分红失败: 分配ID=${id}, 用户=${userAddress}`
    );
  }

  /**
   * @swagger
   * /api/v1/reward/distribution/{id}/user/{address}:
   *   get:
   *     summary: 获取用户分配信息
   *     description: 获取用户在特定分配中的信息，包括可提取金额和已提取金额
   *     tags: [RewardManager]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 分配ID
   *       - in: path
   *         name: address
   *         required: true
   *         schema:
   *           type: string
   *         description: 用户地址
   *     responses:
   *       200:
   *         description: 用户分配信息
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
  async getUserDistribution(req, res) {
    const { id, address } = req.params;
    
    if (!id || !address) {
      return this.sendError(res, '缺少必要参数', 400);
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例
        const contract = ContractUtils.getReadonlyContractWithProvider('RewardManager');
        
        // 获取分配信息
        const onChainDistribution = await contract.getDistribution(id);
        
        // 检查分配是否存在
        if (!onChainDistribution || !onChainDistribution[0]) {
          throw new Error('未找到分配信息');
        }
        
        // 获取用户已领取金额
        const claimedAmount = await contract.getUserClaimedAmount(id, address);
        
        // 从本地获取用户分配详情
        const merkleDistributionUtils = require('../utils/merkleDistributionUtils');
        const userDistribution = merkleDistributionUtils.getUserDistributionDetails(id, address);
        
        if (!userDistribution) {
          return {
            hasAllocation: false,
            message: `用户 ${address} 在分配 ${id} 中没有分配`
          };
        }
        
        // 计算剩余可领取金额
        const remainingAmount = BigInt(userDistribution.amount) - BigInt(claimedAmount);
        
        return {
          hasAllocation: true,
          userDistribution: {
            distributionId: id,
            userAddress: address,
            totalAmount: userDistribution.amount,
            claimedAmount: claimedAmount.toString(),
            remainingAmount: remainingAmount.toString(),
            proof: userDistribution.proof,
            canClaim: remainingAmount > 0 && Number(onChainDistribution[1]) === 1 // 1 = Active
          }
        };
      },
      `获取用户分配信息成功: ID=${id}, 用户=${address}`,
      { id, address },
      `获取用户分配信息失败: ID=${id}, 用户=${address}`
    );
  }

  /**
   * @swagger
   * /api/v1/reward/distribution/{id}/recover:
   *   post:
   *     summary: 回收未领取的资金
   *     description: 管理员可以回收分配中未被领取的资金
   *     tags: [RewardManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 分配ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - receiver
   *             properties:
   *               receiver:
   *                 type: string
   *                 description: 接收地址
   *     responses:
   *       200:
   *         description: 资金回收成功
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
  async recoverUnclaimedFunds(req, res) {
    const { id } = req.params;
    const { receiver } = req.body;
    
    // 验证必要参数
    if (!this.validateRequired(res, { id, receiver })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        // 使用ContractUtils获取合约实例（admin角色）
        const contract = ContractUtils.getContractForController('RewardManager', 'admin');
        
        // 调用回收未领取资金方法
        const tx = await contract.recoverUnclaimedFunds(id, receiver);
        
        // 等待交易确认
        const receipt = await ContractUtils.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.hash,
          distributionId: id,
          receiver
        };
      },
      `回收未领取资金成功: 分配ID=${id}, 接收地址=${receiver}`,
      { id, receiver },
      `回收未领取资金失败: 分配ID=${id}`
    );
  }
}

module.exports = RewardManagerController; 