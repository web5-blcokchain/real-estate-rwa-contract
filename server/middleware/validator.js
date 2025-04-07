const { AddressUtils, Logger } = require('../../common');
const { ResponseUtils } = require('../utils');

/**
 * 验证工具中间件
 */
class ValidatorMiddleware {
  /**
   * 验证合约地址
   * @param {string} paramName - 参数名
   * @param {string} [location='body'] - 参数位置 (body, query, params)
   * @returns {Function} Express中间件
   */
  static validateContractAddress(paramName = 'contractAddress', location = 'body') {
    return (req, res, next) => {
      const value = req[location][paramName];
      
      if (!value) {
        return ResponseUtils.sendError(res, `缺少参数: ${paramName}`, 400);
      }
      
      if (!AddressUtils.isValid(value)) {
        return ResponseUtils.sendError(res, `无效的合约地址格式: ${paramName}`, 400);
      }
      
      next();
    };
  }

  /**
   * 验证以太坊地址
   * @param {string} paramName - 参数名
   * @param {string} [location='body'] - 参数位置 (body, query, params)
   * @returns {Function} Express中间件
   */
  static validateAddress(paramName = 'address', location = 'body') {
    return (req, res, next) => {
      const value = req[location][paramName];
      
      if (!value) {
        return ResponseUtils.sendError(res, `缺少参数: ${paramName}`, 400);
      }
      
      if (!AddressUtils.isValid(value)) {
        return ResponseUtils.sendError(res, `无效的地址格式: ${paramName}`, 400);
      }
      
      next();
    };
  }

  /**
   * 验证多个地址数组
   * @param {string} paramName - 参数名
   * @param {string} [location='body'] - 参数位置 (body, query, params)
   * @returns {Function} Express中间件
   */
  static validateAddresses(paramName = 'addresses', location = 'body') {
    return (req, res, next) => {
      const values = req[location][paramName];
      
      if (!values || !Array.isArray(values) || values.length === 0) {
        return ResponseUtils.sendError(res, `缺少有效的地址数组: ${paramName}`, 400);
      }
      
      for (const address of values) {
        if (!AddressUtils.isValid(address)) {
          return ResponseUtils.sendError(res, `数组中包含无效的地址格式: ${address}`, 400);
        }
      }
      
      next();
    };
  }

  /**
   * 验证必需参数
   * @param {Array<string>} params - 参数名数组
   * @param {string} [location='body'] - 参数位置 (body, query, params)
   * @returns {Function} Express中间件
   */
  static validateRequired(params = [], location = 'body') {
    return (req, res, next) => {
      for (const param of params) {
        const value = req[location][param];
        if (value === undefined || value === null || value === '') {
          return ResponseUtils.sendError(res, `缺少必要参数: ${param}`, 400);
        }
      }
      
      next();
    };
  }

  /**
   * 验证数值参数
   * @param {Object} params - 参数配置 {paramName: {min, max}}
   * @param {string} [location='body'] - 参数位置 (body, query, params)
   * @returns {Function} Express中间件
   */
  static validateNumbers(params = {}, location = 'body') {
    return (req, res, next) => {
      for (const [param, config] of Object.entries(params)) {
        const value = req[location][param];
        
        if (value === undefined) {
          if (config.required) {
            return ResponseUtils.sendError(res, `缺少必要数值参数: ${param}`, 400);
          }
          continue;
        }
        
        const numValue = Number(value);
        
        if (isNaN(numValue)) {
          return ResponseUtils.sendError(res, `参数必须为数值: ${param}`, 400);
        }
        
        if (config.min !== undefined && numValue < config.min) {
          return ResponseUtils.sendError(res, `参数值必须大于等于 ${config.min}: ${param}`, 400);
        }
        
        if (config.max !== undefined && numValue > config.max) {
          return ResponseUtils.sendError(res, `参数值必须小于等于 ${config.max}: ${param}`, 400);
        }
      }
      
      next();
    };
  }

  /**
   * 角色相关请求验证
   * @returns {Function} Express中间件
   */
  static validateRoleRequest() {
    return (req, res, next) => {
      const { contractAddress, address, role } = req.body;
      
      if (!contractAddress || !address || !role) {
        return ResponseUtils.sendError(res, '缺少必要参数: contractAddress, address, role', 400);
      }

      if (!AddressUtils.isValid(address)) {
        return ResponseUtils.sendError(res, '无效的地址格式', 400);
      }
      
      if (!AddressUtils.isValid(contractAddress)) {
        return ResponseUtils.sendError(res, '无效的合约地址格式', 400);
      }
      
      next();
    };
  }

  /**
   * 角色查询验证
   * @returns {Function} Express中间件
   */
  static validateRoleQuery() {
    return (req, res, next) => {
      const { contractAddress } = req.query;
      const { role } = req.params;
      
      if (!contractAddress || !role) {
        return ResponseUtils.sendError(res, '缺少必要参数: contractAddress, role', 400);
      }

      if (!AddressUtils.isValid(contractAddress)) {
        return ResponseUtils.sendError(res, '无效的合约地址格式', 400);
      }
      
      next();
    };
  }
  
  /**
   * 角色成员查询验证
   * @returns {Function} Express中间件
   */
  static validateRoleMemberQuery() {
    return (req, res, next) => {
      const { contractAddress } = req.query;
      const { role, index } = req.params;
      
      if (!contractAddress || !role || index === undefined) {
        return ResponseUtils.sendError(res, '缺少必要参数: contractAddress, role, index', 400);
      }

      if (!AddressUtils.isValid(contractAddress)) {
        return ResponseUtils.sendError(res, '无效的合约地址格式', 400);
      }
      
      const indexNum = Number(index);
      if (isNaN(indexNum) || indexNum < 0) {
        return ResponseUtils.sendError(res, '无效的索引值，必须为非负整数', 400);
      }
      
      next();
    };
  }

  /**
   * 通用验证中间件组合
   * @param {Object} schema - 验证模式
   * @returns {Function} Express中间件
   */
  static validate(schema) {
    return (req, res, next) => {
      try {
        // 中间件链，可以组合多个验证
        const middlewares = [];
        
        // 处理必需参数
        if (schema.required && schema.required.length > 0) {
          middlewares.push(ValidatorMiddleware.validateRequired(schema.required, schema.location || 'body'));
        }
        
        // 处理地址验证
        if (schema.addresses && schema.addresses.length > 0) {
          for (const param of schema.addresses) {
            middlewares.push(ValidatorMiddleware.validateAddress(param, schema.location || 'body'));
          }
        }
        
        // 处理数值验证
        if (schema.numbers && Object.keys(schema.numbers).length > 0) {
          middlewares.push(ValidatorMiddleware.validateNumbers(schema.numbers, schema.location || 'body'));
        }
        
        // 执行所有中间件
        let idx = 0;
        const next1 = (err) => {
          if (err) return next(err);
          if (idx >= middlewares.length) return next();
          middlewares[idx++](req, res, next1);
        };
        
        next1();
      } catch (error) {
        Logger.error('验证失败', { error, schema });
        ResponseUtils.sendError(res, '请求验证失败', 400, { message: error.message });
      }
    };
  }
}

module.exports = ValidatorMiddleware; 