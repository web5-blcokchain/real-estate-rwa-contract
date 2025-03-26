const contractService = require('../scripts/contractService');
const { loadConfig } = require('../config');
const { logger } = require('../../shared/utils/logger');

/**
 * 测试完整的房产流程
 * 从注册房产到创建代币
 */
async function testPropertyFlow() {
  try {
    logger.info('开始测试房产流程...\n');

    // 加载测试配置
    logger.info('加载测试配置...');
    const { testConfig } = await loadConfig();
    logger.info('测试配置加载完成');

    // 确保合约服务已初始化
    if (!contractService.initialized) {
      await contractService.initialize();
    }

    // 获取合约实例
    const propertyRegistry = contractService.getPropertyRegistry('admin');
    const tokenFactory = contractService.getTokenFactory('admin');

    // 1. 注册房产
    logger.info('1. 注册房产...');
    const propertyId = testConfig.testData.property.id;
    const propertyData = {
      id: propertyId,
      country: testConfig.testData.property.country,
      metadataURI: testConfig.testData.property.metadataURI
    };
    logger.info('准备注册房产:', propertyData);

    const registerTx = await propertyRegistry.registerProperty(
      propertyData.id,
      propertyData.country,
      propertyData.metadataURI
    );
    logger.info('等待交易确认...');
    await registerTx.wait();
    logger.info('房产注册成功，交易哈希:', registerTx.hash);

    // 2. 批准房产
    logger.info('\n2. 批准房产...');
    logger.info('准备批准房产:', propertyId);
    const approveTx = await propertyRegistry.approveProperty(propertyId);
    logger.info('等待交易确认...');
    await approveTx.wait();
    logger.info('房产批准成功，交易哈希:', approveTx.hash);

    // 3. 创建代币
    logger.info('\n3. 创建代币...');
    const tokenData = {
      propertyId: propertyId,
      tokenName: testConfig.testData.property.tokenName,
      tokenSymbol: testConfig.testData.property.tokenSymbol,
      totalSupply: testConfig.testData.property.totalSupply
    };
    logger.info('准备创建代币:', tokenData);

    const createTokenTx = await tokenFactory.createToken(
      tokenData.propertyId,
      tokenData.tokenName,
      tokenData.tokenSymbol,
      18, // decimals
      tokenData.totalSupply, // maxSupply
      tokenData.totalSupply, // initialSupply
      await contractService.accounts.admin.getAddress() // initialHolder
    );
    logger.info('等待交易确认...');
    const receipt = await createTokenTx.wait();
    logger.info('代币创建成功，交易哈希:', receipt.hash);

    // 4. 获取代币地址
    logger.info('\n4. 获取代币地址...');
    const tokenAddress = createTokenTx.tokenAddress;
    logger.info('代币地址:', tokenAddress);

    // 5. 将用户添加到白名单
    logger.info('\n5. 将用户添加到白名单...');
    const token = contractService.getToken(tokenAddress, 'admin');
    const userAddress = await contractService.accounts.operator.getAddress();
    logger.info('准备将用户添加到白名单:', userAddress);

    const addToWhitelistTx = await token.addToWhitelist(userAddress);
    logger.info('等待交易确认...');
    await addToWhitelistTx.wait();
    logger.info('用户已添加到白名单，交易哈希:', addToWhitelistTx.hash);

    logger.info('\n房产流程测试完成');
    return true;
  } catch (error) {
    logger.error('房产流程测试失败:', error);
    throw error; // 抛出错误以便上层处理
  }
}

module.exports = testPropertyFlow; 