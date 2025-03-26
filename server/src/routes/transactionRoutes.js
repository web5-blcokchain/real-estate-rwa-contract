const BaseRouter = require('../../../shared/routes/baseRouter');
const { transactionQueue, TX_STATUS, TX_PRIORITY } = require('../utils/transactionQueue');
const { param, body, query } = require('express-validator');
const { validateRequest } = require('../middlewares/validator');
const { logger } = require('../../../shared/utils/logger');
const { ServerError, BadRequestError, NotFoundError } = require('../../../shared/utils/errors');

/**
 * 交易路由类
 * 提供访问和管理交易队列的API
 */
class TransactionRouter extends BaseRouter {
  constructor() {
    super();
    this.setupRoutes();
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 获取交易状态
    this.get('/:txHash', [
      param('txHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('交易哈希格式不正确'),
      validateRequest
    ], this.getTransactionStatus);

    // 获取所有待处理交易
    this.get('/', [
      query('status').optional().isIn(Object.values(TX_STATUS)).withMessage('无效的交易状态'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
      validateRequest
    ], this.getPendingTransactions);

    // 重试交易
    this.post('/:txHash/retry', [
      param('txHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('交易哈希格式不正确'),
      body('priority').optional().isIn(Object.values(TX_PRIORITY)).withMessage('无效的交易优先级'),
      validateRequest
    ], this.retryTransaction, {
      auth: true,
      permissions: ['operator']
    });

    // 取消所有待处理交易
    this.post('/cancel-all', validateRequest, this.cancelAllTransactions, {
      auth: true,
      permissions: ['admin']
    });
  }

  /**
   * 获取交易状态
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   * @param {Function} next 下一个中间件
   */
  async getTransactionStatus(req, res, next) {
    try {
      const { txHash } = req.params;
      const status = transactionQueue.getTransactionStatus(txHash);
      
      if (status.status === 'unknown') {
        throw new NotFoundError(`交易未找到: ${txHash}`);
      }
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取待处理交易列表
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   * @param {Function} next 下一个中间件
   */
  async getPendingTransactions(req, res, next) {
    try {
      const { status } = req.query;
      const limit = parseInt(req.query.limit || '20');
      
      // 获取所有交易
      const allTxs = Array.from(transactionQueue.pendingTxs.values()).map(tx => ({
        hash: tx.hash,
        status: tx.status,
        priority: tx.priority,
        from: tx.from,
        to: tx.to,
        submittedAt: tx.submittedAt,
        lastChecked: tx.lastChecked,
        confirmedAt: tx.confirmedAt,
        retryCount: tx.retryCount || 0
      }));
      
      // 根据状态筛选
      const filteredTxs = status 
        ? allTxs.filter(tx => tx.status === status)
        : allTxs;
      
      // 按提交时间排序并应用限制
      const sortedTxs = filteredTxs
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, limit);
      
      res.json({
        success: true,
        data: {
          transactions: sortedTxs,
          total: filteredTxs.length,
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 重试交易
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   * @param {Function} next 下一个中间件
   */
  async retryTransaction(req, res, next) {
    try {
      const { txHash } = req.params;
      const { priority } = req.body;
      
      // 获取当前交易状态
      const txStatus = transactionQueue.getTransactionStatus(txHash);
      
      if (txStatus.status === 'unknown') {
        throw new NotFoundError(`交易未找到: ${txHash}`);
      }
      
      if (txStatus.status !== TX_STATUS.FAILED && txStatus.status !== TX_STATUS.STUCK) {
        throw new BadRequestError(`只能重试失败或卡住的交易，当前状态: ${txStatus.status}`);
      }
      
      // 如果提供了新的优先级，获取交易并更新优先级
      if (priority) {
        const tx = transactionQueue.pendingTxs.get(txHash);
        if (tx) {
          tx.priority = priority;
          transactionQueue.pendingTxs.set(txHash, tx);
        }
      }
      
      // 重试交易
      const newTxHash = await transactionQueue.retryTransaction(txHash);
      
      res.json({
        success: true,
        message: `交易重试成功`,
        data: {
          originalTxHash: txHash,
          newTxHash
        }
      });
    } catch (error) {
      logger.error(`重试交易失败: ${error.message}`, { txHash: req.params.txHash });
      next(error);
    }
  }

  /**
   * 取消所有待处理交易
   * @param {Object} req 请求对象
   * @param {Object} res 响应对象
   * @param {Function} next 下一个中间件
   */
  async cancelAllTransactions(req, res, next) {
    try {
      const pendingCount = Array.from(transactionQueue.pendingTxs.values())
        .filter(tx => tx.status === TX_STATUS.PENDING)
        .length;
      
      transactionQueue.cancelAllPendingTransactions();
      
      res.json({
        success: true,
        message: `已取消所有待处理交易`,
        data: {
          canceledCount: pendingCount
        }
      });
    } catch (error) {
      logger.error(`取消交易失败: ${error.message}`);
      next(error);
    }
  }
}

// 创建路由实例
const transactionRouter = new TransactionRouter();

module.exports = transactionRouter.getRouter(); 