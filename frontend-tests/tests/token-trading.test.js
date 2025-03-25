const { ethers } = require('ethers');
const contractService = require('../scripts/contractService');
const { testConfig } = require('../config');

/**
 * 代币交易测试
 * 测试代币的买卖流程
 */
async function testTokenTrading() {
  console.log('开始测试代币交易流程...');
  
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
    
    // 2. 创建卖单
    console.log('2. 创建卖单...');
    const marketplace = contractService.getMarketplace('admin');
    const token = contractService.getToken(tokenAddress, 'admin');
    
    // 先批准市场合约使用代币
    const approveTx = await token.approve(
      contractService.contractAddresses.marketplace,
      testConfig.testData.token.amount
    );
    await approveTx.wait();
    
    // 创建卖单
    const createOrderTx = await marketplace.createSellOrder(
      tokenAddress,
      testConfig.testData.token.amount,
      testConfig.testData.token.price
    );
    const createOrderReceipt = await createOrderTx.wait();
    
    // 从事件中获取订单ID
    const orderCreatedEvent = createOrderReceipt.events.find(e => e.event === 'OrderCreated');
    const orderId = orderCreatedEvent.args.orderId;
    console.log(`卖单创建成功，订单ID: ${orderId}`);
    
    // 3. 用户购买代币
    console.log('3. 用户购买代币...');
    const userMarketplace = contractService.getMarketplace('user');
    
    // 计算订单总价
    const orderInfo = await marketplace.getOrder(orderId);
    const totalPrice = orderInfo.price;
    
    // 购买订单
    const buyTx = await userMarketplace.fillOrder(orderId, { value: totalPrice });
    const buyReceipt = await buyTx.wait();
    console.log(`代币购买成功，交易哈希: ${buyReceipt.transactionHash}`);
    
    // 4. 验证用户余额
    const userToken = contractService.getToken(tokenAddress);
    const userAddress = await contractService.signers.user.getAddress();
    const userBalance = await userToken.balanceOf(userAddress);
    console.log(`用户代币余额: ${ethers.utils.formatEther(userBalance)}`);
    
    console.log('代币交易测试成功!');
    return true;
  } catch (error) {
    console.error('代币交易测试失败:', error);
    return false;
  }
}

module.exports = testTokenTrading; 