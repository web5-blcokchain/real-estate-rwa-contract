const express = require('express');
const router = express.Router();

// Core routes
const realEstateFacadeRoutes = require('./core/realEstateFacade.routes');
const propertyManagerRoutes = require('./core/propertyManager.routes');
const propertyTokenRoutes = require('./core/propertyToken.routes');
const tradingRoutes = require('./core/trading.routes');
const rewardRoutes = require('./core/reward.routes');
const roleRoutes = require('./core/role.routes');

// System routes
const systemRoutes = require('./system/system.routes');

// API前缀
const API_PREFIX = '/api';

// 注册路由 (RESTful风格)
router.use(`${API_PREFIX}/real-estate`, realEstateFacadeRoutes);
router.use(`${API_PREFIX}/properties`, propertyManagerRoutes);
router.use(`${API_PREFIX}/tokens`, propertyTokenRoutes);
router.use(`${API_PREFIX}/trading`, tradingRoutes);
router.use(`${API_PREFIX}/rewards`, rewardRoutes);
router.use(`${API_PREFIX}/roles`, roleRoutes);
router.use(`${API_PREFIX}/system`, systemRoutes);

module.exports = router; 