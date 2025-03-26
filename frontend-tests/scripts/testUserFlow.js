const { ethers } = require('hardhat');
const { testingUtils, TestError, logger, eventManager, metricsManager } = require('../../shared/utils');
const testUtils = require('./testUtils');

/**
 * 测试用户流程
 */
async function testUserFlow() {
    const startTime = Date.now();
    let success = false;

    try {
        // 初始化测试环境
        await testUtils.initialize();
        logger.info('Starting user flow test');

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
        const userDataList = await Promise.all([
            testingUtils.generateTestData('user'),
            testingUtils.generateTestData('user'),
            testingUtils.generateTestData('user')
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

        // 获取用户代币余额
        const initialBalance = await testUtils.contracts.realEstateToken.balanceOf(testUtils.userSigner.address);
        logger.info(`Initial balance: ${initialBalance.toString()}`);

        // 批量转账代币给用户
        const adminTransfers = tokenAddresses.map((_, index) => ({
            fromSigner: testUtils.adminSigner,
            toAddress: testUtils.userSigner.address,
            amount: ethers.utils.parseEther('100')
        }));
        const adminFinalBalances = await testUtils.batchTransferTokens(adminTransfers);
        logger.info(`Completed ${adminFinalBalances.length} admin transfers`);

        // 验证用户新余额
        const userBalance = await testUtils.contracts.realEstateToken.balanceOf(testUtils.userSigner.address);
        expect(userBalance.sub(initialBalance)).toBe(ethers.utils.parseEther('300'));
        logger.info('Admin transfer verification completed');

        // 批量用户转账测试
        const userTransfers = tokenAddresses.map((_, index) => ({
            fromSigner: testUtils.userSigner,
            toAddress: testUtils.adminSigner.address,
            amount: ethers.utils.parseEther('50')
        }));
        const userFinalBalances = await testUtils.batchTransferTokens(userTransfers);
        logger.info(`Completed ${userFinalBalances.length} user transfers`);

        // 验证最终余额
        const finalUserBalance = await testUtils.contracts.realEstateToken.balanceOf(testUtils.userSigner.address);
        const finalAdminBalance = await testUtils.contracts.realEstateToken.balanceOf(testUtils.adminSigner.address);
        expect(finalUserBalance).toBe(userBalance.sub(ethers.utils.parseEther('150')));
        expect(finalAdminBalance).toBe(ethers.utils.parseEther('150'));
        logger.info('Final balance verification completed');

        // 记录测试指标
        const duration = Date.now() - startTime;
        await testUtils.recordMetrics('USER_FLOW', duration, true);

        success = true;
        logger.info('User flow test completed successfully');

    } catch (error) {
        testUtils.handleTestError('userFlow', error);
    } finally {
        // 清除缓存
        testUtils.clearCache();
    }
}

module.exports = { testUserFlow }; 