const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("开始部署系统...");
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  
  // 部署 SimpleRoleManager
  console.log("\n部署 SimpleRoleManager...");
  const SimpleRoleManager = await ethers.getContractFactory("SimpleRoleManager");
  const roleManager = await upgrades.deployProxy(SimpleRoleManager, [], {
    kind: "uups",
  });
  await roleManager.deployed();
  console.log("SimpleRoleManager 已部署到:", roleManager.address);
  
  // 部署 PropertyManager
  console.log("\n部署 PropertyManager...");
  const PropertyManager = await ethers.getContractFactory("PropertyManager");
  const propertyManager = await upgrades.deployProxy(PropertyManager, [], {
    kind: "uups",
  });
  await propertyManager.deployed();
  console.log("PropertyManager 已部署到:", propertyManager.address);
  
  // 部署 PropertyToken
  console.log("\n部署 PropertyToken...");
  const PropertyToken = await ethers.getContractFactory("PropertyToken");
  const tokenFactory = await upgrades.deployProxy(PropertyToken, [], {
    kind: "uups",
  });
  await tokenFactory.deployed();
  console.log("PropertyToken 已部署到:", tokenFactory.address);
  
  // 部署 TradingManager
  console.log("\n部署 TradingManager...");
  const TradingManager = await ethers.getContractFactory("TradingManager");
  const tradingManager = await upgrades.deployProxy(TradingManager, [], {
    kind: "uups",
  });
  await tradingManager.deployed();
  console.log("TradingManager 已部署到:", tradingManager.address);
  
  // 部署 RewardManager
  console.log("\n部署 RewardManager...");
  const RewardManager = await ethers.getContractFactory("RewardManager");
  const rewardManager = await upgrades.deployProxy(RewardManager, [], {
    kind: "uups",
  });
  await rewardManager.deployed();
  console.log("RewardManager 已部署到:", rewardManager.address);
  
  // 部署 SimpleRealEstateSystem
  console.log("\n部署 SimpleRealEstateSystem...");
  const SimpleRealEstateSystem = await ethers.getContractFactory("SimpleRealEstateSystem");
  const system = await upgrades.deployProxy(
    SimpleRealEstateSystem,
    [
      roleManager.address,
      propertyManager.address,
      tokenFactory.address,
      tradingManager.address,
      rewardManager.address,
    ],
    {
      kind: "uups",
    }
  );
  await system.deployed();
  console.log("SimpleRealEstateSystem 已部署到:", system.address);
  
  // 部署 RealEstateFacade
  console.log("\n部署 RealEstateFacade...");
  const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
  const facade = await upgrades.deployProxy(
    RealEstateFacade,
    [
      system.address,
      roleManager.address,
      propertyManager.address,
      tokenFactory.address,
      tradingManager.address,
      rewardManager.address,
    ],
    {
      kind: "uups",
    }
  );
  await facade.deployed();
  console.log("RealEstateFacade 已部署到:", facade.address);
  
  // 设置权限
  console.log("\n设置权限...");
  await roleManager.grantRole(await roleManager.ADMIN_ROLE(), deployer.address);
  console.log("已授予管理员权限");
  
  // 设置系统合约地址
  console.log("\n设置系统合约地址...");
  await system.setSystemAddress(system.address);
  await system.setFacadeAddress(facade.address);
  console.log("已设置系统合约地址");
  
  // 设置各个组件的系统合约地址
  console.log("\n设置组件系统合约地址...");
  await propertyManager.setSystemAddress(system.address);
  await tradingManager.setSystemAddress(system.address);
  await rewardManager.setSystemAddress(system.address);
  console.log("已设置组件系统合约地址");
  
  // 设置各个组件的门面合约地址
  console.log("\n设置组件门面合约地址...");
  await propertyManager.setFacadeAddress(facade.address);
  await tradingManager.setFacadeAddress(facade.address);
  await rewardManager.setFacadeAddress(facade.address);
  console.log("已设置组件门面合约地址");
  
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