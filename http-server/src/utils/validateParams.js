/**
 * 参数验证工具
 * 批量验证请求参数
 */
const validators = require('./validators');

/**
 * 批量验证参数
 * @param {Object} params - 要验证的参数对象
 * @param {Array} validations - 验证规则数组
 * @returns {Object} 验证结果对象
 * 
 * @example
 * // 使用示例
 * const validation = validateParams(
 *   { address: '0x123...', amount: '100' },
 *   [
 *     ['address', validators.isEthAddress],
 *     ['amount', validators.isPositiveInteger]
 *   ]
 * );
 * 
 * if (!validation.isValid) {
 *   console.error(validation.errors);
 * }
 */
function validateParams(params = {}, validations = []) {
  const errors = {};
  const validData = {};
  
  // 遍历所有验证规则
  for (const validation of validations) {
    const [fieldName, validatorFn, errorMsg] = validation;
    const value = params[fieldName];
    
    // 跳过非必填且未提供的字段
    if (value === undefined || value === null) {
      errors[fieldName] = errorMsg || `${fieldName} 是必填项`;
      continue;
    }
    
    // 执行验证
    const isValid = typeof validatorFn === 'function' 
      ? validatorFn(value)
      : true;
      
    if (!isValid) {
      errors[fieldName] = errorMsg || `${fieldName} 格式无效`;
    } else {
      validData[fieldName] = value;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    validData
  };
}

module.exports = validateParams; 