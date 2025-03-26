const BaseRouter = require('../../../shared/routes/baseRouter');
const RentController = require('../controllers/rentController');
const { ethers } = require('ethers');

/**
 * 租金路由类
 */
class RentRouter extends BaseRouter {
  constructor() {
    super();
    this.setupRoutes();
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 获取所有租金分配记录
    this.get('/', RentController.getAllDistributions);

    // 获取特定租金分配记录详情
    this.get('/:distributionId', RentController.getRentDistribution, {
      validation: {
        params: {
          distributionId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 按属性ID获取租金分配记录
    this.get('/property/:propertyId', RentController.getDistributionsByPropertyId, {
      validation: {
        params: {
          propertyId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 按代币地址获取租金分配记录
    this.get('/token/:tokenAddress', RentController.getDistributionsByToken, {
      validation: {
        params: {
          tokenAddress: {
            type: 'address',
            required: true
          }
        }
      }
    });

    // 获取可领取的租金
    this.get('/:distributionId/claimable/:account', RentController.getClaimableRent, {
      validation: {
        params: {
          distributionId: {
            type: 'string',
            required: true
          },
          account: {
            type: 'address',
            required: true
          }
        }
      }
    });

    // 分配租金
    this.post('/', RentController.distributeRent, {
      auth: true,
      permissions: ['operator'],
      validation: {
        body: {
          tokenAddress: {
            type: 'address',
            required: true
          },
          amount: {
            type: 'string',
            required: true,
            format: 'hex'
          },
          propertyId: {
            type: 'string',
            required: true
          },
          rentPeriodStart: {
            type: 'date',
            required: true
          },
          rentPeriodEnd: {
            type: 'date',
            required: true
          },
          description: {
            type: 'string',
            required: false
          }
        }
      }
    });

    // 清算未领取的租金
    this.post('/:distributionId/liquidate', RentController.liquidateUnclaimedRent, {
      auth: true,
      permissions: ['operator'],
      validation: {
        params: {
          distributionId: {
            type: 'string',
            required: true
          }
        }
      }
    });
  }
}

// 创建路由实例
const rentRouter = new RentRouter();

module.exports = rentRouter.getRouter(); 