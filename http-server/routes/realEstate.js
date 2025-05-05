/**
 * 不动产路由模块
 * 处理所有与不动产相关的API路由
 */
const express = require('express');
const router = express.Router();
const { RealEstateFacadeController } = require('../controllers');
const { authMiddleware, roleMiddleware } = require('../middleware');

// 获取不动产信息 - 公开API，无需验证
router.get('/property/:propertyId', RealEstateFacadeController.getPropertyInfo.bind(RealEstateFacadeController));

// 获取用户代币余额 - 公开API，无需验证
router.get('/token-balance/:propertyId/:userAddress', RealEstateFacadeController.getUserTokenBalance.bind(RealEstateFacadeController));

// 以下API无需额外认证中间件，因为已在app.js中全局应用了AuthMiddleware.validateApiKey
// router.use(authMiddleware);

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

// 创建售卖订单 - 需要普通用户权限
router.post('/create-sell-order',
  RealEstateFacadeController.createSellOrder.bind(RealEstateFacadeController)
);

// 创建购买订单 - 需要普通用户权限
router.post('/create-buy-order',
  RealEstateFacadeController.createBuyOrder.bind(RealEstateFacadeController)
);

// 注释: 分红提取相关功能已移至reward路由模块
// 请使用 /api/reward/distribution/:id/withdraw 端点

// 代币授权
router.post('/token-approve', authMiddleware, RealEstateFacadeController.approveToken.bind(RealEstateFacadeController));

// 查询代币授权额度
router.get('/token-allowance/:propertyId/:owner/:spender', RealEstateFacadeController.getTokenAllowance.bind(RealEstateFacadeController));

module.exports = router; 