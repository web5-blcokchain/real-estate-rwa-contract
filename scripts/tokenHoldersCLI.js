const { ethers } = require("hardhat");
const { getTokenHolders, getDistributionHolders } = require("./getTokenHolders");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);
  
  // 获取系统合约地址
  const systemAddress = process.env.SYSTEM_ADDRESS;
  if (!systemAddress) {
    console.error("请设置环境变量 SYSTEM_ADDRESS");
    process.exit(1);
  }
  
  // 获取命令行参数
  const command = process.argv[2];
  
  if (command === "get-distribution-holders") {
    // 获取特定分配的持有者
    const distributionId = process.argv[3];
    if (!distributionId) {
      console.error("请提供分配ID");
      return;
    }
    
    console.log(`正在获取分配 ${distributionId} 的持有者信息...`);
    const result = await getDistributionHolders(distributionId, systemAddress);
    
    console.log(`快照ID: ${result.snapshotId}`);
    console.log(`总供应量: ${result.totalSupply}`);
    console.log(`持有者数量: ${result.holders.length}`);
    console.log("\n持有者列表:");
    
    result.holders.forEach((holder, index) => {
      console.log(`${index+1}. 地址: ${holder.address}`);
      console.log(`   余额: ${holder.balance} (${holder.percentage})`);
    });
  } 
  else if (command === "get-snapshot-holders") {
    // 获取特定快照的持有者
    const tokenAddress = process.argv[3];
    const snapshotId = process.argv[4];
    
    if (!tokenAddress || !snapshotId) {
      console.error("请提供代币地址和快照ID");
      return;
    }
    
    console.log(`正在获取代币 ${tokenAddress} 快照 ${snapshotId} 的持有者信息...`);
    const result = await getTokenHolders(tokenAddress, snapshotId, systemAddress);
    
    console.log(`快照ID: ${result.snapshotId}`);
    console.log(`总供应量: ${result.totalSupply}`);
    console.log(`持有者数量: ${result.holders.length}`);
    console.log("\n持有者列表:");
    
    result.holders.forEach((holder, index) => {
      console.log(`${index+1}. 地址: ${holder.address}`);
      console.log(`   余额: ${holder.balance} (${holder.percentage})`);
    });
  }
  else {
    console.log("可用命令:");
    console.log("  get-distribution-holders <分配ID>      - 获取特定分配的持有者信息");
    console.log("  get-snapshot-holders <代币地址> <快照ID> - 获取特定快照的持有者信息");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });