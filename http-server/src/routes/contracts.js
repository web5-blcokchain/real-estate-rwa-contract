const express = require('express');
const router = express.Router();
const ContractController = require('../controllers/contractController');

// 系统状态检查
router.get('/SystemController/isActivated', ContractController.executeReadFunction);

// 获取所有合约
router.get('/', ContractController.getAllContracts);

// 获取合约信息
router.get('/:contractName', ContractController.getContractInfo);

// 获取合约函数列表
router.get('/:contractName/functions', ContractController.getContractFunctions);

// 执行合约的只读函数
router.get('/:contractName/:functionName', ContractController.executeReadFunction);

// 执行合约的写入函数
router.post('/:contractName/:functionName', ContractController.executeWriteFunction);

module.exports = router; 