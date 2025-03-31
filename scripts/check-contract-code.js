const { ethers } = require('hardhat');

async function main() {
  try {
    // 获取合约地址
    const deployState = require('./deploy-state.json');
    
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
    
    // 获取交易收据和使用的gas
    console.log(`\n检查最近的区块和交易...`);
    const latestBlock = await ethers.provider.getBlock("latest");
    console.log(`最新区块号: ${latestBlock.number}`);
    
    if (latestBlock.transactions.length > 0) {
      const txHash = latestBlock.transactions[0];
      console.log(`检查交易: ${txHash}`);
      const tx = await ethers.provider.getTransaction(txHash);
      console.log(`交易发送者: ${tx.from}`);
      console.log(`交易接收者: ${tx.to}`);
      
      const receipt = await ethers.provider.getTransactionReceipt(txHash);
      console.log(`交易状态: ${receipt.status === 1 ? '成功' : '失败'}`);
      console.log(`使用的gas: ${receipt.gasUsed.toString()}`);
    } else {
      console.log(`最新区块中没有交易`);
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