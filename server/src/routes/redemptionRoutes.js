const BaseRouter = require('../../../shared/routes/baseRouter');
const RedemptionController = require('../controllers/redemptionController');
const { ethers } = require('ethers');

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
    this.get('/', RedemptionController.getAllRedemptionRequests);

    // 获取特定赎回请求详情
    this.get('/:requestId', RedemptionController.getRedemptionRequest, {
      validation: {
        params: {
          requestId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 检查稳定币是否受支持
    this.get('/stablecoin/:stablecoinAddress', RedemptionController.isSupportedStablecoin, {
      validation: {
        params: {
          stablecoinAddress: {
            type: 'address',
            required: true
          }
        }
      }
    });

    // 批准赎回请求
    this.post('/:requestId/approve', RedemptionController.approveRedemption, {
      auth: true,
      permissions: ['operator'],
      validation: {
        params: {
          requestId: {
            type: 'string',
            required: true
          }
        },
        body: {
          stablecoinAmount: {
            type: 'string',
            required: true,
            format: 'hex'
          }
        }
      }
    });

    // 拒绝赎回请求
    this.post('/:requestId/reject', RedemptionController.rejectRedemption, {
      auth: true,
      permissions: ['operator'],
      validation: {
        params: {
          requestId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 完成赎回请求
    this.post('/:requestId/complete', RedemptionController.completeRedemption, {
      auth: true,
      permissions: ['operator'],
      validation: {
        params: {
          requestId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 添加支持的稳定币
    this.post('/stablecoin', RedemptionController.addSupportedStablecoin, {
      auth: true,
      permissions: ['operator'],
      validation: {
        body: {
          stablecoinAddress: {
            type: 'address',
            required: true
          }
        }
      }
    });

    // 移除支持的稳定币
    this.delete('/stablecoin', RedemptionController.removeSupportedStablecoin, {
      auth: true,
      permissions: ['operator'],
      validation: {
        body: {
          stablecoinAddress: {
            type: 'address',
            required: true
          }
        }
      }
    });

    // 紧急提款
    this.post('/withdraw', RedemptionController.emergencyWithdraw, {
      auth: true,
      permissions: ['admin'],
      validation: {
        body: {
          token: {
            type: 'address',
            required: true
          },
          to: {
            type: 'address',
            required: true
          },
          amount: {
            type: 'string',
            required: true,
            format: 'hex'
          }
        }
      }
    });
  }
}

// 创建路由实例
const redemptionRouter = new RedemptionRouter();

module.exports = redemptionRouter.getRouter(); 