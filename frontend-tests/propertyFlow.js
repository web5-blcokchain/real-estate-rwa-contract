const { ethers } = require('ethers');
const { PropertyRegistryService } = require('../shared/services/propertyRegistryService');
const { RealEstateTokenService } = require('../shared/services/realEstateTokenService');
const { RentDistributorService } = require('../shared/services/rentDistributorService');
const { RedemptionManagerService } = require('../shared/services/redemptionManagerService');

// 测试配置
const config = {
  provider: new ethers.providers.Web3Provider(window.ethereum),
  propertyRegistryAddress: '0x...', // 需要替换为实际地址
  realEstateTokenAddress: '0x...',  // 需要替换为实际地址
  rentDistributorAddress: '0x...',  // 需要替换为实际地址
  redemptionManagerAddress: '0x...' // 需要替换为实际地址
};

// 初始化服务
const propertyRegistry = new PropertyRegistryService(config.provider, config.propertyRegistryAddress);
const realEstateToken = new RealEstateTokenService(config.provider, config.realEstateTokenAddress);
const rentDistributor = new RentDistributorService(config.provider, config.rentDistributorAddress);
const redemptionManager = new RedemptionManagerService(config.provider, config.redemptionManagerAddress);

// 测试数据
const testData = {
  property: {
    id: '1',
    name: 'Test Property',
    country: 'Japan',
    metadataURI: 'https://example.com/metadata/1.json'
  },
  token: {
    name: 'Test Token',
    symbol: 'TEST',
    decimals: 18,
    maxSupply: ethers.utils.parseEther('1000000'),
    initialSupply: ethers.utils.parseEther('100000'),
    initialHolder: '0x...' // 需要替换为实际地址
  },
  rent: {
    amount: ethers.utils.parseEther('1000'),
    description: 'Monthly Rent',
    rentPeriodStart: Math.floor(Date.now() / 1000),
    rentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  },
  redemption: {
    amount: ethers.utils.parseEther('10000'),
    reason: 'Test Redemption'
  }
};

// 测试流程
async function testPropertyFlow() {
  try {
    console.log('开始测试房产流程...');
    
    // 1. 注册房产
    console.log('1. 注册房产');
    const propertyTx = await propertyRegistry.registerProperty(
      testData.property.id,
      testData.property.country,
      testData.property.metadataURI
    );
    await propertyTx.wait();
    console.log('房产注册成功:', propertyTx.hash);
    
    // 2. 创建代币
    console.log('2. 创建代币');
    const tokenTx = await realEstateToken.createToken(
      testData.property.id,
      testData.token.name,
      testData.token.symbol,
      testData.token.decimals,
      testData.token.maxSupply,
      testData.token.initialSupply,
      testData.token.initialHolder
    );
    await tokenTx.wait();
    console.log('代币创建成功:', tokenTx.hash);
    
    // 3. 分配租金
    console.log('3. 分配租金');
    const rentTx = await rentDistributor.createDistribution({
      tokenAddress: config.realEstateTokenAddress,
      amount: testData.rent.amount,
      propertyId: testData.property.id,
      rentPeriodStart: testData.rent.rentPeriodStart,
      rentPeriodEnd: testData.rent.rentPeriodEnd,
      description: testData.rent.description
    });
    await rentTx.wait();
    console.log('租金分配成功:', rentTx.hash);
    
    // 4. 创建赎回请求
    console.log('4. 创建赎回请求');
    const redemptionTx = await redemptionManager.createRedemption({
      tokenAddress: config.realEstateTokenAddress,
      amount: testData.redemption.amount,
      reason: testData.redemption.reason
    });
    await redemptionTx.wait();
    console.log('赎回请求创建成功:', redemptionTx.hash);
    
    // 5. 验证状态
    console.log('5. 验证状态');
    const propertyStatus = await propertyRegistry.getPropertyStatus(testData.property.id);
    const tokenInfo = await realEstateToken.getTokenInfo(testData.property.id);
    const distributionInfo = await rentDistributor.getDistribution(1); // 假设distributionId为1
    const redemptionInfo = await redemptionManager.getRedemption(1); // 假设redemptionId为1
    
    console.log('房产状态:', propertyStatus);
    console.log('代币信息:', tokenInfo);
    console.log('租金分配信息:', distributionInfo);
    console.log('赎回请求信息:', redemptionInfo);
    
    console.log('测试流程完成!');
    
  } catch (error) {
    console.error('测试流程失败:', error);
  }
}

// 运行测试
testPropertyFlow(); 