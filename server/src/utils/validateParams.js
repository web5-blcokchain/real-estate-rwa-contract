/**
 * 参数验证工具
 */
const { Validation, ValidationError } = require('../lib/shared');

/**
 * 验证请求参数
 * @param {Object} params - 要验证的参数对象
 * @param {Object} schema - 验证模式
 * @throws {ValidationError} 验证失败时抛出错误
 */
function validateParams(params, schema) {
  if (!params || !schema) {
    throw new ValidationError('参数或模式不能为空');
  }

  for (const [field, rule] of Object.entries(schema)) {
    const value = params[field];
    
    // 检查必填字段
    if (rule.required && (value === undefined || value === null || value === '')) {
      throw new ValidationError(`${field} 不能为空`);
    }
    
    // 如果字段不存在且非必填，则跳过其他验证
    if (value === undefined || value === null) {
      continue;
    }
    
    // 根据类型验证
    switch (rule.type) {
      case 'string':
        Validation.validate(
          typeof value === 'string',
          `${field} 必须是字符串`
        );
        
        // 验证字符串长度
        if (rule.minLength !== undefined) {
          Validation.validate(
            value.length >= rule.minLength,
            `${field} 长度不能小于 ${rule.minLength}`
          );
        }
        
        if (rule.maxLength !== undefined) {
          Validation.validate(
            value.length <= rule.maxLength,
            `${field} 长度不能大于 ${rule.maxLength}`
          );
        }
        
        // 验证格式
        if (rule.format === 'address') {
          Validation.validate(
            Validation.isValidAddress(value),
            `${field} 不是有效的地址格式`
          );
        } else if (rule.format === 'txHash') {
          Validation.validate(
            Validation.isValidTxHash(value),
            `${field} 不是有效的交易哈希格式`
          );
        } else if (rule.format === 'privateKey') {
          Validation.validate(
            Validation.isValidPrivateKey(value),
            `${field} 不是有效的私钥格式`
          );
        }
        break;
        
      case 'number':
        Validation.validate(
          typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value))),
          `${field} 必须是数字`
        );
        
        const numValue = Number(value);
        
        // 验证范围
        if (rule.min !== undefined) {
          Validation.validate(
            numValue >= rule.min,
            `${field} 不能小于 ${rule.min}`
          );
        }
        
        if (rule.max !== undefined) {
          Validation.validate(
            numValue <= rule.max,
            `${field} 不能大于 ${rule.max}`
          );
        }
        break;
        
      case 'boolean':
        Validation.validate(
          typeof value === 'boolean' || value === 'true' || value === 'false',
          `${field} 必须是布尔值`
        );
        break;
        
      case 'array':
        Validation.validate(
          Array.isArray(value),
          `${field} 必须是数组`
        );
        
        // 验证数组长度
        if (rule.minItems !== undefined) {
          Validation.validate(
            value.length >= rule.minItems,
            `${field} 数组长度不能小于 ${rule.minItems}`
          );
        }
        
        if (rule.maxItems !== undefined) {
          Validation.validate(
            value.length <= rule.maxItems,
            `${field} 数组长度不能大于 ${rule.maxItems}`
          );
        }
        break;
        
      case 'object':
        Validation.validate(
          typeof value === 'object' && value !== null && !Array.isArray(value),
          `${field} 必须是对象`
        );
        break;
    }
    
    // 自定义验证函数
    if (rule.validate && typeof rule.validate === 'function') {
      try {
        rule.validate(value);
      } catch (error) {
        throw new ValidationError(`${field} 验证失败: ${error.message}`);
      }
    }
  }
}

module.exports = validateParams; 