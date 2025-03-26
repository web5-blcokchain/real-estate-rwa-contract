const { ethers } = require('hardhat');
const { testingUtils, TestError, logger, eventManager, metricsManager } = require('../../shared/utils');
const testUtils = require('./testUtils');

/**
 * 测试代币流程
 */
async function testTokenFlow() {
    const startTime = Date.now();
    let success = false;

    try {
        // 初始化测试环境
        await testUtils.initialize();
        logger.info('Starting token flow test');

        // 生成测试数据
        const tokenDataList = await Promise.all([
            testingUtils.generateTestData('token'),
            testingUtils.generateTestData('token'),
            testingUtils.generateTestData('token')
        ]);
        const propertyDataList = await Promise.all([
            testingUtils.generateTestData('property'),
            testingUtils.generateTestData('property'),
            testingUtils.generateTestData('property')
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

        // 获取代币余额
        const initialBalance = await testUtils.contracts.realEstateToken.balanceOf(testUtils.userSigner.address);
        logger.info(`Initial balance: ${initialBalance.toString()}`);

        // 批量转账代币
        const transfers = tokenAddresses.map((_, index) => ({
            fromSigner: testUtils.adminSigner,
            toAddress: testUtils.userSigner.address,
            amount: ethers.utils.parseEther('100')
        }));
        const finalBalances = await testUtils.batchTransferTokens(transfers);
        logger.info(`Completed ${finalBalances.length} transfers`);

        // 验证转账
        const finalBalance = await testUtils.contracts.realEstateToken.balanceOf(testUtils.userSigner.address);
        expect(finalBalance.sub(initialBalance)).toBe(ethers.utils.parseEther('300'));
        logger.info('Transfer verification completed');

        // 记录测试指标
        const duration = Date.now() - startTime;
        await testUtils.recordMetrics('TOKEN_FLOW', duration, true);

        success = true;
        logger.info('Token flow test completed successfully');

    } catch (error) {
        testUtils.handleTestError('tokenFlow', error);
    } finally {
        // 清除缓存
        testUtils.clearCache();
    }
}

module.exports = { testTokenFlow }; 