/**
 * PropertyToken合约路由
 * 为PropertyToken合约的所有方法提供HTTP接口
 */
const express = require('express');
const PropertyTokenController = require('../controllers/PropertyToken.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 获取合约地址
router.get('/address', apiKey, PropertyTokenController.getContractAddress);

// 获取代币名称
router.get('/name', apiKey, PropertyTokenController.name);

// 获取代币符号
router.get('/symbol', apiKey, PropertyTokenController.symbol);

// 查询余额
router.get('/balanceOf', apiKey, PropertyTokenController.balanceOf);

// 获取总供应量
router.get('/totalSupply', apiKey, PropertyTokenController.totalSupply);

// 转账
router.post('/transfer', apiKey, PropertyTokenController.transfer);

// 其他方法路由...
// 可以添加PropertyToken控制器中所有方法的路由

module.exports = router; 