// scripts/check-contract-init.js
// 检查合约初始化状态

const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');

// 检查合约代码存在性
async function checkContractExists(address) {
  try {
    const code = await ethers.provider.getCode(address);
    const exists = code.length > 2; // "0x" 表示非合约地址
    console.log(`合约代码长度: ${code.length}, 代码存在: ${exists}`);
    return exists;
  } catch (error) {
    console.error(`检查合约代码失败: ${error.message}`);
    return false;
  }
}

// 检查是否是代理合约
async function checkProxyStatus(address) {
  try {
    // 使用ERC-1967定义的存储槽直接检查
    // 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
    // 这是UUPS代理的实现地址存储槽
    const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    const implStorage = await ethers.provider.getStorage(address, implSlot);
    
    // 如果存储槽是空的，则不是代理合约或未初始化
    if (implStorage === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log(`ℹ️ 地址 ${address} 不是代理合约或未初始化`);
      return false;
    }
    
    // 从存储数据中提取实现合约地址（移除前12个字节的补0）
    const implAddress = '0x' + implStorage.slice(26);
    console.log(`✅ 地址 ${address} 是一个代理合约`);
    console.log(`✅ 实现合约地址: ${implAddress}`);
    
    // 检查实现合约代码是否存在
    const implExists = await checkContractExists(implAddress);
    if (implExists) {
      console.log(`✅ 实现合约代码存在`);
    } else {
      console.log(`❌ 实现合约代码不存在!`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ 检查代理状态失败: ${error.message}`);
    return false;
  }
}

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
  console.log('加载的部署状态:');
  console.log('合约地址:', JSON.stringify(deployState.contracts || {}, null, 2));
  console.log('实现合约:', JSON.stringify(deployState.implementations || {}, null, 2));
  
  // 检查合约的数据
  console.log('\n===================== 检查代理合约和实现合约 =====================\n');
  
  // 检查所有合约
  const proxyContracts = {
    ...(deployState.contracts || {}),
    ...Object.fromEntries(
      Object.entries(deployState)
        .filter(([key, value]) => 
          typeof value === 'string' && 
          value.startsWith('0x') && 
          key !== 'contracts' && 
          key !== 'implementations' && 
          key !== 'tokenImplementation' &&
          key !== 'TokenImplementation'
        )
    )
  };
  
  // 检查所有代理合约
  for (const [name, address] of Object.entries(proxyContracts)) {
    console.log(`\n检查合约 ${name} (${address}):`);
    
    // 检查合约代码存在性
    const exists = await checkContractExists(address);
    if (!exists) {
      console.log(`❌ 合约 ${name} 代码不存在，跳过进一步检查`);
      continue;
    }
    
    // 检查是否是代理合约
    const isProxy = await checkProxyStatus(address);
    
    // 如果是代理合约，尝试加载合约
    if (isProxy) {
      try {
        // 尝试获取对应的合约工厂
        console.log(`尝试加载合约 ${name}...`);
        
        let contractFactory;
        try {
          // 推测合约名称（首字母大写）
          const contractName = name.charAt(0).toUpperCase() + name.slice(1);
          contractFactory = await ethers.getContractFactory(contractName);
          console.log(`✅ 成功加载合约工厂 ${contractName}`);
        } catch (factoryErr) {
          console.log(`❌ 无法加载合约工厂: ${factoryErr.message}`);
          continue;
        }
        
        // 附加到合约地址
        const contract = contractFactory.attach(address);
        
        // 尝试检查合约是否已初始化
        console.log('检查合约初始化状态...');
        
        // 这里可以添加特定于合约的检查逻辑
        // 例如，对于RoleManager，可以检查是否有默认角色设置
        if (name.toLowerCase().includes('rolemanager')) {
          try {
            const defaultAdmin = await contract.DEFAULT_ADMIN_ROLE();
            console.log(`✅ 获取到DEFAULT_ADMIN_ROLE: ${defaultAdmin}`);
          } catch (err) {
            console.log(`❌ 无法获取DEFAULT_ADMIN_ROLE: ${err.message}`);
          }
        }
        
        // 对于系统合约，可以检查是否设置了子系统
        if (name.toLowerCase().includes('realestate') && name.toLowerCase().includes('system')) {
          try {
            const contracts = await contract.getSystemContracts();
            console.log(`✅ 获取到系统合约引用: ${contracts.length} 个子系统`);
            
            // 打印每个子系统的地址
            for (let i = 0; i < contracts.length; i++) {
              console.log(`  子系统 ${i}: ${contracts[i]}`);
            }
          } catch (err) {
            console.log(`❌ 无法获取系统合约引用: ${err.message}`);
          }
        }
        
        // 对于TokenFactory，检查是否设置了代币实现
        if (name.toLowerCase().includes('tokenfactory')) {
          const tokenImplAddress = deployState.tokenImplementation || 
                                  deployState.TokenImplementation ||
                                  (deployState.implementations && deployState.implementations.RealEstateToken);
          
          if (tokenImplAddress) {
            console.log(`ℹ️ 部署状态中记录的代币实现地址: ${tokenImplAddress}`);
            
            // 尝试获取当前设置
            try {
              const currentImpl = await contract.tokenImplementation();
              console.log(`✅ TokenFactory当前设置的实现地址: ${currentImpl}`);
              
              if (currentImpl.toLowerCase() === tokenImplAddress.toLowerCase()) {
                console.log(`✅ 当前设置与部署状态匹配`);
              } else {
                console.log(`❌ 当前设置与部署状态不匹配!`);
              }
            } catch (err) {
              console.log(`❌ 无法获取当前代币实现地址: ${err.message}`);
            }
          } else {
            console.log(`❌ 未在部署状态中找到代币实现地址`);
          }
        }
      } catch (err) {
        console.log(`❌ 加载合约失败: ${err.message}`);
      }
    }
  }
  
  // 检查代币实现合约
  const tokenImplAddress = deployState.tokenImplementation || 
                          deployState.TokenImplementation || 
                          (deployState.implementations && deployState.implementations.RealEstateToken);
  
  if (tokenImplAddress) {
    console.log(`\n\n检查代币实现合约 (${tokenImplAddress}):`);
    
    // 检查合约代码存在性
    const exists = await checkContractExists(tokenImplAddress);
    if (!exists) {
      console.log(`❌ 代币实现合约代码不存在，跳过进一步检查`);
    } else {
      // 检查是否是代理合约（一般不是）
      await checkProxyStatus(tokenImplAddress);
      
      // 尝试加载合约
      try {
        console.log('尝试加载代币实现合约...');
        const TokenImpl = await ethers.getContractFactory('RealEstateToken');
        const tokenImpl = TokenImpl.attach(tokenImplAddress);
        
        // 尝试获取基本ERC20信息
        console.log('尝试获取ERC20基本信息:');
        const basicInfo = [
          { name: 'name', label: '代币名称' },
          { name: 'symbol', label: '代币符号' },
          { name: 'decimals', label: '小数位数' },
          { name: 'totalSupply', label: '总供应量' }
        ];
        
        for (const info of basicInfo) {
          try {
            const result = await tokenImpl[info.name]();
            console.log(`✅ ${info.label}: ${result.toString()}`);
          } catch (err) {
            console.log(`❌ 无法获取${info.label}: ${err.message}`);
          }
        }
      } catch (err) {
        console.log(`❌ 加载代币实现合约失败: ${err.message}`);
      }
    }
  } else {
    console.log('\n❌ 未找到代币实现合约地址');
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