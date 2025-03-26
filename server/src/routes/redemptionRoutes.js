const BaseRouter = require('../../../shared/routes/baseRouter');
const RedemptionController = require('../controllers/redemptionController');
const { validators } = require('../middlewares/validator');
const { param, body } = require('express-validator');
const { validateRequest } = require('../middlewares/validator');

/**
 * 赎回路由类
 */
class RedemptionRouter extends BaseRouter {
  constructor() {
    super();
    this.setupRoutes();
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 获取所有赎回请求
    this.get('/', validators.paginationValidators, RedemptionController.getAllRedemptionRequests);

    // 获取特定赎回请求详情
    this.get('/:requestId', [
      param('requestId').isString().notEmpty().withMessage('请求ID不能为空'),
      validateRequest
    ], RedemptionController.getRedemptionRequest);

    // 检查稳定币是否受支持
    this.get('/stablecoin/:stablecoinAddress', [
      param('stablecoinAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('稳定币地址格式不正确'),
      validateRequest
    ], RedemptionController.isSupportedStablecoin);

    // 批准赎回请求
    this.post('/:requestId/approve', [
      param('requestId').isString().notEmpty().withMessage('请求ID不能为空'),
      body('stablecoinAmount').isString().notEmpty().withMessage('稳定币金额不能为空'),
      validateRequest
    ], RedemptionController.approveRedemption, {
      auth: true,
      permissions: ['operator']
    });

    // 拒绝赎回请求
    this.post('/:requestId/reject', [
      param('requestId').isString().notEmpty().withMessage('请求ID不能为空'),
      validateRequest
    ], RedemptionController.rejectRedemption, {
      auth: true,
      permissions: ['operator']
    });

    // 完成赎回请求
    this.post('/:requestId/complete', [
      param('requestId').isString().notEmpty().withMessage('请求ID不能为空'),
      validateRequest
    ], RedemptionController.completeRedemption, {
      auth: true,
      permissions: ['operator']
    });

    // 添加支持的稳定币
    this.post('/stablecoin', [
      body('stablecoinAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('稳定币地址格式不正确'),
      validateRequest
    ], RedemptionController.addSupportedStablecoin, {
      auth: true,
      permissions: ['operator']
    });

    // 移除支持的稳定币
    this.delete('/stablecoin', [
      body('stablecoinAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('稳定币地址格式不正确'),
      validateRequest
    ], RedemptionController.removeSupportedStablecoin, {
      auth: true,
      permissions: ['operator']
    });

    // 紧急提款
    this.post('/withdraw', [
      body('token').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      body('to').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('接收地址格式不正确'),
      body('amount').isString().notEmpty().withMessage('金额不能为空'),
      validateRequest
    ], RedemptionController.emergencyWithdraw, {
      auth: true,
      permissions: ['admin']
    });
  }
}

// 创建路由实例
const redemptionRouter = new RedemptionRouter();

module.exports = redemptionRouter.getRouter(); 