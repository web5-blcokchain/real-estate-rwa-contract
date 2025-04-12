/**
 * 不动产路由模块
 * 处理所有与不动产相关的API路由
 */
const express = require('express');
const router = express.Router();
const { RealEstateFacadeController } = require('../controllers');
const { authMiddleware, roleMiddleware } = require('../middleware');

// 获取不动产信息 - 公开API
router.get('/property/:propertyId', RealEstateFacadeController.getPropertyInfo.bind(RealEstateFacadeController));

// 需要认证的API
router.use(authMiddleware);

// 注册新不动产 - 需要manager角色
router.post('/register-property', 
  roleMiddleware(['manager', 'admin']), 
  RealEstateFacadeController.registerProperty.bind(RealEstateFacadeController)
);

// 更新不动产状态 - 需要manager角色
router.put('/property-status',
  roleMiddleware(['manager', 'admin']),
  RealEstateFacadeController.updatePropertyStatus.bind(RealEstateFacadeController)
);

// 更新不动产估值 - 需要manager角色
router.put('/property-valuation',
  roleMiddleware(['manager', 'admin']),
  RealEstateFacadeController.updatePropertyValuation.bind(RealEstateFacadeController)
);

// 创建分红 - 需要manager角色
router.post('/create-distribution',
  roleMiddleware(['manager', 'admin']),
  RealEstateFacadeController.createDistribution.bind(RealEstateFacadeController)
);

// 创建售卖订单 - 需要普通用户权限
router.post('/create-sell-order',
  RealEstateFacadeController.createSellOrder.bind(RealEstateFacadeController)
);

// 创建购买订单 - 需要普通用户权限
router.post('/create-buy-order',
  RealEstateFacadeController.createBuyOrder.bind(RealEstateFacadeController)
);

// 提取分红 - 需要普通用户权限
router.post('/withdraw',
  RealEstateFacadeController.withdraw.bind(RealEstateFacadeController)
);

module.exports = router; 