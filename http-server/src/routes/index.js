/**
 * 主路由文件
 * 集成所有API子路由
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const systemRoutes = require('./systemRoutes');
const propertyRoutes = require('./propertyRoutes');
const tokenRoutes = require('./tokenRoutes');
const roleRoutes = require('./roleRoutes');
const feeRoutes = require('./feeRoutes');
const transactionRoutes = require('./transactionRoutes');
const contractRoutes = require('./contractRoutes');
const { notFoundHandler } = require('../middleware/errorHandler');

// API基础路径
const API_BASE_PATH = `/${config.api.prefix}`;
const API_V1_PATH = `${API_BASE_PATH}/${config.api.version}`;

// 重定向根路径到API状态页面
router.get('/', (req, res) => {
  res.redirect(`${API_BASE_PATH}/status`);
});

// 重定向API前缀路径到API状态页面
router.get(API_BASE_PATH, (req, res) => {
  res.redirect(`${API_BASE_PATH}/status`);
});

// 集成子路由
router.use(`${API_BASE_PATH}/status`, require('./statusRoutes'));
router.use(`${API_V1_PATH}/system`, systemRoutes);
router.use(`${API_V1_PATH}/properties`, propertyRoutes);
router.use(`${API_V1_PATH}/tokens`, tokenRoutes);
router.use(`${API_V1_PATH}/roles`, roleRoutes);
router.use(`${API_V1_PATH}/fees`, feeRoutes);
router.use(`${API_V1_PATH}/transactions`, transactionRoutes);
router.use(`${API_V1_PATH}/contracts`, contractRoutes);

// 处理404错误
router.use(notFoundHandler);

module.exports = router; 