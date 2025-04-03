/**
 * RealEstateSystem合约路由
 * 为RealEstateSystem合约的所有方法提供HTTP接口
 */
const express = require('express');
const RealEstateSystemController = require('../controllers/RealEstateSystem.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 获取合约地址
router.get('/address', apiKey, RealEstateSystemController.getContractAddress);

// 获取系统中所有合约地址
router.get('/getContractAddresses', apiKey, RealEstateSystemController.getContractAddresses);

// 获取系统统计数据
router.get('/getSystemStats', apiKey, RealEstateSystemController.getSystemStats);

// 更新系统中的合约地址
router.post('/updateContract', apiKey, RealEstateSystemController.updateContract);

// 其他RealEstateSystem方法的路由...

module.exports = router; 