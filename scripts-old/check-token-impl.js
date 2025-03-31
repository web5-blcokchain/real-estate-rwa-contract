// scripts/check-token-impl.js
// 检查TokenFactory合约中的代币实现地址

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('检查TokenFactory合约中的代币实现地址...\n');

  // 加载部署状态
  const deployStateFile = path.join(__dirname, 'deploy-state.json');
  if (!fs.existsSync(deployStateFile)) {
    console.error('部署状态文件不存在:', deployStateFile);
    return;
  }

  const deployState = JSON.parse(fs.readFileSync(deployStateFile, 'utf8'));
  
  // 获取TokenFactory地址
  let tokenFactoryAddress = deployState.tokenFactory || 
                          deployState.TokenFactory || 
                          (deployState.contracts && deployState.contracts.tokenFactory) ||
                          (deployState.contracts && deployState.contracts.TokenFactory);
  
  if (!tokenFactoryAddress) {
    console.error('无法找到TokenFactory地址');
    return;
  }
  
  // 确保地址格式正确（小写）
  tokenFactoryAddress = tokenFactoryAddress.toLowerCase();
  console.log(`TokenFactory合约地址: ${tokenFactoryAddress}`);
  
  // 获取记录的代币实现地址
  const recordedImplAddress = deployState.tokenImplementation || 
                            deployState.TokenImplementation || 
                            (deployState.implementations && deployState.implementations.RealEstateToken);
  
  if (recordedImplAddress) {
    console.log(`部署状态中记录的代币实现地址: ${recordedImplAddress.toLowerCase()}`);
  } else {
    console.log('部署状态中未找到代币实现地址');
  }
  
  // 检查TokenFactory合约代码
  const code = await ethers.provider.getCode(tokenFactoryAddress);
  
  if (code.length <= 2) {
    console.error('TokenFactory合约地址不包含代码');
    return;
  }
  
  console.log(`TokenFactory合约代码长度: ${code.length} 字节`);
  
  // 检查TokenFactory合约是否是代理合约
  const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const implStorage = await ethers.provider.getStorage(tokenFactoryAddress, implSlot);
  
  // UUPS代理实现地址检查
  if (implStorage !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    const implAddress = '0x' + implStorage.slice(-40);
    console.log(`TokenFactory是UUPS代理，实现合约地址: ${implAddress.toLowerCase()}`);
    
    // 检查实现合约代码
    const implCode = await ethers.provider.getCode(implAddress);
    
    if (implCode.length > 2) {
      console.log(`TokenFactory实现合约代码长度: ${implCode.length} 字节`);
      
      // 检查TokenFactory实现合约中可能存储的代币实现地址
      console.log('\n检查TokenFactory实现合约存储:');
    } else {
      console.log('TokenFactory实现合约没有代码，这是个问题!');
    }
  } else {
    console.log('TokenFactory不是UUPS代理合约，这是个问题!');
  }
  
  // 检查前100个存储槽，查找可能的合约地址
  console.log('\n检查TokenFactory存储槽:');
  
  let foundAddresses = 0;
  for (let i = 0; i < 100; i++) {
    const value = await ethers.provider.getStorage(tokenFactoryAddress, i);
    
    // 如果存储值不为0
    if (value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      // 如果看起来像地址（前24个字节为0）
      if (value.startsWith('0x000000000000000000000000')) {
        const possibleAddress = '0x' + value.slice(-40);
        
        // 检查地址是否有代码
        const addressCode = await ethers.provider.getCode(possibleAddress);
        
        if (addressCode.length > 2) {
          foundAddresses++;
          console.log(`✅ 存储槽 ${i}: ${value} -> 可能的合约地址: ${possibleAddress.toLowerCase()}`);
          
          // 检查这个地址是否匹配记录的代币实现地址
          if (recordedImplAddress && possibleAddress.toLowerCase() === recordedImplAddress.toLowerCase()) {
            console.log(`✅ 匹配记录的代币实现地址!`);
          }
          
          // 检查这个合约的代码大小
          console.log(`  代码长度: ${addressCode.length} 字节`);
        } else {
          console.log(`存储槽 ${i}: ${value} -> 像地址但没有代码: ${possibleAddress.toLowerCase()}`);
        }
      } else {
        console.log(`存储槽 ${i}: ${value}`);
      }
    }
  }
  
  if (foundAddresses === 0) {
    console.log('未找到任何可能的合约地址');
  }
  
  // 如果找到了代币实现地址，检查它的代码
  if (recordedImplAddress) {
    const implCode = await ethers.provider.getCode(recordedImplAddress);
    
    if (implCode.length > 2) {
      console.log(`\n代币实现合约代码长度: ${implCode.length} 字节`);
      console.log('✅ 代币实现合约有效');
      
      // 检查代币实现合约的初始化状态
      const storage0 = await ethers.provider.getStorage(recordedImplAddress, 0);
      const initialized = parseInt(storage0.substring(storage0.length - 2), 16) & 0xFF;
      
      if (initialized > 0) {
        console.log(`代币实现合约已初始化 (_initialized = ${initialized})`);
      } else {
        console.log(`代币实现合约未初始化 (_initialized = 0)`);
      }
    } else {
      console.log('\n❌ 代币实现合约没有代码!');
    }
  }
  
  console.log('\n检查完成.');
}

// 执行main函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} 