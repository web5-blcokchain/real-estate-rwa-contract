const testPropertyFlow = require('./testPropertyFlow');
const testTokenFlow = require('./testTokenFlow');
const testUserFlow = require('./testUserFlow');
const logger = require('../../shared/utils/logger');
const { EVENTS } = require('../../shared/utils/constants');

/**
 * 运行所有测试
 */
async function runTests() {
  const startTime = Date.now();
  logger.info('Starting all tests');

  try {
    // 运行房产流程测试
    logger.info('Running property flow test...');
    await testPropertyFlow();
    logger.info('Property flow test completed');

    // 运行代币流程测试
    logger.info('Running token flow test...');
    await testTokenFlow();
    logger.info('Token flow test completed');

    // 运行用户流程测试
    logger.info('Running user flow test...');
    await testUserFlow();
    logger.info('User flow test completed');

    // 计算总运行时间
    const duration = Date.now() - startTime;
    logger.info(`All tests completed successfully in ${duration}ms`);

    // 触发测试完成事件
    await eventManager.emit(EVENTS.TEST_COMPLETED, {
      testName: 'all',
      duration,
      success: true
    });

    process.exit(0);
  } catch (error) {
    logger.error('Test suite failed:', error);

    // 触发测试失败事件
    await eventManager.emit(EVENTS.TEST_FAILED, {
      testName: 'all',
      error: error.message,
      stack: error.stack
    });

    process.exit(1);
  }
}

// 运行测试
runTests(); 