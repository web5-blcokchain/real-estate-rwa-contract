const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // 加载部署状态
    const deployStatePath = path.join(__dirname, 'deploy-state.json');
    
    let deployState;
    try {
      if (fs.existsSync(deployStatePath)) {
        deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf8'));
        console.log('成功加载部署状态文件');
      } else {
        console.log(`部署状态文件不存在: ${deployStatePath}`);
        deployState = {};
      }
    } catch (error) {
      console.error(`加载部署状态失败: ${error.message}`);
      deployState = {};
    }
    
    // 检查RoleManager合约
    const roleManagerAddress = deployState.roleManager;
    console.log(`RoleManager合约地址: ${roleManagerAddress}`);
    const roleManagerCode = await ethers.provider.getCode(roleManagerAddress);
    console.log(`RoleManager合约代码长度: ${roleManagerCode.length}`);
    console.log(`RoleManager合约是否有代码: ${roleManagerCode.length > 2}`);
    
    // 检查PropertyRegistry合约
    const propertyRegistryAddress = deployState.propertyRegistry;
    console.log(`\nPropertyRegistry合约地址: ${propertyRegistryAddress}`);
    const propertyRegistryCode = await ethers.provider.getCode(propertyRegistryAddress);
    console.log(`PropertyRegistry合约代码长度: ${propertyRegistryCode.length}`);
    console.log(`PropertyRegistry合约是否有代码: ${propertyRegistryCode.length > 2}`);
    
    // 检查RoleManager实现合约
    const roleManagerImpl = deployState.implementations.roleManager;
    console.log(`\nRoleManager实现合约地址: ${roleManagerImpl}`);
    const roleManagerImplCode = await ethers.provider.getCode(roleManagerImpl);
    console.log(`RoleManager实现合约代码长度: ${roleManagerImplCode.length}`);
    console.log(`RoleManager实现合约是否有代码: ${roleManagerImplCode.length > 2}`);
    
    // 检查PropertyRegistry实现合约
    const propertyRegistryImpl = deployState.implementations.propertyRegistry;
    console.log(`\nPropertyRegistry实现合约地址: ${propertyRegistryImpl}`);
    const propertyRegistryImplCode = await ethers.provider.getCode(propertyRegistryImpl);
    console.log(`PropertyRegistry实现合约代码长度: ${propertyRegistryImplCode.length}`);
    console.log(`PropertyRegistry实现合约是否有代码: ${propertyRegistryImplCode.length > 2}`);
    
    // 检查TokenFactory合约
    try {
      const tokenFactoryAddress = deployState.tokenFactoryProxy;
      if (tokenFactoryAddress) {
        console.log(`TokenFactory合约地址: ${tokenFactoryAddress}`);
        const tokenFactoryCode = await ethers.provider.getCode(tokenFactoryAddress);
        console.log(`TokenFactory合约代码长度: ${tokenFactoryCode.length}`);
        console.log(`TokenFactory合约是否有代码: ${tokenFactoryCode.length > 2}`);
      } else {
        console.log('TokenFactory代理地址未在部署状态文件中找到');
      }
      
      const tokenFactoryImplAddress = deployState.tokenFactory;
      if (tokenFactoryImplAddress) {
        console.log(`\nTokenFactory实现合约地址: ${tokenFactoryImplAddress}`);
        const tokenFactoryImplCode = await ethers.provider.getCode(tokenFactoryImplAddress);
        console.log(`TokenFactory实现合约代码长度: ${tokenFactoryImplCode.length}`);
        console.log(`TokenFactory实现合约是否有代码: ${tokenFactoryImplCode.length > 2}`);
      } else {
        console.log('TokenFactory实现地址未在部署状态文件中找到');
      }
    } catch (error) {
      console.log(`检查TokenFactory合约代码时出错: ${error.message}`);
    }
    
    // 获取交易收据和使用的gas
    console.log(`\n检查最近的区块和交易...`);
    const latestBlock = await ethers.provider.getBlock("latest");
    console.log(`最新区块号: ${latestBlock.number}`);
    
    if (latestBlock.transactions.length > 0) {
      for (const txHash of latestBlock.transactions.slice(-3)) { // 只检查最近的三个交易
        console.log(`检查交易: ${txHash}`);
        try {
          const tx = await ethers.provider.getTransaction(txHash);
          const receipt = await ethers.provider.getTransactionReceipt(txHash);
          
          console.log(`交易发送者: ${tx.from}`);
          console.log(`交易接收者: ${tx.to}`);
          console.log(`交易状态: ${receipt.status ? '成功' : '失败'}`);
          console.log(`使用的gas: ${receipt.gasUsed}`);
          
          // 如果交易失败，尝试获取更多信息
          if (!receipt.status) {
            console.log(`交易数据: ${tx.data.slice(0, 10)}...`); // 只显示函数选择器
            
            try {
              // 尝试重放交易以获取错误信息
              const code = await ethers.provider.call(
                {
                  from: tx.from,
                  to: tx.to,
                  data: tx.data,
                  gasLimit: tx.gasLimit
                },
                tx.blockNumber
              );
              console.log(`交易重放结果: 成功，返回数据: ${code}`);
            } catch (error) {
              console.log(`交易失败原因: ${error.reason || error.message}`);
            }
          }
          
          console.log('-'.repeat(50));
        } catch (error) {
          console.log(`获取交易详情失败: ${error.message}`);
        }
      }
    } else {
      console.log('该区块没有交易。');
    }
    
  } catch (error) {
    console.error('检查合约代码时出错:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 