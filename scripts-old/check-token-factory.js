// scripts/check-token-factory.js
// 检查TokenFactory合约的接口和方法

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('检查TokenFactory合约接口...\n');

  // 加载部署状态
  const deployStateFile = path.join(__dirname, 'deploy-state.json');
  if (!fs.existsSync(deployStateFile)) {
    console.error('部署状态文件不存在:', deployStateFile);
    return;
  }

  const deployState = JSON.parse(fs.readFileSync(deployStateFile, 'utf8'));
  
  // 获取TokenFactory地址
  const tokenFactoryAddress = deployState.tokenFactory || 
                              deployState.TokenFactory || 
                              (deployState.contracts && deployState.contracts.tokenFactory) ||
                              (deployState.contracts && deployState.contracts.TokenFactory);
  
  if (!tokenFactoryAddress) {
    console.error('无法找到TokenFactory地址');
    return;
  }
  
  console.log(`TokenFactory合约地址: ${tokenFactoryAddress}`);
  
  try {
    // 检查合约代码
    const code = await ethers.provider.getCode(tokenFactoryAddress);
    if (code.length <= 2) {
      console.error('合约地址不包含代码');
      return;
    }
    
    console.log(`合约代码长度: ${code.length} 字节`);
    
    // 获取合约工厂和实例
    const TokenFactory = await ethers.getContractFactory('TokenFactory');
    const tokenFactory = TokenFactory.attach(tokenFactoryAddress);
    
    // 检查接口
    console.log('\n合约接口:');
    
    // 使用更安全的方式获取函数信息
    const functions = [];
    for (const fnName in tokenFactory.interface.functions) {
      if (fnName.includes('(')) {
        const fn = tokenFactory.interface.functions[fnName];
        functions.push({
          name: fn.name,
          inputs: fn.inputs,
          outputs: fn.outputs,
          stateMutability: fn.stateMutability
        });
      }
    }
    
    console.log(`发现 ${functions.length} 个函数:`);
    functions.forEach((func, index) => {
      const inputs = func.inputs.map(input => `${input.type} ${input.name}`).join(', ');
      const outputs = func.outputs.map(output => output.type).join(', ');
      console.log(`${index + 1}. ${func.name}(${inputs}) -> (${outputs}) [${func.stateMutability}]`);
    });
    
    // 查找可能与代币实现相关的函数
    console.log('\n可能与代币实现相关的函数:');
    const implFunctions = functions.filter(func => 
      func.name.toLowerCase().includes('implementation') || 
      func.name.toLowerCase().includes('token') ||
      func.name.toLowerCase().includes('impl')
    );
    
    if (implFunctions.length === 0) {
      console.log('未找到与代币实现相关的函数');
    } else {
      implFunctions.forEach((func, index) => {
        const inputs = func.inputs.map(input => `${input.type} ${input.name}`).join(', ');
        const outputs = func.outputs.map(output => output.type).join(', ');
        console.log(`${index + 1}. ${func.name}(${inputs}) -> (${outputs}) [${func.stateMutability}]`);
      });
      
      // 尝试调用这些函数
      console.log('\n尝试调用相关函数:');
      for (const func of implFunctions) {
        if (func.inputs.length === 0 && func.stateMutability === 'view') {
          try {
            const result = await tokenFactory[func.name]();
            console.log(`${func.name}() => ${result}`);
          } catch (error) {
            console.log(`${func.name}() 调用失败: ${error.message}`);
          }
        }
      }
    }
    
    // 检查合约的存储
    console.log('\n检查合约存储:');
    
    // 检查前20个存储槽，查找可能存储代币实现地址的槽
    for (let i = 0; i < 20; i++) {
      const value = await ethers.provider.getStorage(tokenFactoryAddress, i);
      if (value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log(`存储槽 ${i}: ${value}`);
        
        // 如果看起来像地址(以0x开头的40位十六进制)
        if (value.startsWith('0x000000000000000000000000')) {
          const possibleAddress = '0x' + value.slice(26);
          const code = await ethers.provider.getCode(possibleAddress);
          
          if (code.length > 2) {
            console.log(`  ➤ 可能的合约地址: ${possibleAddress} (有代码)`);
          }
        }
      }
    }
    
    // 使用之前的检查结果
    const tokenImplAddress = deployState.tokenImplementation || 
                             deployState.TokenImplementation || 
                             (deployState.implementations && deployState.implementations.RealEstateToken);
    
    if (tokenImplAddress) {
      console.log(`\n部署状态中记录的代币实现地址: ${tokenImplAddress}`);
      
      // 检查这个地址的代码
      const implCode = await ethers.provider.getCode(tokenImplAddress);
      
      if (implCode.length > 2) {
        console.log(`代币实现合约代码长度: ${implCode.length} 字节`);
        console.log('✅ 代币实现合约有效');
        
        // 加载代币实现合约
        try {
          const TokenImpl = await ethers.getContractFactory('RealEstateToken');
          const tokenImpl = TokenImpl.attach(tokenImplAddress);
          
          console.log('\n代币实现合约接口:');
          
          // 使用更安全的方式获取函数信息
          const tokenFunctions = [];
          for (const fnName in tokenImpl.interface.functions) {
            if (fnName.includes('(')) {
              const fn = tokenImpl.interface.functions[fnName];
              tokenFunctions.push({
                name: fn.name,
                inputs: fn.inputs,
                outputs: fn.outputs,
                stateMutability: fn.stateMutability
              });
            }
          }
          
          console.log(`发现 ${tokenFunctions.length} 个函数:`);
          const basicFunctions = tokenFunctions.filter(func => 
            ['name', 'symbol', 'decimals', 'totalSupply', 'balanceOf', 'transfer'].includes(func.name)
          );
          
          basicFunctions.forEach((func, index) => {
            const inputs = func.inputs.map(input => `${input.type} ${input.name}`).join(', ');
            const outputs = func.outputs.map(output => output.type).join(', ');
            console.log(`${index + 1}. ${func.name}(${inputs}) -> (${outputs}) [${func.stateMutability}]`);
          });
          
          // 查询基本信息
          if (basicFunctions.some(f => f.name === 'name')) {
            try {
              const name = await tokenImpl.name();
              console.log(`代币名称: ${name}`);
            } catch (err) {
              console.log(`获取代币名称失败: ${err.message}`);
            }
          }
          
          if (basicFunctions.some(f => f.name === 'symbol')) {
            try {
              const symbol = await tokenImpl.symbol();
              console.log(`代币符号: ${symbol}`);
            } catch (err) {
              console.log(`获取代币符号失败: ${err.message}`);
            }
          }
        } catch (err) {
          console.log(`加载代币实现合约失败: ${err.message}`);
        }
      } else {
        console.log('❌ 代币实现合约没有代码');
      }
    } else {
      console.log('\n未找到部署状态中的代币实现地址');
    }
  } catch (error) {
    console.error('检查TokenFactory合约失败:', error);
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