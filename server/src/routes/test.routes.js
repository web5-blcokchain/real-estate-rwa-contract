/**
 * 测试路由
 */
const express = require('express');
const testController = require('../controllers/swagger-test.controller');
const { apiKey } = require('../middlewares');

const router = express.Router();

// 测试API端点
router.get('/', apiKey, testController.testEndpoint);

module.exports = router; 