/**
 * 中间件索引文件
 * 集中导出所有中间件
 */

const apiKey = require('./apiKey');
const errorHandler = require('./errorHandler');

module.exports = {
  apiKey,
  errorHandler
}; 