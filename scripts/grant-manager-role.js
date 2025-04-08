const { ethers } = require("hardhat"); 
require('dotenv').config();

async function main() {
  console.log("开始授予MANAGER_ROLE...");
  
  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);
  
  // 从环境变量获取manager私钥
  const managerPrivateKey = process.env.MANAGER_PRIVATE_KEY;
  if (!managerPrivateKey) {
    console.error("未找到MANAGER_PRIVATE_KEY环境变量");
    process.exit(1);
  }
  
  // 从私钥创建钱包实例，获取地址
  const managerWallet = new ethers.Wallet(managerPrivateKey);
  const managerAddress = managerWallet.address;
  console.log("授予MANAGER_ROLE给:", managerAddress);
  console.log("(该地址来自MANAGER_PRIVATE_KEY)");
  
  // 获取RoleManager合约实例
  const roleManagerAddress = process.env.CONTRACT_ROLEMANAGER_ADDRESS;
  console.log("RoleManager地址:", roleManagerAddress);
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = await RoleManager.attach(roleManagerAddress);
  
  // 获取MANAGER_ROLE常量
  const MANAGER_ROLE = await roleManager.MANAGER_ROLE();
  console.log("MANAGER_ROLE常量:", MANAGER_ROLE);
  
  // 检查地址是否已经有MANAGER_ROLE
  const hasRole = await roleManager.hasRole(MANAGER_ROLE, managerAddress);
  console.log("地址是否已有MANAGER_ROLE:", hasRole);
  
  if (!hasRole) {
    // 授予MANAGER_ROLE
    console.log("正在授予MANAGER_ROLE...");
    const tx = await roleManager.grantRole(MANAGER_ROLE, managerAddress);
    await tx.wait();
    console.log("交易完成, hash:", tx.hash);
    
    // 验证授权结果
    const hasRoleAfter = await roleManager.hasRole(MANAGER_ROLE, managerAddress);
    console.log("地址现在是否有MANAGER_ROLE:", hasRoleAfter);
  } else {
    console.log("地址已经有MANAGER_ROLE, 无需再次授权");
  }
  
  console.log("授权完成!");
}

main().catch((error) => {
  console.error("授权失败:", error);
  process.exit(1);
}); 