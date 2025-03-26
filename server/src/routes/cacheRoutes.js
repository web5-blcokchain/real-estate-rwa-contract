/**
 * 缓存管理路由
 * 提供API缓存管理的访问端点
 */

const express = require('express');
const { caches, flushAll, getAllStats } = require('@server/utils/cacheManager');
const { createAPIError } = require('@server/middlewares/errorHandler');
const logger = require('@server/utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/cache/stats
 * @desc 获取缓存统计信息
 * @access Private - 仅限管理员访问
 */
router.get('/stats', (req, res, next) => {
  try {
    // 检查API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权访问缓存统计信息');
    }
    
    const stats = getAllStats();
    
    // 返回缓存统计信息
    res.json({
      success: true,
      data: {
        stats,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/cache/:namespace/stats
 * @desc 获取特定命名空间的缓存统计信息
 * @access Private - 仅限管理员访问
 */
router.get('/:namespace/stats', (req, res, next) => {
  try {
    // 检查API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权访问缓存统计信息');
    }
    
    const { namespace } = req.params;
    
    // 检查命名空间是否存在
    if (!caches[namespace]) {
      throw createAPIError.notFound(`未找到缓存命名空间：${namespace}`);
    }
    
    const stats = caches[namespace].getStats();
    
    // 返回命名空间缓存统计信息
    res.json({
      success: true,
      data: {
        namespace,
        stats,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/cache/:namespace/keys
 * @desc 获取特定命名空间的所有缓存键
 * @access Private - 仅限管理员访问
 */
router.get('/:namespace/keys', (req, res, next) => {
  try {
    // 检查API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权访问缓存键列表');
    }
    
    const { namespace } = req.params;
    
    // 检查命名空间是否存在
    if (!caches[namespace]) {
      throw createAPIError.notFound(`未找到缓存命名空间：${namespace}`);
    }
    
    const keys = caches[namespace].getKeys();
    
    // 返回命名空间缓存键
    res.json({
      success: true,
      data: {
        namespace,
        keysCount: keys.length,
        keys,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/cache/:namespace
 * @desc 清空特定命名空间的缓存
 * @access Private - 仅限管理员访问
 */
router.delete('/:namespace', (req, res, next) => {
  try {
    // 检查API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权清空缓存');
    }
    
    const { namespace } = req.params;
    
    // 检查命名空间是否存在
    if (!caches[namespace]) {
      throw createAPIError.notFound(`未找到缓存命名空间：${namespace}`);
    }
    
    const clearedCount = caches[namespace].clear();
    
    logger.info(`已清空命名空间 ${namespace} 的缓存，删除了 ${clearedCount} 个键`);
    
    // 返回清空结果
    res.json({
      success: true,
      message: `已清空命名空间 ${namespace} 的缓存`,
      data: {
        namespace,
        clearedCount,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/cache
 * @desc 清空所有缓存
 * @access Private - 仅限管理员访问
 */
router.delete('/', (req, res, next) => {
  try {
    // 检查API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权清空缓存');
    }
    
    flushAll();
    
    logger.info('已清空所有缓存');
    
    // 返回清空结果
    res.json({
      success: true,
      message: '已清空所有缓存',
      timestamp: Date.now()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 