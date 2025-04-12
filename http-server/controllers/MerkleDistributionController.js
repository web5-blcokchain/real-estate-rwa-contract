const { ContractUtils } = require('../../common/blockchain/contract');
const MerkleDistributionUtils = require('../utils/merkleDistributionUtils');
const Logger = require('../../common/logger');
const { ApiError } = require('../utils/errors');

const logger = Logger.getInstance('MerkleDistributionController');

/**
 * 处理默克尔树分配的控制器
 */
class MerkleDistributionController {
  constructor() {
    logger.info('Initializing MerkleDistributionController');
  }

  /**
   * @swagger
   * /api/v1/distribution/create:
   *   post:
   *     summary: 创建新的分配
   *     description: 根据代币持有者创建新的分配并生成默克尔树
   *     tags:
   *       - Distribution
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - propertyId
   *               - tokenAddress
   *               - totalAmount
   *               - distributionType
   *               - description
   *               - endTime
   *             properties:
   *               propertyId:
   *                 type: string
   *               tokenAddress:
   *                 type: string
   *               totalAmount:
   *                 type: string
   *               distributionType:
   *                 type: number
   *                 enum: [0, 1, 2]
   *                 description: 0=Dividend, 1=Rent, 2=Bonus
   *               description:
   *                 type: string
   *               endTime:
   *                 type: number
   *                 description: 分配结束时间的unix时间戳（秒）
   *     responses:
   *       200:
   *         description: 分配创建成功
   *       400:
   *         description: 无效的请求参数
   *       500:
   *         description: 服务器错误
   */
  async createDistribution(req, res, next) {
    try {
      logger.info('Creating new distribution');
      const {
        propertyId,
        tokenAddress,
        totalAmount,
        distributionType,
        description,
        endTime
      } = req.body;

      // 验证请求参数
      if (!propertyId || !tokenAddress || !totalAmount) {
        throw new ApiError('Missing required parameters', 400);
      }

      // 验证分配类型是否有效
      if (![0, 1, 2].includes(Number(distributionType))) {
        throw new ApiError('Invalid distribution type', 400);
      }

      // 验证金额是否有效
      if (isNaN(BigInt(totalAmount)) || BigInt(totalAmount) <= 0) {
        throw new ApiError('Invalid total amount', 400);
      }

      // 验证结束时间
      const parsedEndTime = Number(endTime) || 0;
      if (parsedEndTime !== 0 && parsedEndTime <= Math.floor(Date.now() / 1000)) {
        throw new ApiError('End time must be in the future', 400);
      }

      // 生成默克尔树
      const treeData = await MerkleDistributionUtils.generateDistributionTree(
        propertyId,
        tokenAddress,
        totalAmount
      );

      // 获取合约实例
      const rewardManagerContract = await ContractUtils.getContractForController(
        'RewardManager',
        'OPERATOR'
      );

      // 调用合约创建分配
      const tx = await rewardManagerContract.createDistribution(
        propertyId,
        tokenAddress,
        totalAmount,
        treeData.merkleRoot,
        distributionType,
        description || '',
        parsedEndTime
      );

      // 等待交易确认
      const receipt = await ContractUtils.waitForTransaction(tx.hash);
      logger.info(`Distribution created with tx: ${tx.hash}`);

      // 从事件中获取分配ID
      const event = receipt.logs
        .map(log => {
          try {
            return rewardManagerContract.interface.parseLog({ topics: log.topics, data: log.data });
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === 'DistributionCreated');

      if (!event) {
        throw new ApiError('Failed to retrieve distribution ID from event', 500);
      }

      const distributionId = event.args.distributionId.toString();
      logger.info(`Distribution ID: ${distributionId}`);

      // 保存分配数据
      treeData.distributionId = distributionId;
      treeData.distributionType = Number(distributionType);
      treeData.description = description || '';
      treeData.endTime = parsedEndTime;
      treeData.createdAt = Math.floor(Date.now() / 1000);

      const filePath = MerkleDistributionUtils.saveDistributionData(distributionId, treeData);

      return res.status(200).json({
        success: true,
        distributionId,
        merkleRoot: treeData.merkleRoot,
        userCount: treeData.userCount,
        dataFile: filePath
      });
    } catch (error) {
      logger.error(`Error creating distribution: ${error.message}`);
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/distribution/{id}:
   *   get:
   *     summary: 获取分配信息
   *     description: 获取特定分配的详细信息
   *     tags:
   *       - Distribution
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 分配信息
   *       404:
   *         description: 未找到分配
   *       500:
   *         description: 服务器错误
   */
  async getDistribution(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`Getting distribution info for ID: ${id}`);

      // 从合约获取分配信息
      const rewardManagerContract = await ContractUtils.getReadonlyContractWithProvider(
        'RewardManager'
      );

      const onChainDistribution = await rewardManagerContract.getDistribution(id);
      
      if (!onChainDistribution || !onChainDistribution.exists) {
        throw new ApiError('Distribution not found', 404);
      }

      // 获取已领取总额
      const claimedAmount = await rewardManagerContract.getDistributionClaimedAmount(id);

      // 从本地读取默克尔树数据
      let merkleData = {};
      try {
        merkleData = MerkleDistributionUtils.loadDistributionData(id);
      } catch (error) {
        logger.warn(`Could not load local distribution data: ${error.message}`);
      }

      const response = {
        distributionId: id,
        propertyId: onChainDistribution.propertyId.toString(),
        tokenAddress: onChainDistribution.tokenAddress,
        totalAmount: onChainDistribution.totalAmount.toString(),
        claimedAmount: claimedAmount.toString(),
        merkleRoot: onChainDistribution.merkleRoot,
        status: onChainDistribution.status,
        distributionType: onChainDistribution.distributionType,
        description: onChainDistribution.description,
        createdAt: Number(onChainDistribution.createdAt),
        endTime: Number(onChainDistribution.endTime),
        userCount: merkleData.userCount || 0,
        remainingAmount: (BigInt(onChainDistribution.totalAmount) - BigInt(claimedAmount)).toString()
      };

      return res.status(200).json({
        success: true,
        distribution: response
      });
    } catch (error) {
      logger.error(`Error getting distribution: ${error.message}`);
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/distribution/{id}/user/{address}:
   *   get:
   *     summary: 获取用户分配信息
   *     description: 获取特定用户在特定分配中的详细信息
   *     tags:
   *       - Distribution
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: address
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 用户分配信息
   *       404:
   *         description: 未找到分配或用户没有分配
   *       500:
   *         description: 服务器错误
   */
  async getUserDistribution(req, res, next) {
    try {
      const { id, address } = req.params;
      logger.info(`Getting user distribution for ID: ${id}, user: ${address}`);

      // 从合约获取分配信息
      const rewardManagerContract = await ContractUtils.getReadonlyContractWithProvider(
        'RewardManager'
      );

      const onChainDistribution = await rewardManagerContract.getDistribution(id);
      
      if (!onChainDistribution || !onChainDistribution.exists) {
        throw new ApiError('Distribution not found', 404);
      }

      // 获取用户已领取金额
      const claimedAmount = await rewardManagerContract.getUserClaimedAmount(id, address);

      // 从本地获取用户分配详情
      const userDistribution = MerkleDistributionUtils.getUserDistributionDetails(id, address);

      if (!userDistribution) {
        return res.status(200).json({
          success: true,
          hasAllocation: false,
          message: `User ${address} has no allocation in distribution ${id}`
        });
      }

      // 计算剩余可领取金额
      const remainingAmount = BigInt(userDistribution.amount) - BigInt(claimedAmount);

      return res.status(200).json({
        success: true,
        hasAllocation: true,
        userDistribution: {
          distributionId: id,
          userAddress: address,
          totalAmount: userDistribution.amount,
          claimedAmount: claimedAmount.toString(),
          remainingAmount: remainingAmount.toString(),
          proof: userDistribution.proof,
          canClaim: remainingAmount > 0 && Number(onChainDistribution.status) === 1 // 1 = Active
        }
      });
    } catch (error) {
      logger.error(`Error getting user distribution: ${error.message}`);
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/distribution/{id}/withdraw:
   *   post:
   *     summary: 提取分配
   *     description: 用户提取特定分配中的奖励
   *     tags:
   *       - Distribution
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
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
   *               amount:
   *                 type: string
   *     responses:
   *       200:
   *         description: 提取成功
   *       400:
   *         description: 无效的请求参数
   *       404:
   *         description: 未找到分配或用户没有分配
   *       500:
   *         description: 服务器错误
   */
  async withdrawDistribution(req, res, next) {
    try {
      const { id } = req.params;
      const { userAddress, amount } = req.body;

      logger.info(`Withdrawing distribution for ID: ${id}, user: ${userAddress}, amount: ${amount}`);

      // 验证请求参数
      if (!userAddress || !amount) {
        throw new ApiError('Missing required parameters', 400);
      }

      // 从本地获取用户分配详情
      const userDistribution = MerkleDistributionUtils.getUserDistributionDetails(id, userAddress);

      if (!userDistribution) {
        throw new ApiError(`User ${userAddress} has no allocation in distribution ${id}`, 404);
      }

      // 验证金额
      if (BigInt(amount) > BigInt(userDistribution.amount)) {
        throw new ApiError('Requested amount exceeds allocation', 400);
      }

      // 从合约获取分配信息
      const rewardManagerContract = await ContractUtils.getContractForController(
        'RewardManager', 
        'OPERATOR'
      );

      // 获取用户已领取金额
      const claimedAmount = await rewardManagerContract.getUserClaimedAmount(id, userAddress);
      
      // 检查是否超过可提取金额
      if (BigInt(claimedAmount) + BigInt(amount) > BigInt(userDistribution.amount)) {
        throw new ApiError('Amount exceeds remaining allocation', 400);
      }

      // 提取分配
      const tx = await rewardManagerContract.withdraw(
        id,
        userAddress,
        amount,
        userDistribution.proof
      );

      // 等待交易确认
      const receipt = await ContractUtils.waitForTransaction(tx.hash);
      logger.info(`Withdrawal successful, tx: ${tx.hash}`);

      return res.status(200).json({
        success: true,
        transactionHash: tx.hash,
        amount: amount,
        userAddress: userAddress,
        distributionId: id
      });
    } catch (error) {
      logger.error(`Error withdrawing distribution: ${error.message}`);
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/distribution/{id}/status:
   *   put:
   *     summary: 更新分配状态
   *     description: 管理员可以更新分配的状态（激活、取消或完成）
   *     tags:
   *       - Distribution
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
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
   *                 enum: [1, 2, 3]
   *                 description: 1=Active, 2=Completed, 3=Cancelled
   *     responses:
   *       200:
   *         description: 状态更新成功
   *       400:
   *         description: 无效的请求参数
   *       404:
   *         description: 未找到分配
   *       500:
   *         description: 服务器错误
   */
  async updateDistributionStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      logger.info(`Updating distribution status for ID: ${id}, status: ${status}`);

      // 验证请求参数
      if (status === undefined || ![1, 2, 3].includes(Number(status))) {
        throw new ApiError('Invalid status parameter', 400);
      }

      // 获取合约实例
      const rewardManagerContract = await ContractUtils.getContractForController(
        'RewardManager', 
        'ADMIN'
      );

      // 调用合约更新状态
      const tx = await rewardManagerContract.updateDistributionStatus(id, status);

      // 等待交易确认
      const receipt = await ContractUtils.waitForTransaction(tx.hash);
      logger.info(`Distribution status updated, tx: ${tx.hash}`);

      return res.status(200).json({
        success: true,
        transactionHash: tx.hash,
        distributionId: id,
        newStatus: status
      });
    } catch (error) {
      logger.error(`Error updating distribution status: ${error.message}`);
      return next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/distribution/{id}/recover:
   *   post:
   *     summary: 回收未领取资金
   *     description: 管理员可以回收过期或已取消分配中的未领取资金
   *     tags:
   *       - Distribution
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
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
   *                 description: 接收回收资金的地址
   *     responses:
   *       200:
   *         description: 资金回收成功
   *       400:
   *         description: 无效的请求参数
   *       404:
   *         description: 未找到分配
   *       500:
   *         description: 服务器错误
   */
  async recoverUnclaimedFunds(req, res, next) {
    try {
      const { id } = req.params;
      const { receiver } = req.body;

      logger.info(`Recovering unclaimed funds for distribution ID: ${id}, receiver: ${receiver}`);

      // 验证请求参数
      if (!receiver) {
        throw new ApiError('Missing receiver address', 400);
      }

      // 获取合约实例
      const rewardManagerContract = await ContractUtils.getContractForController(
        'RewardManager', 
        'ADMIN'
      );

      // 调用合约回收资金
      const tx = await rewardManagerContract.recoverUnclaimedFunds(id, receiver);

      // 等待交易确认
      const receipt = await ContractUtils.waitForTransaction(tx.hash);
      logger.info(`Unclaimed funds recovered, tx: ${tx.hash}`);

      // 从事件中获取回收金额
      const event = receipt.logs
        .map(log => {
          try {
            return rewardManagerContract.interface.parseLog({ topics: log.topics, data: log.data });
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === 'FundsRecovered');

      const recoveredAmount = event ? event.args.amount.toString() : '0';

      return res.status(200).json({
        success: true,
        transactionHash: tx.hash,
        distributionId: id,
        receiver: receiver,
        recoveredAmount: recoveredAmount
      });
    } catch (error) {
      logger.error(`Error recovering unclaimed funds: ${error.message}`);
      return next(error);
    }
  }
}

// 创建单例实例
const merkleDistributionController = new MerkleDistributionController();

module.exports = merkleDistributionController; 