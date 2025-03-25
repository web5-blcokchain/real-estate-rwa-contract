const { ethers } = require('ethers');
const contractService = require('../scripts/contractService');
const { testConfig } = require('../config');

/**
 * 房产流程测试
 * 测试从房产注册到代币化的完整流程
 */
async function testPropertyFlow() {
  console.log('开始测试房产流程...');
  
  try {
    // 1. 注册房产
    console.log('1. 注册房产...');
    const propertyRegistry = contractService.getPropertyRegistry('operator');
    const property = testConfig.testData.property;
    
    const tx = await propertyRegistry.registerProperty(
      property.id,
      property.name,
      property.location,
      property.price
    );
    
    const receipt = await tx.wait();
    console.log(`房产注册成功，交易哈希: ${receipt.transactionHash}`);
    
    // 2. 批准房产
    console.log('2. 批准房产...');
    const adminPropertyRegistry = contractService.getPropertyRegistry('admin');
    const approveTx = await adminPropertyRegistry.approveProperty(property.id);
    const approveReceipt = await approveTx.wait();
    console.log(`房产批准成功，交易哈希: ${approveReceipt.transactionHash}`);
    
    // 3. 创建代币
    console.log('3. 创建代币...');
    const tokenFactory = contractService.getTokenFactory('admin');
    const createTokenTx = await tokenFactory.createToken(
      property.id,
      property.tokenName,
      property.tokenSymbol,
      property.totalSupply
    );
    const createTokenReceipt = await createTokenTx.wait();
    console.log(`代币创建成功，交易哈希: ${createTokenReceipt.transactionHash}`);
    
    // 4. 获取代币地址
    const tokenAddress = await tokenFactory.getTokenForProperty(property.id);
    console.log(`代币地址: ${tokenAddress}`);
    
    // 5. 添加用户到白名单
    console.log('5. 添加用户到白名单...');
    const token = contractService.getToken(tokenAddress, 'operator');
    const userAddress = await contractService.signers.user.getAddress();
    const whitelistTx = await token.addToWhitelist(userAddress);
    const whitelistReceipt = await whitelistTx.wait();
    console.log(`用户添加到白名单成功，交易哈希: ${whitelistReceipt.transactionHash}`);
    
    console.log('房产流程测试成功!');
    return true;
  } catch (error) {
    console.error('房产流程测试失败:', error);
    return false;
  }
}

module.exports = testPropertyFlow; 