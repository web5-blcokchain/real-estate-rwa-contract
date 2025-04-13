/**
 * 奖励管理路由模块
 * 处理所有与分配、分红和奖励相关的API路由
 */
const express = require('express');
const router = express.Router();
const { RewardManagerController } = require('../controllers');
const { authMiddleware, roleMiddleware } = require('../middleware');

// 获取所有分配ID - 公开API，无需验证
router.get('/distributions', RewardManagerController.getAllDistributions.bind(RewardManagerController));

// 获取分配详情 - 公开API，无需验证
router.get('/distribution/:distributionId', RewardManagerController.getDistributionDetails.bind(RewardManagerController));

// 获取用户分配信息 - 公开API，无需验证
router.get('/distribution/:id/user/:address', RewardManagerController.getUserDistribution.bind(RewardManagerController));

// 创建分配 - 需要manager角色
router.post('/create-distribution', 
  roleMiddleware(['manager', 'admin']), 
  RewardManagerController.createDistribution.bind(RewardManagerController)
);

// 更新默克尔根 - 需要manager角色
router.post('/update-merkle-root',
  roleMiddleware(['manager', 'admin']),
  RewardManagerController.updateMerkleRoot.bind(RewardManagerController)
);

// 更新分配状态 - 需要manager角色
router.put('/distribution/:id/status',
  roleMiddleware(['manager', 'admin']),
  RewardManagerController.updateDistributionStatus.bind(RewardManagerController)
);

// 使用默克尔证明提取分红 - 需要普通用户权限
router.post('/distribution/:id/withdraw',
  RewardManagerController.withdrawMerkleDistribution.bind(RewardManagerController)
);

// 回收未领取的资金 - 需要admin角色
router.post('/distribution/:id/recover',
  roleMiddleware(['admin']),
  RewardManagerController.recoverUnclaimedFunds.bind(RewardManagerController)
);

module.exports = router; 