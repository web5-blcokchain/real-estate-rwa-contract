/**
 * 合约API路由
 */

const express = require('express');
const ContractController = require('../controllers/contractController');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/v1/contracts
 * @desc    获取所有合约信息
 * @access  Private
 */
router.get('/', ContractController.getAllContracts);

/**
 * @route   GET /api/v1/contracts/:contractName
 * @desc    获取特定合约信息
 * @access  Private
 */
router.get('/:contractName', ContractController.getContractInfo);

/**
 * @route   GET /api/v1/contracts/:contractName/functions
 * @desc    获取合约函数列表
 * @access  Private
 */
router.get('/:contractName/functions', ContractController.getContractFunctions);

/**
 * @route   GET /api/v1/contracts/:contractName/:functionName
 * @desc    执行合约的只读函数
 * @access  Private
 */
router.get('/:contractName/:functionName', ContractController.executeReadFunction);

/**
 * @route   POST /api/v1/contracts/:contractName/:functionName
 * @desc    执行合约的写入函数
 * @access  Private
 */
router.post('/:contractName/:functionName', ContractController.executeWriteFunction);

module.exports = router; 