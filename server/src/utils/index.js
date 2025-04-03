/**
 * 工具模块索引
 * 统一导出所有工具
 */
const apiResponse = require('./apiResponse');
const validateParams = require('./validateParams');

module.exports = {
  ...apiResponse,
  validateParams
}; 