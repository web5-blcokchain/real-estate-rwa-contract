// scripts/dump-token-factory.js
// 使用低级方法检查TokenFactory合约

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// 提取TokenFactory合约的ABI
async function extractABI() {
  try {
    // 尝试从构建目录获取
    const artifactPath = path.join(__dirname, '../artifacts/contracts/TokenFactory.sol/TokenFactory.json');
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      return artifact.abi;
    }
    
    // 如果找不到，尝试通过合约工厂获取
    try {
      const TokenFactory = await ethers.getContractFactory('TokenFactory');
      const abiInterface = TokenFactory.interface;
      // 返回接口
      return abiInterface;
    } catch (e) {
      console.error('无法从合约工厂获取ABI:', e.message);
    }
    
    // 最后一种方法：手动定义关键函数
    return [
      // 可能的视图函数
      "function tokenImplementation() view returns (address)",
      "function getTokenImplementation() view returns (address)",
      "function implementation() view returns (address)",
      "function getImplementation() view returns (address)",
      // 角色相关
      "function roleManager() view returns (address)",
      "function getRoleManager() view returns (address)",
      // 系统相关
      "function realEstateSystem() view returns (address)",
      "function getRealEstateSystem() view returns (address)",
      // 基本函数
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function owner() view returns (address)"
    ];
  } catch (e) {
    console.error('提取ABI失败:', e);
    // 返回一个最小ABI
    return [
      "function tokenImplementation() view returns (address)"
    ];
  }
}

async function main() {
  console.log('低级检查TokenFactory合约...\n');

  const [deployer] = await ethers.getSigners();
  console.log(`使用账户: ${deployer.address}`);
  
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
  
  // 确保地址格式正确
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
  
  // 检查TokenFactory是否是UUPS代理
  const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const implStorage = await ethers.provider.getStorage(tokenFactoryAddress, implSlot);
  
  if (implStorage !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    const implAddress = '0x' + implStorage.slice(-40);
    console.log(`TokenFactory是UUPS代理，实现合约地址: ${implAddress}`);
    
    // 检查实现合约代码
    const implCode = await ethers.provider.getCode(implAddress);
    
    if (implCode.length > 2) {
      console.log(`TokenFactory实现合约代码长度: ${implCode.length} 字节`);
    } else {
      console.log('TokenFactory实现合约没有代码，这是个问题!');
    }
  } else {
    console.log('TokenFactory不是UUPS代理合约，这是个问题!');
  }
  
  // 获取TokenFactory ABI
  console.log('\n尝试获取TokenFactory ABI...');
  const abi = await extractABI();
  
  // 使用ABI创建合约实例
  let tokenFactory;
  if (Array.isArray(abi)) {
    tokenFactory = new ethers.Contract(tokenFactoryAddress, abi, deployer);
    console.log(`使用手动ABI创建合约实例 (${abi.length} 个方法)`);
  } else {
    tokenFactory = new ethers.Contract(tokenFactoryAddress, abi, deployer);
    console.log('使用自动ABI创建合约实例');
  }
  
  // 检查合约的常见函数
  console.log('\n测试常见函数调用:');
  const testFunctions = [
    'tokenImplementation',
    'getTokenImplementation',
    'implementation',
    'getImplementation',
    'name',
    'symbol',
    'owner',
    'roleManager',
    'getRoleManager',
    'realEstateSystem',
    'getRealEstateSystem'
  ];
  
  for (const funcName of testFunctions) {
    if (tokenFactory.interface.hasFunction(funcName)) {
      try {
        const result = await tokenFactory[funcName]();
        console.log(`✅ ${funcName}() => ${result}`);
        
        // 如果返回值类似地址，检查它是否有代码
        if (typeof result === 'string' && result.startsWith('0x') && result.length === 42) {
          const resultCode = await ethers.provider.getCode(result);
          
          if (resultCode.length > 2) {
            console.log(`  地址有代码，代码长度: ${resultCode.length} 字节`);
            
            // 如果与记录的代币实现地址匹配
            if (recordedImplAddress && result.toLowerCase() === recordedImplAddress.toLowerCase()) {
              console.log(`  ✅ 匹配记录的代币实现地址!`);
            }
          } else {
            console.log(`  地址没有代码`);
          }
        }
      } catch (error) {
        console.log(`❌ ${funcName}() 调用失败: ${error.message}`);
      }
    } else {
      console.log(`- ${funcName}() 函数不存在`);
    }
  }
  
  // 低级检查：直接检查可能存储代币实现地址的存储槽
  console.log('\n检查可能存储代币实现地址的存储槽:');
  
  // 常见存储槽，可能包含实现地址
  const possibleSlots = [
    // 基本存储槽
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    // 特殊存储槽
    '0x0000000000000000000000000000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000000000000000000000000000002'
  ];
  
  // 如果有记录的代币实现地址，尝试找到存储它的槽
  if (recordedImplAddress) {
    const implAddressBytes = recordedImplAddress.toLowerCase().slice(2); // 移除0x前缀
    
    // 检查每个存储槽
    for (const slot of possibleSlots) {
      try {
        const value = await ethers.provider.getStorage(tokenFactoryAddress, slot);
        
        if (value.toLowerCase().includes(implAddressBytes)) {
          console.log(`✅ 找到存储槽 ${slot} 包含代币实现地址: ${value}`);
          // 提取地址
          const extractedAddress = '0x' + value.slice(-40);
          console.log(`  提取的地址: ${extractedAddress.toLowerCase()}`);
        } else if (value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          console.log(`存储槽 ${slot}: ${value}`);
        }
      } catch (error) {
        console.log(`读取存储槽 ${slot} 失败: ${error.message}`);
      }
    }
  } else {
    console.log('没有记录的代币实现地址用于比较');
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