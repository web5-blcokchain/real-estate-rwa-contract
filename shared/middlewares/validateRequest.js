const { ApiError } = require('../utils/errors');
const { ethers } = require('ethers');

/**
 * 请求验证中间件
 * @param {Object} schema 验证规则
 * @returns {Function} Express中间件
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // 验证路径参数
      if (schema.params) {
        validateObject(req.params, schema.params, 'params');
      }

      // 验证查询参数
      if (schema.query) {
        validateObject(req.query, schema.query, 'query');
      }

      // 验证请求体
      if (schema.body) {
        validateObject(req.body, schema.body, 'body');
      }

      next();
    } catch (error) {
      next(new ApiError(error.message, 'VALIDATION_ERROR'));
    }
  };
};

/**
 * 验证对象
 * @param {Object} obj 要验证的对象
 * @param {Object} schema 验证规则
 * @param {string} location 参数位置
 * @throws {Error} 验证错误
 */
const validateObject = (obj, schema, location) => {
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key];
    const isRequired = rules.required !== false;

    // 检查必填字段
    if (isRequired && (value === undefined || value === null)) {
      throw new Error(`${location}.${key} is required`);
    }

    // 如果字段可选且未提供，跳过验证
    if (!isRequired && (value === undefined || value === null)) {
      continue;
    }

    // 验证类型
    if (rules.type) {
      validateType(value, rules.type, `${location}.${key}`);
    }

    // 验证格式
    if (rules.format) {
      validateFormat(value, rules.format, `${location}.${key}`);
    }

    // 验证范围
    if (rules.min !== undefined) {
      validateMin(value, rules.min, `${location}.${key}`);
    }
    if (rules.max !== undefined) {
      validateMax(value, rules.max, `${location}.${key}`);
    }

    // 验证枚举值
    if (rules.enum) {
      validateEnum(value, rules.enum, `${location}.${key}`);
    }

    // 验证自定义函数
    if (rules.validate) {
      validateCustom(value, rules.validate, `${location}.${key}`);
    }
  }
};

/**
 * 验证类型
 * @param {*} value 值
 * @param {string} type 类型
 * @param {string} path 路径
 * @throws {Error} 类型错误
 */
const validateType = (value, type, path) => {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new Error(`${path} must be a string`);
      }
      break;
    case 'number':
      if (typeof value !== 'number') {
        throw new Error(`${path} must be a number`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`${path} must be a boolean`);
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        throw new Error(`${path} must be an array`);
      }
      break;
    case 'object':
      if (typeof value !== 'object' || value === null) {
        throw new Error(`${path} must be an object`);
      }
      break;
    case 'address':
      if (!ethers.utils.isAddress(value)) {
        throw new Error(`${path} must be a valid Ethereum address`);
      }
      break;
    case 'date':
      if (isNaN(Date.parse(value))) {
        throw new Error(`${path} must be a valid date`);
      }
      break;
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};

/**
 * 验证格式
 * @param {*} value 值
 * @param {string} format 格式
 * @param {string} path 路径
 * @throws {Error} 格式错误
 */
const validateFormat = (value, format, path) => {
  switch (format) {
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error(`${path} must be a valid email address`);
      }
      break;
    case 'url':
      try {
        new URL(value);
      } catch {
        throw new Error(`${path} must be a valid URL`);
      }
      break;
    case 'hex':
      if (!/^0x[0-9a-fA-F]+$/.test(value)) {
        throw new Error(`${path} must be a valid hex string`);
      }
      break;
    default:
      throw new Error(`Unknown format: ${format}`);
  }
};

/**
 * 验证最小值
 * @param {*} value 值
 * @param {number} min 最小值
 * @param {string} path 路径
 * @throws {Error} 范围错误
 */
const validateMin = (value, min, path) => {
  if (typeof value === 'number' && value < min) {
    throw new Error(`${path} must be greater than or equal to ${min}`);
  }
  if (typeof value === 'string' && value.length < min) {
    throw new Error(`${path} length must be greater than or equal to ${min}`);
  }
};

/**
 * 验证最大值
 * @param {*} value 值
 * @param {number} max 最大值
 * @param {string} path 路径
 * @throws {Error} 范围错误
 */
const validateMax = (value, max, path) => {
  if (typeof value === 'number' && value > max) {
    throw new Error(`${path} must be less than or equal to ${max}`);
  }
  if (typeof value === 'string' && value.length > max) {
    throw new Error(`${path} length must be less than or equal to ${max}`);
  }
};

/**
 * 验证枚举值
 * @param {*} value 值
 * @param {Array} enumValues 枚举值列表
 * @param {string} path 路径
 * @throws {Error} 枚举错误
 */
const validateEnum = (value, enumValues, path) => {
  if (!enumValues.includes(value)) {
    throw new Error(`${path} must be one of: ${enumValues.join(', ')}`);
  }
};

/**
 * 验证自定义函数
 * @param {*} value 值
 * @param {Function} validate 验证函数
 * @param {string} path 路径
 * @throws {Error} 验证错误
 */
const validateCustom = (value, validate, path) => {
  if (!validate(value)) {
    throw new Error(`${path} failed custom validation`);
  }
};

module.exports = { validateRequest }; 