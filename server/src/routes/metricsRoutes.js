/**
 * 性能指标路由
 * 提供API性能监控数据的访问
 */

const express = require('express');
const router = express.Router();
const { getPerformanceMetrics, resetPerformanceMetrics } = require('../middlewares/performanceMonitor');
const { checkAuthentication, checkAuthorization } = require('../middlewares/auth');

/**
 * @route GET /metrics
 * @desc 获取性能指标
 * @access 需要管理员权限
 */
router.get('/', 
  checkAuthentication,
  checkAuthorization(['ADMIN', 'OPERATOR']),
  (req, res) => {
    try {
      const metrics = getPerformanceMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '获取性能指标失败'
      });
    }
  }
);

/**
 * @route POST /metrics/reset
 * @desc 重置性能指标
 * @access 仅限管理员
 */
router.post('/reset',
  checkAuthentication,
  checkAuthorization(['ADMIN']),
  (req, res) => {
    try {
      const result = resetPerformanceMetrics();
      res.json({
        success: true,
        message: '性能指标已重置'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '重置性能指标失败'
      });
    }
  }
);

module.exports = router; 