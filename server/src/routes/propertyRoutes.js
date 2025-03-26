const BaseRouter = require('../../shared/routes/baseRouter');
const PropertyController = require('../controllers/propertyController');
const { ethers } = require('ethers');

/**
 * 房产路由类
 */
class PropertyRouter extends BaseRouter {
  constructor() {
    super();
    this.setupRoutes();
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 获取所有房产
    this.get('/', PropertyController.getAllProperties);

    // 获取特定房产详情
    this.get('/:propertyId', PropertyController.getProperty, {
      validation: {
        params: {
          propertyId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 注册新房产
    this.post('/', PropertyController.registerProperty, {
      auth: true,
      permissions: ['operator'],
      validation: {
        body: {
          propertyId: {
            type: 'string',
            required: true
          },
          country: {
            type: 'string',
            required: true
          },
          metadataURI: {
            type: 'string',
            required: true,
            format: 'url'
          }
        }
      }
    });

    // 批准房产
    this.post('/:propertyId/approve', PropertyController.approveProperty, {
      auth: true,
      permissions: ['operator'],
      validation: {
        params: {
          propertyId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 拒绝房产
    this.post('/:propertyId/reject', PropertyController.rejectProperty, {
      auth: true,
      permissions: ['operator'],
      validation: {
        params: {
          propertyId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 下架房产
    this.post('/:propertyId/delist', PropertyController.delistProperty, {
      auth: true,
      permissions: ['operator'],
      validation: {
        params: {
          propertyId: {
            type: 'string',
            required: true
          }
        }
      }
    });

    // 设置房产状态
    this.put('/:propertyId/status', PropertyController.setPropertyStatus, {
      auth: true,
      permissions: ['operator'],
      validation: {
        params: {
          propertyId: {
            type: 'string',
            required: true
          }
        },
        body: {
          status: {
            type: 'number',
            required: true,
            enum: [0, 1, 2, 3] // 0=Pending, 1=Approved, 2=Rejected, 3=Delisted
          }
        }
      }
    });
  }
}

// 创建路由实例
const propertyRouter = new PropertyRouter();

module.exports = propertyRouter.getRouter(); 