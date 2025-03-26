/**
 * 性能指标路由
 * 提供API服务性能指标的访问端点
 */

const express = require('express');
const { getMetrics, resetMetrics } = require('@server/middlewares/performanceMonitor');
const { createAPIError } = require('@server/middlewares/errorHandler');
const logger = require('@server/utils/logger');

const router = express.Router();

/**
 * @route GET /api/v1/metrics
 * @desc 获取API性能指标
 * @access Private - 仅限管理员访问
 */
router.get('/', (req, res, next) => {
  try {
    // 检查API密钥（简单实现，生产环境应使用更安全的认证方式）
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权访问性能指标');
    }
    
    const metrics = getMetrics();
    
    // 返回性能指标数据
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/metrics/endpoint/:endpoint
 * @desc 获取特定端点的性能指标
 * @access Private - 仅限管理员访问
 */
router.get('/endpoint/:endpoint', (req, res, next) => {
  try {
    // 检查API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权访问性能指标');
    }
    
    const { endpoint } = req.params;
    const metrics = getMetrics();
    
    // 查找特定端点的性能数据
    const endpointMetrics = metrics.endpoints[endpoint];
    
    if (!endpointMetrics) {
      throw createAPIError.notFound(`找不到端点 ${endpoint} 的性能指标`);
    }
    
    // 返回端点性能指标
    res.json({
      success: true,
      data: {
        endpoint,
        metrics: endpointMetrics,
        averageResponseTime: endpointMetrics.totalTime / endpointMetrics.count
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/metrics/blockchain
 * @desc 获取区块链操作性能指标
 * @access Private - 仅限管理员访问
 */
router.get('/blockchain', (req, res, next) => {
  try {
    // 检查API密钥
    const apiKey = req.query.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权访问性能指标');
    }
    
    const metrics = getMetrics();
    
    // 返回区块链性能指标
    res.json({
      success: true,
      data: {
        blockchain: metrics.blockchain,
        timestamp: metrics.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/metrics/reset
 * @desc 重置性能指标
 * @access Private - 仅限管理员访问
 */
router.post('/reset', (req, res, next) => {
  try {
    // 检查API密钥
    const apiKey = req.body.api_key || req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      throw createAPIError.unauthorized('未授权重置性能指标');
    }
    
    // 重置性能指标
    resetMetrics();
    
    logger.info('性能指标已通过API请求重置');
    
    // 返回成功响应
    res.json({
      success: true,
      message: '性能指标已重置',
      timestamp: Date.now()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 