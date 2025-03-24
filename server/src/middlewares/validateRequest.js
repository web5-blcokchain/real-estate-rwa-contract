const { ApiError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * 创建请求验证中间件
 * 使用Joi架构验证请求参数
 *
 * @param {Object} schema - Joi验证架构对象
 * @return {Function} Express中间件函数
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    // 合并来自不同位置的参数
    const dataToValidate = {};
    
    if (schema.body) {
      dataToValidate.body = req.body;
    }
    
    if (schema.query) {
      dataToValidate.query = req.query;
    }
    
    if (schema.params) {
      dataToValidate.params = req.params;
    }

    const options = {
      abortEarly: false, // 同时报告所有错误
      allowUnknown: true, // 允许未知字段
      stripUnknown: true // 自动删除未知字段
    };

    try {
      // 验证请求数据
      const { value, error } = schema.validate(dataToValidate, options);
      
      if (error) {
        const errorDetails = error.details.map(detail => ({
          message: detail.message,
          path: detail.path,
          type: detail.type
        }));
        
        logger.warn(`Validation error: ${JSON.stringify(errorDetails)}`);
        
        throw ApiError.badRequest('Validation Failed', 'VALIDATION_ERROR', { details: errorDetails });
      }

      // 将验证后的值替换回请求对象
      if (value.body) {
        req.body = value.body;
      }
      
      if (value.query) {
        req.query = value.query;
      }
      
      if (value.params) {
        req.params = value.params;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = validateRequest; 