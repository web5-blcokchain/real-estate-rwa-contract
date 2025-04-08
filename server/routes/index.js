const express = require('express');
const router = express.Router();

// Core routes
const realEstateFacadeRoutes = require('./core/realEstateFacade.routes');
const propertyManagerRoutes = require('./core/propertyManager.routes');
const roleRoutes = require('./core/role.routes');

// System routes
const systemRoutes = require('./system/system.routes');

// API前缀
const API_PREFIX = '/api/v1/core';

// 注册路由 (RESTful风格)
router.use(`${API_PREFIX}/real-estate-facade`, realEstateFacadeRoutes);
router.use(`${API_PREFIX}/property-manager`, propertyManagerRoutes);
router.use(`${API_PREFIX}/roles`, roleRoutes);
router.use(`/api/system`, systemRoutes);

module.exports = router; 