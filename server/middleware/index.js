/**
 * 中间件模块入口
 * 集中导出所有中间件，方便引用
 */

// 速率限制中间件
const RateLimitMiddleware = require('./rate-limit');

// 验证中间件
const ValidatorMiddleware = require('./validator');

// 导出所有中间件
module.exports = {
  // 速率限制相关
  RateLimitMiddleware,
  apiRateLimit: RateLimitMiddleware.apiLimit,
  strictRateLimit: RateLimitMiddleware.strictLimit,
  
  // 验证相关
  ValidatorMiddleware,
  validateContractAddress: ValidatorMiddleware.validateContractAddress,
  validateAddress: ValidatorMiddleware.validateAddress,
  validateAddresses: ValidatorMiddleware.validateAddresses,
  validateRequired: ValidatorMiddleware.validateRequired,
  validateNumbers: ValidatorMiddleware.validateNumbers,
  validate: ValidatorMiddleware.validate
}; 