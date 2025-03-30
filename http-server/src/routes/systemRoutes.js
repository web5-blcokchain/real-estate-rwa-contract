/**
 * 系统路由
 * 处理RealEstateSystem合约的API请求
 */

const express = require('express');
const router = express.Router();
const RealEstateSystemController = require('../controllers/RealEstateSystemController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// 获取系统状态
router.get('/status', apiKeyAuth, RealEstateSystemController.getSystemStatus);

// 暂停系统
router.post('/pause', apiKeyAuth, RealEstateSystemController.pauseSystem);

// 恢复系统
router.post('/unpause', apiKeyAuth, RealEstateSystemController.unpauseSystem);

// 获取系统链接的合约地址
router.get('/linked-contracts', apiKeyAuth, RealEstateSystemController.getLinkedContracts);

module.exports = router; 