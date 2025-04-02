/**
 * 验证工具函数
 * 提供请求参数验证功能
 */

/**
 * 验证请求参数
 * @param {Object} params - 请求参数对象
 * @param {Array} requiredFields - 必填字段数组
 * @param {Array} optionalFields - 可选字段数组
 * @returns {Object} 验证结果，包含isValid和errors字段
 */
exports.validateParams = (params, requiredFields = [], optionalFields = []) => {
  const errors = [];
  const validatedData = {};
  
  // 验证必填字段
  for (const field of requiredFields) {
    // 如果字段是数组，第一个元素是字段名，第二个元素是验证函数
    if (Array.isArray(field)) {
      const [fieldName, validator] = field;
      
      // 检查字段是否存在
      if (params[fieldName] === undefined || params[fieldName] === null) {
        errors.push(`${fieldName} 是必填项`);
        continue;
      }
      
      // 如果提供了验证函数，则执行验证
      if (typeof validator === 'function') {
        try {
          const validationResult = validator(params[fieldName]);
          if (validationResult !== true) {
            errors.push(validationResult || `${fieldName} 格式无效`);
            continue;
          }
        } catch (error) {
          errors.push(`${fieldName} 验证失败: ${error.message}`);
          continue;
        }
      }
      
      validatedData[fieldName] = params[fieldName];
    } else {
      // 简单字段验证，仅检查是否存在
      if (params[field] === undefined || params[field] === null) {
        errors.push(`${field} 是必填项`);
      } else {
        validatedData[field] = params[field];
      }
    }
  }
  
  // 处理可选字段
  for (const field of optionalFields) {
    if (Array.isArray(field)) {
      const [fieldName, validator] = field;
      
      // 如果可选字段存在，则执行验证
      if (params[fieldName] !== undefined && params[fieldName] !== null) {
        // 如果提供了验证函数，则执行验证
        if (typeof validator === 'function') {
          try {
            const validationResult = validator(params[fieldName]);
            if (validationResult !== true) {
              errors.push(validationResult || `${fieldName} 格式无效`);
              continue;
            }
          } catch (error) {
            errors.push(`${fieldName} 验证失败: ${error.message}`);
            continue;
          }
        }
        
        validatedData[fieldName] = params[fieldName];
      }
    } else if (params[field] !== undefined && params[field] !== null) {
      validatedData[field] = params[field];
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: validatedData
  };
};

/**
 * 常用验证器函数
 */
exports.validators = {
  /**
   * 验证字符串是否为有效的以太坊地址
   * @param {String} value - 待验证的地址
   * @returns {Boolean|String} 验证结果
   */
  isEthAddress: (value) => {
    if (typeof value !== 'string') return '地址格式必须为字符串';
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return '无效的以太坊地址格式';
    return true;
  },
  
  /**
   * 验证字符串是否为有效的交易哈希
   * @param {String} value - 待验证的交易哈希
   * @returns {Boolean|String} 验证结果
   */
  isTxHash: (value) => {
    if (typeof value !== 'string') return '交易哈希必须为字符串';
    if (!/^0x[a-fA-F0-9]{64}$/.test(value)) return '无效的交易哈希格式';
    return true;
  },
  
  /**
   * 验证值是否为正整数
   * @param {Number|String} value - 待验证的值
   * @returns {Boolean|String} 验证结果
   */
  isPositiveInteger: (value) => {
    const num = Number(value);
    if (isNaN(num)) return '必须为数字';
    if (!Number.isInteger(num)) return '必须为整数';
    if (num <= 0) return '必须为正数';
    return true;
  },
  
  /**
   * 验证字符串是否不为空
   * @param {String} value - 待验证的字符串
   * @returns {Boolean|String} 验证结果
   */
  isNonEmptyString: (value) => {
    if (typeof value !== 'string') return '必须为字符串';
    if (value.trim() === '') return '不能为空字符串';
    return true;
  },
  
  /**
   * 验证值是否为有效的日期
   * @param {String|Date} value - 待验证的日期
   * @returns {Boolean|String} 验证结果
   */
  isValidDate: (value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '无效的日期格式';
    return true;
  }
}; 