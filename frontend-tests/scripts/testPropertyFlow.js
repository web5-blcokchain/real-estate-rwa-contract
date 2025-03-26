const { ethers } = require('hardhat');
const { testingUtils, TestError, logger, eventManager, metricsManager } = require('../../shared/utils');
const testUtils = require('./testUtils');

/**
 * 测试房产流程
 */
async function testPropertyFlow() {
  const startTime = Date.now();
  let success = false;

  try {
    // 初始化测试环境
    await testUtils.initialize();
    logger.info('Starting property flow test');

    // 生成测试数据
    const propertyDataList = await Promise.all([
      testingUtils.generateTestData('property'),
      testingUtils.generateTestData('property'),
      testingUtils.generateTestData('property')
    ]);
    const tokenDataList = await Promise.all([
      testingUtils.generateTestData('token'),
      testingUtils.generateTestData('token'),
      testingUtils.generateTestData('token')
    ]);
    logger.info('Test data generated');

    // 批量注册房产
    const properties = await testUtils.batchRegisterProperties(propertyDataList);
    logger.info(`Registered ${properties.length} properties`);

    // 批量审批房产
    const propertyNames = propertyDataList.map(data => data.name);
    const approvedProperties = await testUtils.batchApproveProperties(propertyNames);
    logger.info(`Approved ${approvedProperties.length} properties`);

    // 批量创建代币
    const tokenAddresses = await testUtils.batchCreateTokens(tokenDataList, propertyNames);
    logger.info(`Created ${tokenAddresses.length} tokens`);

    // 批量添加用户到白名单
    const userAddresses = [testUtils.userSigner.address];
    await testUtils.batchAddUsersToWhitelist(userAddresses);
    logger.info(`Added ${userAddresses.length} users to whitelist`);

    // 记录测试指标
    const duration = Date.now() - startTime;
    await testUtils.recordMetrics('PROPERTY_FLOW', duration, true);

    success = true;
    logger.info('Property flow test completed successfully');

  } catch (error) {
    testUtils.handleTestError('propertyFlow', error);
  } finally {
    // 清除缓存
    testUtils.clearCache();
  }
}

module.exports = { testPropertyFlow }; 