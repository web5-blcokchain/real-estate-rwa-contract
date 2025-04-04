// test-provider.js
// 用于测试Provider的创建

const dotenv = require('dotenv');
const { ethers } = require('ethers');

// 加载环境变量
dotenv.config();

// 显示环境变量
console.log('环境变量:');
console.log('BLOCKCHAIN_NETWORK =', process.env.BLOCKCHAIN_NETWORK);
console.log('RPC_URL =', process.env.RPC_URL);

// 直接使用ethers创建Provider
async function testDirectProvider() {
  try {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    console.log(`尝试直接使用ethers创建Provider，RPC URL: ${rpcUrl}`);
    
    // 创建Provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // 测试连接
    const network = await provider.getNetwork();
    console.log(`连接成功! 网络: ${network.name}, 链ID: ${network.chainId}`);
    
    // 获取区块号
    const blockNumber = await provider.getBlockNumber();
    console.log('当前区块号:', blockNumber);
    
    return 'Provider直接创建测试成功';
  } catch (error) {
    console.error('Provider直接创建测试失败:', error);
    return 'Provider直接创建测试失败: ' + error.message;
  }
}

// 运行测试
testDirectProvider()
  .then(result => console.log(result))
  .catch(error => console.error('运行测试出错:', error));
