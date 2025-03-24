// BSC测试网部署脚本
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { 
  deployUpgradeable, 
  readDeployments, 
  saveDeployments,
  getEnv,
  getRoles
} = require("./utils/deploy-utils");

async function main() {
  // 确保我们在BSC测试网上
  const network = await ethers.provider.getNetwork();
  console.log(`部署到网络: ${network.name} (chainId: ${network.chainId})`);
  
  // BSC测试网chainId为97
  if (network.chainId !== 97) {
    const continueDeployment = getEnv("FORCE_DEPLOY", "false").toLowerCase() === "true";
    if (!continueDeployment) {
      console.error("错误: 您不在BSC测试网上。如果要强制部署，请设置环境变量 FORCE_DEPLOY=true");
      process.exit(1);
    }
    console.warn("警告: 您不在BSC测试网上，但由于设置了FORCE_DEPLOY=true，将继续部署。");
  }
  console.log("开始部署日本房产通证化系统到BSC测试网...");
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log(`部署账户: ${deployer.address}`);
  console.log(`账户余额: ${ethers.utils.formatEther(await deployer.getBalance())} BNB`);
  
  // 创建部署记录对象
  const deployedContracts = {};
  
  try {
    // 1. 部署 RealEstateSystem
    console.log("\n步骤 1: 部署 RealEstateSystem");
    const realEstateSystem = await deployUpgradeable("RealEstateSystem");
    deployedContracts.RealEstateSystem = realEstateSystem.address;
    
    // 2. 部署 RoleManager
    console.log("\n步骤 2: 部署 RoleManager");
    const roleManager = await deployUpgradeable("RoleManager");
    deployedContracts.RoleManager = roleManager.address;
    
    // 3. 部署 FeeManager
    console.log("\n步骤 3: 部署 FeeManager");
    const feeManager = await deployUpgradeable("FeeManager");
    deployedContracts.FeeManager = feeManager.address;
    
    // 4. 部署 PropertyRegistry
    console.log("\n步骤 4: 部署 PropertyRegistry");
    const propertyRegistry = await deployUpgradeable(
      "PropertyRegistry", 
      [roleManager.address]
    );
    deployedContracts.PropertyRegistry = propertyRegistry.address;
    
    // 5. 部署 TokenFactory
    console.log("\n步骤 5: 部署 TokenFactory");
    const tokenFactory = await deployUpgradeable(
      "TokenFactory", 
      [propertyRegistry.address]
    );
    deployedContracts.TokenFactory = tokenFactory.address;
    
    // 6. 部署 RedemptionManager
    console.log("\n步骤 6: 部署 RedemptionManager");
    const redemptionManager = await deployUpgradeable(
      "RedemptionManager", 
      [propertyRegistry.address]
    );
    deployedContracts.RedemptionManager = redemptionManager.address;
    
    // 7. 部署 RentDistributor
    console.log("\n步骤 7: 部署 RentDistributor");
    const rentDistributor = await deployUpgradeable(
      "RentDistributor", 
      [tokenFactory.address]
    );
    deployedContracts.RentDistributor = rentDistributor.address;
    
    // 8. 部署 Marketplace
    console.log("\n步骤 8: 部署 Marketplace");
    const marketplace = await deployUpgradeable(
      "Marketplace", 
      [tokenFactory.address]
    );
    deployedContracts.Marketplace = marketplace.address;
    
    // 9. 部署 TokenHolderQuery
    console.log("\n步骤 9: 部署 TokenHolderQuery");
    const tokenHolderQuery = await deployUpgradeable(
      "TokenHolderQuery", 
      [tokenFactory.address]
    );
    deployedContracts.TokenHolderQuery = tokenHolderQuery.address;
    
    // 10. 初始化系统
    console.log("\n步骤 10: 初始化系统");
    console.log("设置系统合约地址...");
    await realEstateSystem.setSystemContracts(
      roleManager.address,
      feeManager.address,
      propertyRegistry.address,
      tokenFactory.address,
      redemptionManager.address,
      rentDistributor.address,
      marketplace.address,
      tokenHolderQuery.address
    );
    console.log("系统合约地址已设置");
    
    // 11. 设置初始角色
    console.log("\n步骤 11: 设置初始角色");
    const roles = getRoles();
    const superAdminAddress = getEnv("SUPER_ADMIN_ADDRESS", deployer.address);
    const propertyManagerAddress = getEnv("PROPERTY_MANAGER_ADDRESS", deployer.address);
    const feeCollectorAddress = getEnv("FEE_COLLECTOR_ADDRESS", deployer.address);
    
    await roleManager.grantRole(roles.SUPER_ADMIN, superAdminAddress);
    console.log(`超级管理员角色已设置: ${superAdminAddress}`);
    
    await roleManager.grantRole(roles.PROPERTY_MANAGER, propertyManagerAddress);
    console.log(`房产管理员角色已设置: ${propertyManagerAddress}`);
    
    await roleManager.grantRole(roles.FEE_COLLECTOR, feeCollectorAddress);
    console.log(`费用收集者角色已设置: ${feeCollectorAddress}`);
    
    // 12. 设置初始费用
    console.log("\n步骤 12: 设置初始费用");
    const tradingFee = parseInt(getEnv("TRADING_FEE", "50"));
    const tokenizationFee = parseInt(getEnv("TOKENIZATION_FEE", "100"));
    const redemptionFee = parseInt(getEnv("REDEMPTION_FEE", "30"));
    const platformFee = parseInt(getEnv("PLATFORM_FEE", "20"));
    
    await feeManager.updateFee("trading", tradingFee);
    await feeManager.updateFee("tokenization", tokenizationFee);
    await feeManager.updateFee("redemption", redemptionFee);
    await feeManager.updateFee("platform", platformFee);
    console.log(`系统费用已设置: 交易(${tradingFee/100}%), 通证化(${tokenizationFee/100}%), 赎回(${redemptionFee/100}%), 平台(${platformFee/100}%)`);
    
    // 13. 激活系统
    console.log("\n步骤 13: 激活系统");
    await realEstateSystem.setSystemStatus(true);
    console.log("系统已激活");
    
    console.log("\n部署完成!");
    
  } catch (error) {
    // 记录详细错误信息到日志文件
    const errorLog = path.join(__dirname, "../logs");
    if (!fs.existsSync(errorLog)) {
      fs.mkdirSync(errorLog, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const errorLogFile = path.join(errorLog, `deploy-error-${timestamp}.log`);
    
    fs.writeFileSync(
      errorLogFile,
      `部署错误时间: ${new Date().toISOString()}\n` +
      `错误信息: ${error.message}\n` +
      `错误堆栈: ${error.stack}\n`
    );
    
    console.error("部署过程中出错:", error.message);
    console.error(`详细错误日志已保存到: ${errorLogFile}`);
    throw error;
  }
  
  // 将部署信息保存到文件
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const deploymentFile = path.join(deploymentPath, `bsc-testnet-${timestamp}.json`);
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify({
      network: "bsc-testnet",
      chainId: network.chainId,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: deployedContracts
    }, null, 2)
  );
  
  // 同时更新最新部署记录
  const latestDeploymentFile = path.join(deploymentPath, "bsc-testnet-latest.json");
  fs.writeFileSync(
    latestDeploymentFile,
    JSON.stringify({
      network: "bsc-testnet",
      chainId: network.chainId,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: deployedContracts
    }, null, 2)
  );
  
  console.log(`部署信息已保存到: ${deploymentFile}`);
  console.log(`最新部署记录已更新: ${latestDeploymentFile}`);
  
  // 生成验证脚本
  generateVerificationScript(deployedContracts);
  
  return deployedContracts;
}

function generateVerificationScript(contracts) {
  const verifyScriptPath = path.join(__dirname, "verify-bsc-testnet.js");
  const verifyScript = `
const hre = require("hardhat");

async function main() {
  console.log("开始验证BSC测试网合约...");
  
  // 验证RealEstateSystem
  try {
    await hre.run("verify:verify", {
      address: "${contracts.RealEstateSystem}",
      constructorArguments: []
    });
    console.log("RealEstateSystem 验证成功");
  } catch (error) {
    console.error("RealEstateSystem 验证失败:", error.message);
  }
  
  // 验证RoleManager
  try {
    await hre.run("verify:verify", {
      address: "${contracts.RoleManager}",
      constructorArguments: []
    });
    console.log("RoleManager 验证成功");
  } catch (error) {
    console.error("RoleManager 验证失败:", error.message);
  }
  
  // 验证FeeManager
  try {
    await hre.run("verify:verify", {
      address: "${contracts.FeeManager}",
      constructorArguments: []
    });
    console.log("FeeManager 验证成功");
  } catch (error) {
    console.error("FeeManager 验证失败:", error.message);
  }
  
  // 验证PropertyRegistry
  try {
    await hre.run("verify:verify", {
      address: "${contracts.PropertyRegistry}",
      constructorArguments: ["${contracts.RoleManager}"]
    });
    console.log("PropertyRegistry 验证成功");
  } catch (error) {
    console.error("PropertyRegistry 验证失败:", error.message);
  }
  
  // 验证TokenFactory
  try {
    await hre.run("verify:verify", {
      address: "${contracts.TokenFactory}",
      constructorArguments: ["${contracts.PropertyRegistry}"]
    });
    console.log("TokenFactory 验证成功");
  } catch (error) {
    console.error("TokenFactory 验证失败:", error.message);
  }
  
  // 验证RedemptionManager
  try {
    await hre.run("verify:verify", {
      address: "${contracts.RedemptionManager}",
      constructorArguments: ["${contracts.PropertyRegistry}"]
    });
    console.log("RedemptionManager 验证成功");
  } catch (error) {
    console.error("RedemptionManager 验证失败:", error.message);
  }
  
  // 验证RentDistributor
  try {
    await hre.run("verify:verify", {
      address: "${contracts.RentDistributor}",
      constructorArguments: ["${contracts.TokenFactory}"]
    });
    console.log("RentDistributor 验证成功");
  } catch (error) {
    console.error("RentDistributor 验证失败:", error.message);
  }
  
  // 验证Marketplace
  try {
    await hre.run("verify:verify", {
      address: "${contracts.Marketplace}",
      constructorArguments: ["${contracts.TokenFactory}"]
    });
    console.log("Marketplace 验证成功");
  } catch (error) {
    console.error("Marketplace 验证失败:", error.message);
  }
  
  // 验证TokenHolderQuery
  try {
    await hre.run("verify:verify", {
      address: "${contracts.TokenHolderQuery}",
      constructorArguments: ["${contracts.TokenFactory}"]
    });
    console.log("TokenHolderQuery 验证成功");
  } catch (error) {
    console.error("TokenHolderQuery 验证失败:", error.message);
  }
  
  console.log("验证完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

  fs.writeFileSync(verifyScriptPath, verifyScript);
  console.log(`验证脚本已生成: ${verifyScriptPath}`);
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("部署过程中出错:", error);
      process.exit(1);
    });
} else {
  // 作为模块导出
  module.exports = { main };
}