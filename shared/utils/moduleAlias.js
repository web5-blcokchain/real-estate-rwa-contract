/**
 * 模块别名初始化
 * 用于简化模块引用路径
 */

const moduleAlias = require('module-alias');
const path = require('path');

// 注册模块别名
moduleAlias.addAliases({
  '@shared': path.resolve(__dirname, '../..'),
  '@server': path.resolve(__dirname, '../../../server/src'),
  '@monitor': path.resolve(__dirname, '../../../monitor/src')
});

/**
 * 初始化模块别名
 * 在应用程序入口点调用此函数
 */
function initializeAliases() {
  // 如果存在注册模块别名失败的情况，可以在这里添加处理逻辑
  console.log('Module aliases initialized');
}

module.exports = {
  initializeAliases
}; 