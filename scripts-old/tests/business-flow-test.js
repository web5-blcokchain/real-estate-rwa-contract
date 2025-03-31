/**
 * 系统关键业务流程测试脚本
 * 测试覆盖: 房产注册流程、代币发行、租金分配流程、代币赎回
 */
const { ethers } = require('hardhat');
const { getContractAddresses } = require('../../shared/config/contracts');
const logger = require('../../shared/utils/logger');

// 测试配置
const TEST_PROPERTY_ID = 'TEST-PROP-001';
const TEST_COUNTRY = 'JP';
const TEST_METADATA_URI = 'ipfs://QmTest123456789';
const TOKEN_NAME = '测试房产代币';
const TOKEN_SYMBOL = 'TST';
const INITIAL_SUPPLY = ethers.parseEther('1000000'); // 100万代币
const RENT_AMOUNT = ethers.parseEther('10000'); // 1万稳定币
const RENTAL_PERIOD = '2025-04-01 to 2025-04-30';
const REDEMPTION_AMOUNT = ethers.parseEther('50000'); // 5万代币赎回

/**
 * 测试房产注册和流程
 */
async function testPropertyRegistration() {
  console.log('\n===== 测试房产注册流程 =====');
  try {
    // 获取合约实例
    const contracts = getContractAddresses();
    const propertyRegistry = await ethers.getContractAt('PropertyRegistry', contracts.PropertyRegistry);
    
    // 获取当前房产数量
    const initialCount = await propertyRegistry.getPropertyCount();
    console.log(`当前房产数量: ${initialCount}`);
    
    // 注册新房产
    console.log(`注册新房产: ${TEST_PROPERTY_ID}`);
    const registerTx = await propertyRegistry.registerProperty(
      TEST_PROPERTY_ID,
      TEST_COUNTRY,
      TEST_METADATA_URI
    );
    await registerTx.wait();
    console.log('房产注册交易确认');
    
    // 验证房产是否成功注册
    const newCount = await propertyRegistry.getPropertyCount();
    console.log(`注册后房产数量: ${newCount}`);
    
    // 获取并检查房产状态
    const property = await propertyRegistry.getProperty(TEST_PROPERTY_ID);
    console.log(`房产状态: ${property.status}`);
    
    // 批准房产
    console.log('将房产状态更新为已批准');
    const approveTx = await propertyRegistry.approveProperty(TEST_PROPERTY_ID);
    await approveTx.wait();
    
    // 验证房产状态
    const updatedProperty = await propertyRegistry.getProperty(TEST_PROPERTY_ID);
    console.log(`房产新状态: ${updatedProperty.status}`);
    
    return updatedProperty.status === 2; // 2 = Approved
  } catch (error) {
    console.error('房产注册测试失败:', error.message);
    return false;
  }
}

/**
 * 测试代币创建流程
 */
async function testTokenCreation() {
  console.log('\n===== 测试代币创建流程 =====');
  try {
    // 获取合约实例
    const contracts = getContractAddresses();
    const tokenFactory = await ethers.getContractAt('TokenFactory', contracts.TokenFactory);
    
    // 创建代币前检查
    console.log(`为房产 ${TEST_PROPERTY_ID} 创建代币...`);
    const initialTokens = await tokenFactory.getAllTokens();
    console.log(`当前代币数量: ${initialTokens.length}`);
    
    // 创建代币
    const createTx = await tokenFactory.createSingleToken(
      TEST_PROPERTY_ID,
      TOKEN_NAME,
      TOKEN_SYMBOL,
      INITIAL_SUPPLY
    );
    await createTx.wait();
    console.log('代币创建交易确认');
    
    // 验证代币是否成功创建
    const newTokens = await tokenFactory.getAllTokens();
    console.log(`创建后代币数量: ${newTokens.length}`);
    
    // 获取代币地址
    const tokenAddress = await tokenFactory.getTokenAddress(TEST_PROPERTY_ID);
    console.log(`代币地址: ${tokenAddress}`);
    
    // 获取代币信息
    const token = await ethers.getContractAt('RealEstateToken', tokenAddress);
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    
    console.log(`代币名称: ${name}`);
    console.log(`代币符号: ${symbol}`);
    console.log(`代币总供应量: ${ethers.formatEther(totalSupply)}`);
    
    return tokenAddress !== ethers.ZeroAddress;
  } catch (error) {
    console.error('代币创建测试失败:', error.message);
    return false;
  }
}

/**
 * 测试租金分配流程
 */
async function testRentDistribution() {
  console.log('\n===== 测试租金分配流程 =====');
  try {
    // 获取合约实例
    const contracts = getContractAddresses();
    const rentDistributor = await ethers.getContractAt('RentDistributor', contracts.RentDistributor);
    const tokenFactory = await ethers.getContractAt('TokenFactory', contracts.TokenFactory);
    
    // 获取账户
    const [deployer] = await ethers.getSigners();
    
    // 获取代币地址
    const tokenAddress = await tokenFactory.getTokenAddress(TEST_PROPERTY_ID);
    console.log(`代币地址: ${tokenAddress}`);
    
    // 模拟稳定币 - 这里使用代币本身来模拟
    const stablecoinAddress = tokenAddress;
    
    // 检查租金分配计数
    const initialCount = await rentDistributor.distributionCount();
    console.log(`当前租金分配数量: ${initialCount}`);
    
    // 设置稳定币为支持的代币
    console.log('添加支持的稳定币...');
    const addStablecoinTx = await rentDistributor.addSupportedStablecoin(stablecoinAddress);
    await addStablecoinTx.wait();
    
    // 接收租金
    console.log(`接收 ${ethers.formatEther(RENT_AMOUNT)} 租金...`);
    const receiveTx = await rentDistributor.receiveStablecoinRent(
      TEST_PROPERTY_ID,
      tokenAddress,
      stablecoinAddress,
      RENT_AMOUNT,
      RENTAL_PERIOD
    );
    await receiveTx.wait();
    
    // 检查租金分配是否创建
    const newCount = await rentDistributor.distributionCount();
    console.log(`新的租金分配数量: ${newCount}`);
    
    // 处理租金分配
    console.log('处理租金分配...');
    const processTx = await rentDistributor.processRentDistribution(initialCount);
    await processTx.wait();
    
    // 获取租金分配信息
    const distribution = await rentDistributor.rentDistributions(initialCount);
    console.log(`租金分配信息:`);
    console.log(`- 总金额: ${ethers.formatEther(distribution.totalAmount)}`);
    console.log(`- 平台费用: ${ethers.formatEther(distribution.platformFee)}`);
    console.log(`- 维护费用: ${ethers.formatEther(distribution.maintenanceFee)}`);
    console.log(`- 净额: ${ethers.formatEther(distribution.netAmount)}`);
    console.log(`- 已处理: ${distribution.isProcessed}`);
    
    return distribution.isProcessed;
  } catch (error) {
    console.error('租金分配测试失败:', error.message);
    return false;
  }
}

/**
 * 测试赎回流程
 */
async function testRedemption() {
  console.log('\n===== 测试代币赎回流程 =====');
  try {
    // 获取合约实例
    const contracts = getContractAddresses();
    const redemptionManager = await ethers.getContractAt('RedemptionManager', contracts.RedemptionManager);
    const tokenFactory = await ethers.getContractAt('TokenFactory', contracts.TokenFactory);
    
    // 获取账户
    const [deployer] = await ethers.getSigners();
    
    // 获取代币地址和属性ID
    const tokenAddress = await tokenFactory.getTokenAddress(TEST_PROPERTY_ID);
    console.log(`代币地址: ${tokenAddress}`);
    const token = await ethers.getContractAt('RealEstateToken', tokenAddress);
    
    // 模拟稳定币 - 这里使用代币本身来模拟
    const stablecoinAddress = tokenAddress;
    
    // 添加支持的稳定币
    console.log('添加支持的稳定币...');
    const addStablecoinTx = await redemptionManager.addSupportedStablecoin(stablecoinAddress);
    await addStablecoinTx.wait();
    
    // 检查赎回请求数量
    const initialCount = await redemptionManager.requestCount();
    console.log(`当前赎回请求数量: ${initialCount}`);
    
    // 批准合约使用代币
    console.log(`批准赎回管理器使用 ${ethers.formatEther(REDEMPTION_AMOUNT)} 代币...`);
    const approveTx = await token.approve(redemptionManager.target, REDEMPTION_AMOUNT);
    await approveTx.wait();
    
    // 使用字符串属性ID
    // 修复：使用TEST_PROPERTY_ID变量而不是硬编码数字
    console.log(`使用属性ID: ${TEST_PROPERTY_ID} 请求赎回`);
    
    // 请求赎回
    console.log(`请求赎回 ${ethers.formatEther(REDEMPTION_AMOUNT)} 代币...`);
    const requestTx = await redemptionManager.requestRedemption(
      TEST_PROPERTY_ID,
      tokenAddress,
      REDEMPTION_AMOUNT,
      stablecoinAddress
    );
    await requestTx.wait();
    
    // 检查赎回请求是否创建
    const newCount = await redemptionManager.requestCount();
    console.log(`新的赎回请求数量: ${newCount}`);
    
    // 获取请求信息
    const requestId = initialCount + 1n;
    const request = await redemptionManager.redemptionRequests(requestId);
    console.log(`赎回请求信息:`);
    console.log(`- 请求ID: ${request.requestId}`);
    console.log(`- 请求者: ${request.requester}`);
    console.log(`- 代币地址: ${request.tokenAddress}`);
    console.log(`- 代币数量: ${ethers.formatEther(request.tokenAmount)}`);
    console.log(`- 状态: ${request.status}`);
    
    return request.status === 0; // 0 = Pending
  } catch (error) {
    console.error('赎回流程测试失败:', error.message);
    return false;
  }
}

/**
 * 执行所有测试
 */
async function runAllTests() {
  try {
    // 确保合约地址加载
    const contracts = getContractAddresses();
    if (!contracts || !contracts.RealEstateSystem) {
      console.error('未找到合约地址，请确保系统已部署');
      return false;
    }
    
    console.log('========= 开始测试关键业务流程 =========');
    console.log('测试环境准备完成，开始执行测试...');
    console.log('合约地址：', contracts);
    
    // 执行测试
    const propertyRegistered = await testPropertyRegistration();
    if (!propertyRegistered) {
      console.error('房产注册测试失败，停止后续测试');
      return false;
    }
    
    const tokenCreated = await testTokenCreation();
    if (!tokenCreated) {
      console.error('代币创建测试失败，停止后续测试');
      return false;
    }
    
    const rentDistributed = await testRentDistribution();
    if (!rentDistributed) {
      console.error('租金分配测试失败，停止后续测试');
      return false;
    }
    
    const redemptionRequested = await testRedemption();
    if (!redemptionRequested) {
      console.error('赎回流程测试失败');
      return false;
    }
    
    console.log('\n========= 测试结果摘要 =========');
    console.log('房产注册测试：', propertyRegistered ? '✅ 通过' : '❌ 失败');
    console.log('代币创建测试：', tokenCreated ? '✅ 通过' : '❌ 失败');
    console.log('租金分配测试：', rentDistributed ? '✅ 通过' : '❌ 失败');
    console.log('赎回流程测试：', redemptionRequested ? '✅ 通过' : '❌ 失败');
    
    console.log('\n所有测试完成！');
    return propertyRegistered && tokenCreated && rentDistributed && redemptionRequested;
  } catch (error) {
    console.error('测试执行发生错误:', error.message);
    return false;
  }
}

// 执行测试
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试脚本执行出错:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests }; 