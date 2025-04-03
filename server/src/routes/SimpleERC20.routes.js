/**
 * SimpleERC20合约路由
 * 为SimpleERC20合约的所有方法提供HTTP接口
 */
const express = require('express');
const SimpleERC20Controller = require('../controllers/SimpleERC20.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 获取合约地址
router.get('/address', apiKey, SimpleERC20Controller.getContractAddress);

// 查询授权额度
router.get('/allowance', apiKey, SimpleERC20Controller.allowance);

// 授权代币
router.post('/approve', apiKey, SimpleERC20Controller.approve);

// 查询余额
router.get('/balanceOf', apiKey, SimpleERC20Controller.balanceOf);

// 其他方法路由...
// 可以添加SimpleERC20控制器中所有方法的路由

module.exports = router; 