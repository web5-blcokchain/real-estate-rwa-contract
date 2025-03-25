const { ethers } = require('ethers');
const contractService = require('../scripts/contractService');
const { testConfig } = require('../config');

/**
 * 租金分配测试
 * 测试租金分配和领取流程
 */
async function testRentDistribution() {
  console.log('开始测试租金分配流程...');
  
  try {
    // 1. 获取代币地址
    console.log('1. 获取代币地址...');
    const propertyId = testConfig.testData.property.id;
    const tokenFactory = contractService.getTokenFactory();
    const tokenAddress = await tokenFactory.getTokenForProperty(propertyId);
    
    if (!tokenAddress || tokenAddress === ethers.constants.AddressZero) {
      throw new Error(`未找到房产 ${propertyId} 的代币`);
    }
    
    console.log(`代币地址: ${tokenAddress}`);
    
    // 2. 分配租金
    console.log('2. 分配租金...');
    const rentDistributor = contractService.getRentDistributor('finance');
    const rentAmount = testConfig.testData.rent.amount;
    
    const distributeTx = await rentDistributor.distributeRent(
      tokenAddress,
      { value: rentAmount }
    );
    const distributeReceipt = await distributeTx.wait();
    
    // 从事件中获取分配ID
    const rentDistributedEvent = distributeReceipt.events.find(e => e.event === 'RentDistributed');
    const distributionId = rentDistributedEvent.args.distributionId;
    console.log(`租金分配成功，分配ID: ${distributionId}`);
    
    // 3. 用户领取租金
    console.log('3. 用户领取租金...');
    const userRentDistributor = contractService.getRentDistributor('user');
    const userAddress = await contractService.signers.user.getAddress();
    
    // 获取用户可领取的租金
    const claimableTx = await userRentDistributor.claimRent(distributionId);
    const claimableReceipt = await claimableTx.wait();
    console.log(`租金领取成功，交易哈希: ${claimableReceipt.transactionHash}`);
    
    console.log('租金分配测试成功!');
    return true;
  } catch (error) {
    console.error('租金分配测试失败:', error);
    return false;
  }
}

module.exports = testRentDistribution; 