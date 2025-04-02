/**
 * @fileoverview 区块链基础功能模块
 * @module shared
 */

const core = require('./core');
const utils = require('./utils');
const config = require('./config');

/**
 * 导出所有模块
 * @exports shared
 */
module.exports = {
  ...core,
  ...utils,
  ...config
}; 