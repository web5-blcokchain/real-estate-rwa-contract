// scripts/check-initialized.js
// 检查合约是否已初始化（通过检查OpenZeppelin的Initializable合约的_initialized变量）

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// 主函数
async function main() {
  console.log('检查合约初始化状态...\n');

  // 连接到节点
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`当前连接的网络区块号：${blockNumber}`);
  const network = await ethers.provider.getNetwork();
  console.log(`当前网络: ${network.name} (Chain ID: ${network.chainId})\n`);

  // 加载部署状态
  const deployStateFile = path.join(__dirname, 'deploy-state.json');
  if (!fs.existsSync(deployStateFile)) {
    console.error('部署状态文件不存在:', deployStateFile);
    return;
  }

  const deployState = JSON.parse(fs.readFileSync(deployStateFile, 'utf8'));
  
  // 准备检查的合约地址
  const contracts = {
    ...(deployState.contracts || {}),
    // 兼容旧格式
    ...Object.fromEntries(
      Object.entries(deployState)
        .filter(([key, value]) => 
          typeof value === 'string' && 
          value.startsWith('0x') && 
          key !== 'contracts' && 
          key !== 'implementations'
        )
    )
  };

  console.log('检查所有代理合约的初始化状态...');
  
  // 检查每个合约
  for (const [name, address] of Object.entries(contracts)) {
    // 跳过库合约和代币实现合约
    if (name === 'SystemDeployerLib1' || name === 'SystemDeployerLib2' || 
        name === 'tokenImplementation' || name === 'TokenImplementation') {
      continue;
    }
    
    console.log(`\n检查 ${name} (${address}):`);
    
    // 检查合约代码是否存在
    const code = await ethers.provider.getCode(address);
    const exists = code.length > 2;
    
    if (!exists) {
      console.log(`❌ 合约代码不存在`);
      continue;
    }
    
    // 检查初始化状态
    // OpenZeppelin的Initializable合约将_initialized和_initializing变量存储在storage slot 0
    // 格式: uint8 private _initialized; bool private _initializing;
    // 在存储中，它们被打包成一个字: [_initializing (1 bit)][_initialized (8 bits)]...
    const storage0 = await ethers.provider.getStorage(address, 0);
    
    // 解析状态：在storage0的最低字节的最低位是_initializing，次低位到第9位是_initialized
    const initialized = parseInt(storage0.substring(storage0.length - 2), 16) & 0xFF;
    const initializing = (parseInt(storage0.substring(storage0.length - 4, storage0.length - 2), 16) & 0x01) === 1;
    
    if (initialized > 0) {
      console.log(`✅ 已初始化 (_initialized = ${initialized})`);
      
      if (initialized === 1) {
        console.log(`ℹ️ 合约已初始化一次`);
      } else if (initialized > 1) {
        console.log(`ℹ️ 合约已初始化多次（可重入初始化模式）`);
      }
    } else {
      console.log(`❌ 未初始化 (_initialized = 0)`);
    }
    
    if (initializing) {
      console.log(`⚠️ 正在初始化过程中 (_initializing = true)`);
    }
    
    // 检查是否是UUPS代理
    const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    const implStorage = await ethers.provider.getStorage(address, implSlot);
    
    if (implStorage !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const implAddress = '0x' + implStorage.slice(-40);
      console.log(`✅ 是UUPS代理，实现合约: ${implAddress}`);
      
      // 检查实现合约的初始化状态
      const implStorage0 = await ethers.provider.getStorage(implAddress, 0);
      const implInitialized = parseInt(implStorage0.substring(implStorage0.length - 2), 16) & 0xFF;
      
      if (implInitialized > 0) {
        console.log(`ℹ️ 实现合约本身已初始化 (_initialized = ${implInitialized})`);
      } else {
        console.log(`ℹ️ 实现合约本身未初始化 (_initialized = 0)`);
      }
    } else {
      console.log(`ℹ️ 不是UUPS代理`);
    }
    
    // 如果是TokenFactory，检查是否设置了代币实现地址
    if (name.toLowerCase().includes('tokenfactory')) {
      try {
        const TokenFactory = await ethers.getContractFactory('TokenFactory');
        const tokenFactory = TokenFactory.attach(address);
        
        // 检查代币实现设置
        try {
          const implAddress = await tokenFactory.tokenImplementation();
          console.log(`✅ 已设置代币实现地址: ${implAddress}`);
          
          // 检查代币实现合约的代码
          const implCode = await ethers.provider.getCode(implAddress);
          if (implCode.length > 2) {
            console.log(`✅ 代币实现合约代码存在`);
          } else {
            console.log(`❌ 代币实现合约代码不存在!`);
          }
        } catch (err) {
          console.log(`❌ 无法获取代币实现地址: ${err.message}`);
        }
      } catch (err) {
        console.log(`❌ 无法加载TokenFactory合约: ${err.message}`);
      }
    }
  }
  
  console.log('\n检查完成.');
}

// 执行主函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} 