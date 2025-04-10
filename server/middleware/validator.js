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
   * 验证单个数值参数
   * @param {string} paramName - 参数名
   * @param {string} [location='body'] - 参数位置 (body, query, params)
   * @param {Object} [options] - 可选配置 {min, max, required}
   * @returns {Function} Express中间件
   */
  static validateNumber(paramName, location = 'body', options = {}) {
    return (req, res, next) => {
      const value = req[location][paramName];
      
      if (value === undefined) {
        if (options.required) {
          return ResponseUtils.sendError(res, `缺少必要数值参数: ${paramName}`, 400);
        }
        return next();
      }
      
      const numValue = Number(value);
      
      if (isNaN(numValue)) {
        return ResponseUtils.sendError(res, `参数必须为数值: ${paramName}`, 400);
      }
      
      if (options.min !== undefined && numValue < options.min) {
        return ResponseUtils.sendError(res, `参数值必须大于等于 ${options.min}: ${paramName}`, 400);
      }
      
      if (options.max !== undefined && numValue > options.max) {
        return ResponseUtils.sendError(res, `参数值必须小于等于 ${options.max}: ${paramName}`, 400);
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
   * 验证角色检查请求
   * @returns {Function} Express中间件
   */
  static validateRoleCheck() {
    return (req, res, next) => {
      const { role, account } = req.query;
      
      if (!role || !account) {
        return ResponseUtils.sendError(res, '缺少必要参数: role 或 account', 400);
      }
      
      if (!AddressUtils.isValid(account)) {
        return ResponseUtils.sendError(res, '无效的账户地址格式', 400);
      }
      
      next();
    };
  }

  /**
   * 验证角色授予请求
   * @returns {Function} Express中间件
   */
  static validateRoleGrant() {
    return (req, res, next) => {
      const { role, account } = req.body;
      
      if (!role || !account) {
        return ResponseUtils.sendError(res, '缺少必要参数: role 或 account', 400);
      }
      
      if (!AddressUtils.isValid(account)) {
        return ResponseUtils.sendError(res, '无效的账户地址格式', 400);
      }
      
      next();
    };
  }

  /**
   * 验证角色撤销请求
   * @returns {Function} Express中间件
   */
  static validateRoleRevoke() {
    return (req, res, next) => {
      const { role, account } = req.body;
      
      if (!role || !account) {
        return ResponseUtils.sendError(res, '缺少必要参数: role 或 account', 400);
      }
      
      if (!AddressUtils.isValid(account)) {
        return ResponseUtils.sendError(res, '无效的账户地址格式', 400);
      }
      
      next();
    };
  }

  /**
   * 验证房产状态更新请求
   * @returns {Function} Express中间件
   */
  static validatePropertyStatusUpdate() {
    return (req, res, next) => {
      const { propertyId, status } = req.body;
      
      if (!propertyId || status === undefined) {
        return ResponseUtils.sendError(res, '缺少必要参数: propertyId 或 status', 400);
      }
      
      if (!AddressUtils.isValid(propertyId)) {
        return ResponseUtils.sendError(res, '无效的房产ID格式', 400);
      }
      
      // 验证状态值是否在有效范围内
      const validStatuses = [0, 1, 2, 3, 4]; // NotRegistered, Pending, Approved, Rejected, Delisted
      if (!validStatuses.includes(Number(status))) {
        return ResponseUtils.sendError(res, '无效的房产状态值', 400);
      }
      
      next();
    };
  }

  /**
   * 验证交易执行请求
   * @returns {Function} Express中间件
   */
  static validateTradeExecution() {
    return (req, res, next) => {
      const { tokenAddress, from, to, amount } = req.body;
      
      if (!tokenAddress || !from || !to || !amount) {
        return ResponseUtils.sendError(res, '缺少必要参数: tokenAddress, from, to, amount', 400);
      }
      
      if (!AddressUtils.isValid(tokenAddress)) {
        return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
      }
      
      if (!AddressUtils.isValid(from)) {
        return ResponseUtils.sendError(res, '无效的发送方地址格式', 400);
      }
      
      if (!AddressUtils.isValid(to)) {
        return ResponseUtils.sendError(res, '无效的接收方地址格式', 400);
      }
      
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return ResponseUtils.sendError(res, '无效的交易金额', 400);
      }
      
      next();
    };
  }

  /**
   * 验证分配创建请求
   * @returns {Function} Express中间件
   */
  static validateDistributionCreation() {
    return (req, res, next) => {
      const { propertyId, amount, recipients } = req.body;
      
      if (!propertyId || !amount || !recipients) {
        return ResponseUtils.sendError(res, '缺少必要参数: propertyId, amount, recipients', 400);
      }
      
      if (!AddressUtils.isValid(propertyId)) {
        return ResponseUtils.sendError(res, '无效的房产ID格式', 400);
      }
      
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return ResponseUtils.sendError(res, '无效的分配金额', 400);
      }
      
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return ResponseUtils.sendError(res, '无效的接收者列表', 400);
      }
      
      for (const recipient of recipients) {
        if (!AddressUtils.isValid(recipient)) {
          return ResponseUtils.sendError(res, '接收者列表中包含无效的地址格式', 400);
        }
      }
      
      next();
    };
  }

  /**
   * 验证奖励分配请求
   * @returns {Function} Express中间件
   */
  static validateRewardDistribution() {
    return (req, res, next) => {
      const { propertyId, amount } = req.body;
      
      if (!propertyId || !amount) {
        return ResponseUtils.sendError(res, '缺少必要参数: propertyId, amount', 400);
      }
      
      if (!AddressUtils.isValid(propertyId)) {
        return ResponseUtils.sendError(res, '无效的房产ID格式', 400);
      }
      
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return ResponseUtils.sendError(res, '无效的奖励金额', 400);
      }
      
      next();
    };
  }

  /**
   * 验证奖励领取请求
   * @returns {Function} Express中间件
   */
  static validateRewardClaim() {
    return (req, res, next) => {
      const { propertyId } = req.body;
      
      if (!propertyId) {
        return ResponseUtils.sendError(res, '缺少必要参数: propertyId', 400);
      }
      
      if (!AddressUtils.isValid(propertyId)) {
        return ResponseUtils.sendError(res, '无效的房产ID格式', 400);
      }
      
      next();
    };
  }

  /**
   * 验证订单创建参数
   * @returns {Function} Express中间件
   */
  static validateOrderCreation() {
    return (req, res, next) => {
      const { token, amount, price, propertyId } = req.body;
      
      // 验证必需参数
      if (!token || !amount || !price || !propertyId) {
        return ResponseUtils.sendError(res, '缺少必要参数: token, amount, price, propertyId', 400);
      }
      
      // 验证地址格式
      if (!AddressUtils.isValid(token)) {
        return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
      }
      
      // 验证数值参数
      if (isNaN(amount) || amount <= 0) {
        return ResponseUtils.sendError(res, '无效的金额', 400);
      }
      
      if (isNaN(price) || price <= 0) {
        return ResponseUtils.sendError(res, '无效的价格', 400);
      }
      
      next();
    };
  }

  /**
   * 验证手续费率
   * @returns {Function} Express中间件
   */
  static validateFeeRate() {
    return (req, res, next) => {
      const { feeRate } = req.body;
      
      if (feeRate === undefined || feeRate === null) {
        return ResponseUtils.sendError(res, '缺少必要参数: feeRate', 400);
      }
      
      const feeRateNum = Number(feeRate);
      if (isNaN(feeRateNum) || feeRateNum < 0 || feeRateNum > 10000) {
        return ResponseUtils.sendError(res, '无效的手续费率，必须在0-10000之间', 400);
      }
      
      next();
    };
  }

  /**
   * 验证最小交易金额
   * @returns {Function} Express中间件
   */
  static validateMinTradeAmount() {
    return (req, res, next) => {
      const { minTradeAmount } = req.body;
      
      if (minTradeAmount === undefined || minTradeAmount === null) {
        return ResponseUtils.sendError(res, '缺少必要参数: minTradeAmount', 400);
      }
      
      const amountNum = Number(minTradeAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return ResponseUtils.sendError(res, '无效的最小交易金额', 400);
      }
      
      next();
    };
  }

  /**
   * 验证紧急提现参数
   * @returns {Function} Express中间件
   */
  static validateEmergencyWithdrawal() {
    return (req, res, next) => {
      const { token, amount } = req.body;
      
      if (!token || !amount) {
        return ResponseUtils.sendError(res, '缺少必要参数: token, amount', 400);
      }
      
      if (!AddressUtils.isValid(token)) {
        return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
      }
      
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return ResponseUtils.sendError(res, '无效的提现金额', 400);
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