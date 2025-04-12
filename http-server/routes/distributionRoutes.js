const express = require('express');
const merkleDistributionController = require('../controllers/MerkleDistributionController');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

/**
 * 分配相关的路由
 */

// 创建新分配
router.post(
  '/create',
  asyncHandler(merkleDistributionController.createDistribution.bind(merkleDistributionController))
);

// 获取分配信息
router.get(
  '/:id',
  asyncHandler(merkleDistributionController.getDistribution.bind(merkleDistributionController))
);

// 获取用户分配信息
router.get(
  '/:id/user/:address',
  asyncHandler(merkleDistributionController.getUserDistribution.bind(merkleDistributionController))
);

// 提取分配
router.post(
  '/:id/withdraw',
  asyncHandler(merkleDistributionController.withdrawDistribution.bind(merkleDistributionController))
);

// 更新分配状态
router.put(
  '/:id/status',
  asyncHandler(merkleDistributionController.updateDistributionStatus.bind(merkleDistributionController))
);

// 回收未领取资金
router.post(
  '/:id/recover',
  asyncHandler(merkleDistributionController.recoverUnclaimedFunds.bind(merkleDistributionController))
);

module.exports = router; 