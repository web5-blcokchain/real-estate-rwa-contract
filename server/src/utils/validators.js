const { ethers } = require('ethers');
const Joi = require('joi');

/**
 * 以太坊地址验证器
 * @param {string} value 地址值
 * @returns {boolean} 是否为有效地址
 */
const isValidAddress = (value) => {
  return ethers.utils.isAddress(value);
};

/**
 * 创建地址验证架构
 * @param {string} [label='Address'] 字段标签
 * @returns {Joi.StringSchema} Joi验证架构
 */
const addressSchema = (label = 'Address') => {
  return Joi.string()
    .custom((value, helpers) => {
      if (!isValidAddress(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }, 'Ethereum address validation')
    .messages({
      'any.invalid': `{{#label}} must be a valid Ethereum address`,
    })
    .required()
    .label(label);
};

/**
 * 创建正整数验证架构
 * @param {string} [label='Value'] 字段标签
 * @returns {Joi.NumberSchema} Joi验证架构
 */
const positiveIntSchema = (label = 'Value') => {
  return Joi.number()
    .integer()
    .positive()
    .required()
    .label(label);
};

/**
 * 创建字符串ID验证架构
 * @param {string} [label='ID'] 字段标签
 * @returns {Joi.StringSchema} Joi验证架构
 */
const stringIdSchema = (label = 'ID') => {
  return Joi.string()
    .trim()
    .required()
    .label(label);
};

/**
 * 创建BigNumber/Wei值验证架构
 * @param {string} [label='Amount'] 字段标签
 * @returns {Joi.StringSchema} Joi验证架构
 */
const amountSchema = (label = 'Amount') => {
  return Joi.string()
    .custom((value, helpers) => {
      try {
        // 验证字符串是否可以解析为BigNumber
        ethers.BigNumber.from(value);
        return value;
      } catch (e) {
        return helpers.error('any.invalid');
      }
    }, 'BigNumber validation')
    .required()
    .messages({
      'any.invalid': `{{#label}} must be a valid amount (number or hex)`,
    })
    .label(label);
};

/**
 * 创建布尔值验证架构
 * @param {string} [label='Flag'] 字段标签
 * @returns {Joi.BooleanSchema} Joi验证架构
 */
const booleanSchema = (label = 'Flag') => {
  return Joi.boolean()
    .required()
    .label(label);
};

/**
 * 创建字符串数组验证架构
 * @param {string} [label='Items'] 字段标签
 * @returns {Joi.ArraySchema} Joi验证架构
 */
const stringArraySchema = (label = 'Items') => {
  return Joi.array()
    .items(Joi.string().required())
    .required()
    .label(label);
};

/**
 * 创建地址数组验证架构
 * @param {string} [label='Addresses'] 字段标签
 * @returns {Joi.ArraySchema} Joi验证架构
 */
const addressArraySchema = (label = 'Addresses') => {
  return Joi.array()
    .items(addressSchema('Item'))
    .required()
    .label(label);
};

/**
 * 创建金额数组验证架构
 * @param {string} [label='Amounts'] 字段标签
 * @returns {Joi.ArraySchema} Joi验证架构
 */
const amountArraySchema = (label = 'Amounts') => {
  return Joi.array()
    .items(amountSchema('Item'))
    .required()
    .label(label);
};

module.exports = {
  isValidAddress,
  addressSchema,
  positiveIntSchema,
  stringIdSchema,
  amountSchema,
  booleanSchema,
  stringArraySchema,
  addressArraySchema,
  amountArraySchema,
}; 