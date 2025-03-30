/**
 * 工具模块索引
 * 统一导出所有工具模块
 */

// 导入所有工具模块
const logger = require('./logger');
const getAbis = require('./getAbis');
const web3Provider = require('./web3Provider');
const contractService = require('./contractService');
const transaction = require('./transaction');
const eventListener = require('./eventListener');
const ethers = require('./ethers');  // ethers v6 工具

// 部署工具模块 - 三层架构
const { deploymentState } = require('./deployment-state');
const deploymentCore = require('./deployment-core');
const { SystemDeployer, DEPLOYMENT_STRATEGIES } = require('./deployment-system');

// 导出所有模块
module.exports = {
  // 工具模块
  logger,
  getAbis,
  web3Provider,
  contractService,
  transaction,
  eventListener,
  ethers,
  
  // 导出部署模块（三层架构）
  deploymentState,              // 第一层：状态层
  deploymentCore,               // 第二层：核心层
  SystemDeployer,               // 第三层：系统层
  DEPLOYMENT_STRATEGIES,        // 部署策略常量
  
  // 为了向后兼容性，导出旧版API接口
  deployUtils: {
    // 关键函数映射到新架构
    getDeployedContracts: deploymentState.getDeployedContracts,
    loadDeployedContracts: deploymentState.loadDeployedContracts,
    saveDeployedContracts: deploymentState.saveDeployments,
    deployContract: deploymentCore.deployContract,
    deployUpgradeableContract: deploymentCore.deployUpgradeableContract,
    verifyContract: deploymentCore.verifyContract,
    isContractDeployed: deploymentCore.isContractDeployed
  },
  
  // 常用函数直接导出，方便使用
  getLogger: logger.getLogger,
  log: logger.log,
  error: logger.error,
  deployLibraries: deploymentCore.deployLibraries,
  deployContract: deploymentCore.deployContract,
  deployUpgradeableContract: deploymentCore.deployUpgradeableContract,
  saveDeploymentRecord: deploymentCore.saveDeploymentRecord,
  
  // SystemDeployer 工厂方法
  createSystemDeployer: (config) => new SystemDeployer(config)
}; 