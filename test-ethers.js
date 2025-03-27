const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function testEthers() {
  console.log('Testing ethers v6 contract instantiation...');
  
  // 创建本地provider
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  
  // 加载账户
  const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  console.log('Using wallet address:', await wallet.getAddress());
  
  // 加载ABI
  const abiPath = path.join(__dirname, 'contracts/artifacts/PropertyRegistry.json');
  console.log('Loading ABI from:', abiPath);
  const artifactJson = fs.readFileSync(abiPath, 'utf8');
  const artifact = JSON.parse(artifactJson);
  
  console.log('ABI loaded, contains', artifact.abi.length, 'items');
  
  // 遍历ABI检查函数
  console.log('\nABI functions:');
  const abiFunctions = artifact.abi.filter(item => item.type === 'function');
  abiFunctions.forEach(func => {
    console.log(`- ${func.name}: ${func.stateMutability}`);
  });
  
  // 示例合约地址
  const contractAddress = '0xfaee537b36CCaBB7830a2E53E190EEE4132dF064';
  
  // 创建合约实例
  console.log('\nCreating contract instance for:', contractAddress);
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
  
  console.log('Contract instance created, type:', typeof contract);
  console.log('Contract has interface property:', Boolean(contract.interface));
  
  // 安全地检查interface属性
  if (contract.interface) {
    console.log('\nInspecting interface:');
    
    // 检查函数
    if (contract.interface.functions) {
      console.log('Interface has functions property:', Boolean(contract.interface.functions));
      const functionNames = Object.keys(contract.interface.functions || {});
      console.log('Function names:', functionNames);
    } else {
      console.log('Interface does not have functions property');
    }
    
    // 尝试访问其他属性
    console.log('\nInterface properties:');
    for (const prop in contract.interface) {
      console.log(`- ${prop}: ${typeof contract.interface[prop]}`);
    }
  }
  
  // 打印合约方法
  console.log('\nContract direct properties and methods:');
  for (const prop in contract) {
    const type = typeof contract[prop];
    console.log(`- ${prop}: ${type}`);
  }
  
  // 尝试直接调用方法
  console.log('\nTesting direct method calls:');
  
  // 测试registerProperty方法
  try {
    console.log('Testing if "registerProperty" exists:', 'registerProperty' in contract);
    if ('registerProperty' in contract) {
      console.log('Type of registerProperty:', typeof contract.registerProperty);
    }
    
    // 尝试直接构造方法名
    for (const func of abiFunctions) {
      console.log(`Testing if "${func.name}" exists:`, func.name in contract);
      if (func.name in contract) {
        console.log(`Type of ${func.name}:`, typeof contract[func.name]);
      }
    }
  } catch (error) {
    console.error('Error inspecting contract methods:', error.message);
  }
}

// 执行测试
testEthers().then(() => {
  console.log('Test completed');
}).catch(error => {
  console.error('Test failed:', error);
}); 