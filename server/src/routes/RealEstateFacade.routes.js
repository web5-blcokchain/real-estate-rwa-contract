/**
 * RealEstateFacade合约路由
 * 为RealEstateFacade合约的所有方法提供HTTP接口
 */
const express = require('express');
const RealEstateFacadeController = require('../controllers/RealEstateFacade.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 获取合约地址
router.get('/address', apiKey, RealEstateFacadeController.getContractAddress);

// 创建房产并铸造代币
router.post('/createProperty', apiKey, RealEstateFacadeController.createProperty);

// 出售房产
router.post('/sellProperty', apiKey, RealEstateFacadeController.sellProperty);

// 购买房产
router.post('/buyProperty', apiKey, RealEstateFacadeController.buyProperty);

// 其他RealEstateFacade方法的路由...

module.exports = router; 