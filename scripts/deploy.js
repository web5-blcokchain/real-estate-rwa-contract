const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("开始部署系统...");
  
  // 获取部署账户
  const [signer] = await ethers.getSigners();
  console.log("部署账户:", signer.address);
  
  // 部署 SimpleSystemDeployer
  console.log("\n部署 SimpleSystemDeployer...");
  const SimpleSystemDeployer = await ethers.getContractFactory("SimpleSystemDeployer");
  const systemDeployer = await upgrades.deployProxy(SimpleSystemDeployer, [], {
    kind: "uups",
  });
  await systemDeployer.deployed();
  console.log("SimpleSystemDeployer 已部署到:", systemDeployer.address);
  
  // 使用 SimpleSystemDeployer 部署系统
  console.log("\n使用 SimpleSystemDeployer 部署系统...");
  const tx = await systemDeployer.deploySystem();
  await tx.wait();
  console.log("系统部署交易已确认");
  
  // 获取已部署的合约地址
  const system = await ethers.getContractAt("SimpleRealEstateSystem", await systemDeployer.getSystemAddress());
  const facade = await ethers.getContractAt("RealEstateFacade", await systemDeployer.getFacadeAddress());
  const roleManager = await ethers.getContractAt("SimpleRoleManager", await systemDeployer.getRoleManagerAddress());
  const propertyManager = await ethers.getContractAt("PropertyManager", await systemDeployer.getPropertyManagerAddress());
  const tokenFactory = await ethers.getContractAt("PropertyToken", await systemDeployer.getTokenFactoryAddress());
  const tradingManager = await ethers.getContractAt("TradingManager", await systemDeployer.getTradingManagerAddress());
  const rewardManager = await ethers.getContractAt("RewardManager", await systemDeployer.getRewardManagerAddress());
  
  // 验证部署
  console.log("\n验证部署...");
  const systemStatus = await system.getSystemStatus();
  console.log("系统状态:", systemStatus);
  
  // 输出部署信息
  console.log("\n部署完成！");
  console.log("系统合约地址:", system.address);
  console.log("门面合约地址:", facade.address);
  console.log("角色管理合约地址:", roleManager.address);
  console.log("房产管理合约地址:", propertyManager.address);
  console.log("代币工厂合约地址:", tokenFactory.address);
  console.log("交易管理合约地址:", tradingManager.address);
  console.log("奖励管理合约地址:", rewardManager.address);
  
  // 保存部署信息到文件
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      systemDeployer: systemDeployer.address,
      system: system.address,
      facade: facade.address,
      roleManager: roleManager.address,
      propertyManager: propertyManager.address,
      tokenFactory: tokenFactory.address,
      tradingManager: tradingManager.address,
      rewardManager: rewardManager.address,
    },
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n部署信息已保存到 deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 