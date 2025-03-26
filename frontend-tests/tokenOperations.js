const { ethers } = require('ethers');
const { RealEstateTokenService } = require('../shared/services/realEstateTokenService');

// 测试配置
const config = {
  provider: new ethers.providers.Web3Provider(window.ethereum),
  tokenAddress: '0x...' // 需要替换为实际地址
};

// 初始化服务
const tokenService = new RealEstateTokenService(config.provider, config.tokenAddress);

// 测试数据
const testData = {
  from: '0x...', // 需要替换为实际地址
  to: '0x...',   // 需要替换为实际地址
  amount: ethers.utils.parseEther('1000'),
  spender: '0x...' // 需要替换为实际地址
};

// 代币操作测试
async function testTokenOperations() {
  try {
    console.log('开始测试代币操作...');
    
    // 1. 获取代币基本信息
    console.log('1. 获取代币基本信息');
    const name = await tokenService.getName();
    const symbol = await tokenService.getSymbol();
    const decimals = await tokenService.getDecimals();
    const totalSupply = await tokenService.getTotalSupply();
    
    console.log('代币名称:', name);
    console.log('代币符号:', symbol);
    console.log('代币精度:', decimals);
    console.log('总供应量:', ethers.utils.formatEther(totalSupply));
    
    // 2. 查询余额
    console.log('2. 查询余额');
    const balance = await tokenService.getBalance(testData.from);
    console.log('账户余额:', ethers.utils.formatEther(balance));
    
    // 3. 转账测试
    console.log('3. 转账测试');
    const transferTx = await tokenService.transfer(
      testData.to,
      testData.amount
    );
    await transferTx.wait();
    console.log('转账成功:', transferTx.hash);
    
    // 4. 授权测试
    console.log('4. 授权测试');
    const approveTx = await tokenService.approve(
      testData.spender,
      testData.amount
    );
    await approveTx.wait();
    console.log('授权成功:', approveTx.hash);
    
    // 5. 查询授权额度
    console.log('5. 查询授权额度');
    const allowance = await tokenService.getAllowance(
      testData.from,
      testData.spender
    );
    console.log('授权额度:', ethers.utils.formatEther(allowance));
    
    // 6. 增加授权额度
    console.log('6. 增加授权额度');
    const increaseTx = await tokenService.increaseAllowance(
      testData.spender,
      testData.amount
    );
    await increaseTx.wait();
    console.log('增加授权额度成功:', increaseTx.hash);
    
    // 7. 减少授权额度
    console.log('7. 减少授权额度');
    const decreaseTx = await tokenService.decreaseAllowance(
      testData.spender,
      testData.amount
    );
    await decreaseTx.wait();
    console.log('减少授权额度成功:', decreaseTx.hash);
    
    // 8. 代币暂停测试
    console.log('8. 代币暂停测试');
    const isPaused = await tokenService.isPaused();
    console.log('当前暂停状态:', isPaused);
    
    if (!isPaused) {
      const pauseTx = await tokenService.pause();
      await pauseTx.wait();
      console.log('代币暂停成功');
    }
    
    // 9. 代币恢复测试
    console.log('9. 代币恢复测试');
    const unpauseTx = await tokenService.unpause();
    await unpauseTx.wait();
    console.log('代币恢复成功');
    
    console.log('代币操作测试完成!');
    
  } catch (error) {
    console.error('代币操作测试失败:', error);
  }
}

// 运行测试
testTokenOperations(); 