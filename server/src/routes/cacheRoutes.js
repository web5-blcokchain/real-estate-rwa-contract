/**
 * 缓存管理路由
 * 提供API缓存控制功能
 */

const express = require('express');
const router = express.Router();
const { checkAuthentication, checkAuthorization } = require('../middlewares/auth');
const { getCacheStats, clearCache, getCacheKeys } = require('../utils/cacheManager');

/**
 * @route GET /cache/stats
 * @desc 获取缓存统计信息
 * @access 需要管理员权限
 */
router.get('/stats',
  checkAuthentication,
  checkAuthorization(['ADMIN', 'OPERATOR']),
  (req, res) => {
    try {
      const stats = getCacheStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '获取缓存统计信息失败'
      });
    }
  }
);

/**
 * @route GET /cache/keys
 * @desc 获取所有缓存键
 * @access 需要管理员权限
 */
router.get('/keys',
  checkAuthentication,
  checkAuthorization(['ADMIN', 'OPERATOR']),
  (req, res) => {
    try {
      const keys = getCacheKeys();
      res.json({
        success: true,
        data: {
          count: keys.length,
          keys
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '获取缓存键失败'
      });
    }
  }
);

/**
 * @route POST /cache/clear
 * @desc 清除全部缓存
 * @access 仅限管理员
 */
router.post('/clear',
  checkAuthentication,
  checkAuthorization(['ADMIN']),
  (req, res) => {
    try {
      clearCache();
      res.json({
        success: true,
        message: '缓存已清除'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '清除缓存失败'
      });
    }
  }
);

/**
 * @route POST /cache/clear/:key
 * @desc 清除特定键的缓存
 * @access 仅限管理员
 */
router.post('/clear/:key',
  checkAuthentication,
  checkAuthorization(['ADMIN']),
  (req, res) => {
    try {
      const { key } = req.params;
      const result = clearCache(key);
      
      if (result) {
        res.json({
          success: true,
          message: `缓存键 ${key} 已清除`
        });
      } else {
        res.status(404).json({
          success: false,
          error: `缓存键 ${key} 不存在`
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '清除指定缓存失败'
      });
    }
  }
);

module.exports = router; 