/**
 * 合约路由
 * 处理合约信息查询的API请求
 */

const express = require('express');
const router = express.Router();
const ContractInfoController = require('../controllers/ContractInfoController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// 获取所有合约地址
router.get('/', apiKeyAuth, ContractInfoController.getAllContractAddresses);

// 获取特定合约地址
router.get('/:name/address', apiKeyAuth, ContractInfoController.getContractAddress);

// 获取合约信息
router.get('/:name/info', apiKeyAuth, ContractInfoController.getContractInfo);

// 检查合约是否已部署
router.get('/:name/deployed', apiKeyAuth, ContractInfoController.isContractDeployed);

module.exports = router; 