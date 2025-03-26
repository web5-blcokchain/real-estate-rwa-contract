/**
 * Server模块优化验证脚本
 * 用于测试XG0005中进行的模块优化
 */

// 首先初始化模块别名
require('../../shared/utils/moduleAlias').initializeAliases();

const { configManager } = require('@shared/config');
const { contractService } = require('@shared/utils/contractService');
const { initializeBlockchain, resetBlockchain } = require('@shared/utils/blockchain');
const { ApiError, handleError } = require('@shared/utils/errors');
const logger = require('@server/utils/logger');

/**
 * 测试模块引用和错误处理
 */
async function testModuleReferences() {
  logger.info('开始测试模块引用和错误处理...');
  
  try {
    // 测试configManager
    if (!configManager.isInitialized()) {
      await configManager.initialize();
      logger.info('configManager初始化成功');
    } else {
      logger.info('configManager已初始化');
    }
    
    // 验证合约地址是否正确加载
    const addresses = configManager.getContractAddresses();
    logger.info(`加载了${Object.keys(addresses).length}个合约地址`);
    
    // 测试错误处理
    try {
      logger.info('测试API错误处理...');
      throw new ApiError({ 
        message: '这是一个测试错误', 
        code: 'TEST_ERROR', 
        statusCode: 400, 
        details: { context: '测试上下文' } 
      });
    } catch (error) {
      handleError(error);
      logger.info('错误处理测试成功');
    }
    
    return true;
  } catch (error) {
    logger.error('模块引用测试失败:', error);
    return false;
  }
}

/**
 * 测试合约服务
 */
async function testContractService() {
  logger.info('开始测试合约服务...');
  
  try {
    // 初始化区块链连接
    await initializeBlockchain();
    logger.info('区块链连接初始化成功');
    
    // 初始化合约服务
    if (!contractService.initialized) {
      await contractService.initialize();
      logger.info('合约服务初始化成功');
    } else {
      logger.info('合约服务已初始化');
    }
    
    // 测试获取各个合约服务
    const tokenFactory = contractService.getTokenFactory();
    logger.info('已获取TokenFactory服务');
    
    const propertyRegistry = contractService.getPropertyRegistry();
    logger.info('已获取PropertyRegistry服务');
    
    const redemptionManager = contractService.getRedemptionManager();
    logger.info('已获取RedemptionManager服务');
    
    const rentDistributor = contractService.getRentDistributor();
    logger.info('已获取RentDistributor服务');
    
    // 测试一个只读操作
    try {
      const count = await propertyRegistry.executeRead('getPropertyCount');
      logger.info(`当前房产数量: ${count.toString()}`);
    } catch (error) {
      logger.warn(`获取房产数量失败: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    logger.error('合约服务测试失败:', error);
    return false;
  } finally {
    // 清理资源
    resetBlockchain();
    logger.info('区块链连接已重置');
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  logger.info('开始运行Server模块优化验证测试...');
  
  let success = true;
  
  try {
    // 测试模块引用
    const referenceTestResult = await testModuleReferences();
    logger.info(`模块引用测试${referenceTestResult ? '成功' : '失败'}`);
    success = success && referenceTestResult;
    
    // 测试合约服务
    const contractServiceTestResult = await testContractService();
    logger.info(`合约服务测试${contractServiceTestResult ? '成功' : '失败'}`);
    success = success && contractServiceTestResult;
    
    logger.info(`测试完成，总体结果: ${success ? '成功' : '失败'}`);
    return success;
  } catch (error) {
    logger.error('测试过程中发生未捕获错误:', error);
    return false;
  }
}

// 运行测试
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  logger.error('测试脚本执行失败:', error);
  process.exit(1);
}); 