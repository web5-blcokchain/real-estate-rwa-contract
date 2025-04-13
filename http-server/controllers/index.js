/**
 * 控制器索引
 * 导出所有控制器
 */

// 引入所有控制器
const RealEstateFacadeController = require('./RealEstateFacadeController');
const RewardManagerControllerClass = require('./RewardManagerController');

// 创建RewardManagerController实例
const RewardManagerController = new RewardManagerControllerClass();

// 导出控制器实例
module.exports = {
  RealEstateFacadeController,
  RewardManagerController
}; 