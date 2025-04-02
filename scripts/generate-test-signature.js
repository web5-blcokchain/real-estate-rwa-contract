const { ethers } = require('ethers');

async function generateTestSignature() {
  try {
    // 创建一个随机钱包
    const wallet = ethers.Wallet.createRandom();
    console.log('测试钱包地址:', wallet.address);
    console.log('测试私钥:', wallet.privateKey);
    
    // 测试消息
    const message = 'Hello, World!';
    
    // 签名消息
    const signature = await wallet.signMessage(message);
    console.log('测试消息:', message);
    console.log('测试签名:', signature);
    
    // 验证签名
    const recoveredAddress = ethers.verifyMessage(message, signature);
    console.log('恢复的地址:', recoveredAddress);
    console.log('签名验证:', recoveredAddress === wallet.address ? '成功' : '失败');
    
    // 输出测试数据
    console.log('\n测试数据:');
    console.log('const testWallet = {');
    console.log(`  address: '${wallet.address}',`);
    console.log(`  privateKey: '${wallet.privateKey}',`);
    console.log(`  message: '${message}',`);
    console.log(`  signature: '${signature}'`);
    console.log('};');
    
  } catch (error) {
    console.error('生成签名时出错:', error);
  }
}

generateTestSignature(); 