/**
 * 检查合约地址是否真的存在
 */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('检查合约地址是否存在代码...\n');
  
  // 加载deploy-state.json
  const deployStatePath = path.join(__dirname, 'deploy-state.json');
  const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf8'));
  
  // 获取当前网络的Block Number，确认连接正常
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`当前连接的网络区块号：${blockNumber}`);
  
  // 获取当前链ID
  const network = await ethers.provider.getNetwork();
  console.log(`当前网络: ${network.name} (Chain ID: ${network.chainId})\n`);
  
  // 首先检查库合约
  if (deployState.SystemDeployerLib1) {
    const code = await ethers.provider.getCode(deployState.SystemDeployerLib1);
    console.log(`SystemDeployerLib1 (${deployState.SystemDeployerLib1}):`);
    console.log(`代码长度: ${code.length}, 代码存在: ${code.length > 2}`);
  }
  
  // 检查RoleManager合约
  if (deployState.roleManager) {
    const code = await ethers.provider.getCode(deployState.roleManager);
    console.log(`\nRoleManager (${deployState.roleManager}):`);
    console.log(`代码长度: ${code.length}, 代码存在: ${code.length > 2}`);
    
    // 如果有实现合约地址，也检查一下
    if (deployState.implementations && deployState.implementations.roleManager) {
      const implCode = await ethers.provider.getCode(deployState.implementations.roleManager);
      console.log(`RoleManager 实现合约 (${deployState.implementations.roleManager}):`);
      console.log(`代码长度: ${implCode.length}, 代码存在: ${implCode.length > 2}`);
    }
  }
  
  // 检查是否存在"contracts"字段
  if (deployState.contracts) {
    console.log('\n使用新格式检查合约存在性:');
    
    for (const [name, address] of Object.entries(deployState.contracts)) {
      const code = await ethers.provider.getCode(address);
      console.log(`${name} (${address}):`);
      console.log(`代码长度: ${code.length}, 代码存在: ${code.length > 2}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 