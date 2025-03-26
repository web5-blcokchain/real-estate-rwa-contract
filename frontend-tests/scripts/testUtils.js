const { ethers } = require('hardhat');
const { testingUtils, TestError, logger, eventManager, metricsManager } = require('../../shared/utils');

/**
 * 测试工具类
 */
class TestUtils {
    constructor() {
        this.provider = null;
        this.adminSigner = null;
        this.userSigner = null;
        this.contracts = {};
    }

    /**
     * 初始化测试环境
     */
    async initialize() {
        await testingUtils.initialize();
        logger.info('Initializing test environment');

        // 加载测试配置
        const config = await testingUtils.loadTestConfig();
        const network = await testingUtils.getTestNetworkConfig();
        logger.info(`Using network: ${network.name}`);

        // 设置provider和signer
        this.provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);
        this.adminSigner = new ethers.Wallet(config.admin.privateKey, this.provider);
        this.userSigner = new ethers.Wallet(config.user.privateKey, this.provider);
        logger.info('Provider and signers initialized');

        // 获取合约地址
        const propertyRegistryAddress = await testingUtils.getTestContractAddress('PropertyRegistry');
        const tokenFactoryAddress = await testingUtils.getTestContractAddress('TokenFactory');
        const realEstateTokenAddress = await testingUtils.getTestContractAddress('RealEstateToken');

        // 加载合约ABI
        const propertyRegistryAbi = await testingUtils.getContractAbi('PropertyRegistry');
        const tokenFactoryAbi = await testingUtils.getContractAbi('TokenFactory');
        const realEstateTokenAbi = await testingUtils.getContractAbi('RealEstateToken');

        // 创建合约实例
        this.contracts.propertyRegistry = new ethers.Contract(
            propertyRegistryAddress,
            propertyRegistryAbi,
            this.adminSigner
        );
        this.contracts.tokenFactory = new ethers.Contract(
            tokenFactoryAddress,
            tokenFactoryAbi,
            this.adminSigner
        );
        this.contracts.realEstateToken = new ethers.Contract(
            realEstateTokenAddress,
            realEstateTokenAbi,
            this.adminSigner
        );
        logger.info('Contract instances created');
    }

    /**
     * 注册房产
     */
    async registerProperty(propertyData) {
        logger.info('Registering property...');
        const registerTx = await this.contracts.propertyRegistry.registerProperty(
            propertyData.name,
            propertyData.location,
            propertyData.price,
            propertyData.size,
            propertyData.description,
            propertyData.features,
            propertyData.images,
            propertyData.documents
        );
        const registerReceipt = await registerTx.wait();
        logger.info(`Property registered: ${registerReceipt.transactionHash}`);

        // 验证房产注册
        const property = await this.contracts.propertyRegistry.getProperty(propertyData.name);
        expect(property.name).toBe(propertyData.name);
        expect(property.location).toBe(propertyData.location);
        expect(property.price.toString()).toBe(propertyData.price.toString());
        expect(property.size.toString()).toBe(propertyData.size.toString());
        expect(property.description).toBe(propertyData.description);
        expect(property.features).toEqual(propertyData.features);
        expect(property.images).toEqual(propertyData.images);
        expect(property.documents).toEqual(propertyData.documents);
        expect(property.owner).toBe(this.adminSigner.address);
        expect(property.approved).toBe(false);
        logger.info('Property registration verified');

        return property;
    }

    /**
     * 审批房产
     */
    async approveProperty(propertyName) {
        logger.info('Approving property...');
        const approveTx = await this.contracts.propertyRegistry.approveProperty(propertyName);
        const approveReceipt = await approveTx.wait();
        logger.info(`Property approved: ${approveReceipt.transactionHash}`);

        // 验证房产审批
        const approvedProperty = await this.contracts.propertyRegistry.getProperty(propertyName);
        expect(approvedProperty.approved).toBe(true);
        logger.info('Property approval verified');

        return approvedProperty;
    }

    /**
     * 创建代币
     */
    async createToken(tokenData, propertyName) {
        logger.info('Creating token...');
        const createTokenTx = await this.contracts.tokenFactory.createToken(
            tokenData.name,
            tokenData.symbol,
            tokenData.decimals,
            tokenData.totalSupply,
            propertyName,
            tokenData.price
        );
        const createTokenReceipt = await createTokenTx.wait();
        logger.info(`Token created: ${createTokenReceipt.transactionHash}`);

        // 验证代币创建
        const tokenAddress = await this.contracts.tokenFactory.getTokenAddress(propertyName);
        expect(tokenAddress).toBeTruthy();
        expect(await this.contracts.tokenFactory.isToken(tokenAddress)).toBe(true);
        logger.info('Token creation verified');

        return tokenAddress;
    }

    /**
     * 添加用户到白名单
     */
    async addUserToWhitelist(userAddress) {
        logger.info('Adding user to whitelist...');
        const addToWhitelistTx = await this.contracts.realEstateToken.addToWhitelist(userAddress);
        const addToWhitelistReceipt = await addToWhitelistTx.wait();
        logger.info(`User added to whitelist: ${addToWhitelistReceipt.transactionHash}`);

        // 验证白名单
        expect(await this.contracts.realEstateToken.isWhitelisted(userAddress)).toBe(true);
        logger.info('Whitelist verification completed');
    }

    /**
     * 转账代币
     */
    async transferTokens(fromSigner, toAddress, amount) {
        logger.info('Transferring tokens...');
        const transferTx = await this.contracts.realEstateToken.connect(fromSigner).transfer(
            toAddress,
            amount
        );
        const transferReceipt = await transferTx.wait();
        logger.info(`Tokens transferred: ${transferReceipt.transactionHash}`);

        // 验证转账
        const finalBalance = await this.contracts.realEstateToken.balanceOf(toAddress);
        logger.info('Transfer verification completed');

        return finalBalance;
    }

    /**
     * 记录测试指标
     */
    async recordMetrics(testName, duration, success) {
        await metricsManager.record(`${testName}_DURATION`, duration);
        await metricsManager.record(`${testName}_SUCCESS`, success ? 1 : 0);

        // 发送测试完成事件
        await eventManager.emit(success ? 'TEST_COMPLETED' : 'TEST_FAILED', {
            test: testName,
            duration,
            success
        });
    }

    /**
     * 处理测试错误
     */
    handleTestError(testName, error) {
        logger.error(`${testName} test failed:`, error);
        eventManager.emit('TEST_FAILED', {
            test: testName,
            error: error.message,
            stack: error.stack
        });
        throw new TestError(`${testName} test failed`, 'TEST_FAILED', testName);
    }
}

module.exports = new TestUtils(); 