// fix-system-references.js
// 修复RealEstateSystem合约中的引用地址
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getProvider, getSigner } = require("../shared/utils/web3Provider");
const { getAbi, initializeAbis } = require("../shared/utils/getAbis");
const { logger } = require("../shared/utils/logger");

// 初始化ABI模块
initializeAbis(logger);

/**
 * 获取最新的部署记录
 */
function getLatestDeployment() {
  const deploymentDir = path.join(__dirname, "../deployments");
  
  // 读取部署目录下的所有文件
  const files = fs.readdirSync(deploymentDir)
    .filter(file => file.startsWith("chain-") && file.endsWith(".json") && !file.includes("latest"))
    .sort((a, b) => {
      // 按文件创建时间排序
      return fs.statSync(path.join(deploymentDir, b)).mtime.getTime() - 
             fs.statSync(path.join(deploymentDir, a)).mtime.getTime();
    });
  
  if (files.length === 0) {
    // 尝试读取latest文件
    if (fs.existsSync(path.join(deploymentDir, "chain-31337-latest.json"))) {
      logger.info("Using latest deployment file: chain-31337-latest.json");
      return JSON.parse(
        fs.readFileSync(path.join(deploymentDir, "chain-31337-latest.json"), "utf8")
      );
    }
    throw new Error("No deployment files found");
  }
  
  // 获取最新的部署文件
  const latestFile = files[0];
  logger.info(`Found latest deployment file: ${latestFile}`);
  
  // 读取部署文件内容
  const deployment = JSON.parse(
    fs.readFileSync(path.join(deploymentDir, latestFile), "utf8")
  );
  
  return deployment;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  logger.info(`Using deployer address: ${deployer.address}`);
  
  try {
    // 获取最新部署信息
    const deployment = getLatestDeployment();
    
    // 检查是否有所有需要的合约地址
    if (!deployment.contracts) {
      throw new Error("Invalid deployment file structure: missing contracts object");
    }
    
    const contracts = deployment.contracts;
    
    const requiredContracts = [
      "RealEstateSystem",
      "RoleManager",
      "FeeManager",
      "PropertyRegistry",
      "TokenFactory",
      "RedemptionManager", 
      "RentDistributor",
      "Marketplace",
      "TokenHolderQuery"
    ];
    
    for (const contract of requiredContracts) {
      if (!contracts[contract]) {
        throw new Error(`Missing address for ${contract} in deployment file`);
      }
    }
    
    logger.info("Found all required contract addresses in deployment file");
    
    // 连接到RealEstateSystem合约
    const systemAbi = getAbi("RealEstateSystem");
    const systemContract = new ethers.Contract(contracts.RealEstateSystem, systemAbi, deployer);
    
    // 获取当前系统中的合约地址
    const currentContracts = await systemContract.getSystemContracts();
    
    logger.info("Current contract references in RealEstateSystem:");
    logger.info(`Role Manager: ${currentContracts[0]}`);
    logger.info(`Fee Manager: ${currentContracts[1]}`);
    logger.info(`Property Registry: ${currentContracts[2]}`);
    logger.info(`Token Factory: ${currentContracts[3]}`);
    logger.info(`Redemption Manager: ${currentContracts[4]}`);
    logger.info(`Rent Distributor: ${currentContracts[5]}`);
    logger.info(`Marketplace: ${currentContracts[6]}`);
    logger.info(`Token Holder Query: ${currentContracts[7]}`);
    
    // 检查引用是否需要修复
    let needsFix = false;
    
    if (currentContracts[0].toLowerCase() !== contracts.RoleManager.toLowerCase()) {
      logger.warn(`Role Manager reference mismatch. Current: ${currentContracts[0]}, Expected: ${contracts.RoleManager}`);
      needsFix = true;
    }
    
    if (currentContracts[1].toLowerCase() !== contracts.FeeManager.toLowerCase()) {
      logger.warn(`Fee Manager reference mismatch. Current: ${currentContracts[1]}, Expected: ${contracts.FeeManager}`);
      needsFix = true;
    }
    
    if (currentContracts[2].toLowerCase() !== contracts.PropertyRegistry.toLowerCase()) {
      logger.warn(`Property Registry reference mismatch. Current: ${currentContracts[2]}, Expected: ${contracts.PropertyRegistry}`);
      needsFix = true;
    }
    
    if (currentContracts[3].toLowerCase() !== contracts.TokenFactory.toLowerCase()) {
      logger.warn(`Token Factory reference mismatch. Current: ${currentContracts[3]}, Expected: ${contracts.TokenFactory}`);
      needsFix = true;
    }
    
    if (currentContracts[4].toLowerCase() !== contracts.RedemptionManager.toLowerCase()) {
      logger.warn(`Redemption Manager reference mismatch. Current: ${currentContracts[4]}, Expected: ${contracts.RedemptionManager}`);
      needsFix = true;
    }
    
    if (currentContracts[5].toLowerCase() !== contracts.RentDistributor.toLowerCase()) {
      logger.warn(`Rent Distributor reference mismatch. Current: ${currentContracts[5]}, Expected: ${contracts.RentDistributor}`);
      needsFix = true;
    }
    
    if (currentContracts[6].toLowerCase() !== contracts.Marketplace.toLowerCase()) {
      logger.warn(`Marketplace reference mismatch. Current: ${currentContracts[6]}, Expected: ${contracts.Marketplace}`);
      needsFix = true;
    }
    
    if (currentContracts[7].toLowerCase() !== contracts.TokenHolderQuery.toLowerCase()) {
      logger.warn(`Token Holder Query reference mismatch. Current: ${currentContracts[7]}, Expected: ${contracts.TokenHolderQuery}`);
      needsFix = true;
    }
    
    if (!needsFix) {
      logger.info("✅ All contract references are correct. No update needed.");
      return;
    }
    
    logger.info("🔄 Updating RealEstateSystem contract references...");
    
    // 准备升级
    logger.info("Preparing to upgrade RealEstateSystem contract...");
    const chainId = await deployer.getChainId();
    
    // 重新初始化合约引用
    logger.info("Attempting to fix references using traditional approach...");
    
    try {
      // 通过feeManager设置
      const feeManagerAbi = getAbi("FeeManager");
      const feeManager = new ethers.Contract(contracts.FeeManager, feeManagerAbi, deployer);
      logger.info(`Connecting to FeeManager at ${contracts.FeeManager}`);
      
      // 通过PropertyRegistry设置
      const propertyRegistryAbi = getAbi("PropertyRegistry");
      const propertyRegistry = new ethers.Contract(contracts.PropertyRegistry, propertyRegistryAbi, deployer);
      logger.info(`Connecting to PropertyRegistry at ${contracts.PropertyRegistry}`);
      
      // 通过TokenFactory设置
      const tokenFactoryAbi = getAbi("TokenFactory");
      const tokenFactory = new ethers.Contract(contracts.TokenFactory, tokenFactoryAbi, deployer);
      logger.info(`Connecting to TokenFactory at ${contracts.TokenFactory}`);
      
      // 通过手动调用合约函数来更新引用
      logger.info("Checking if system contract has admin access to role manager...");
      
      const roleManagerAbi = getAbi("RoleManager");
      const roleManager = new ethers.Contract(contracts.RoleManager, roleManagerAbi, deployer);
      
      // 检查是否有管理员权限
      const SUPER_ADMIN_ROLE = await roleManager.SUPER_ADMIN();
      const hasRole = await roleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
      logger.info(`Deployer has SUPER_ADMIN role: ${hasRole}`);
      
      if (!hasRole) {
        logger.info("Granting SUPER_ADMIN role to deployer...");
        // 尝试授予角色（可能需要根据实际情况调整）
        const adminRole = await roleManager.DEFAULT_ADMIN_ROLE();
        const isAdmin = await roleManager.hasRole(adminRole, deployer.address);
        logger.info(`Deployer has DEFAULT_ADMIN role: ${isAdmin}`);
        
        if (isAdmin) {
          const grantTx = await roleManager.grantRole(SUPER_ADMIN_ROLE, deployer.address);
          await grantTx.wait();
          logger.info("SUPER_ADMIN role granted to deployer");
        } else {
          logger.warn("Cannot grant SUPER_ADMIN role, deployer is not DEFAULT_ADMIN");
        }
      }
      
      // 尝试直接设置系统引用
      logger.info("\nAttempting direct method call with custom gas limit...");
      
      const tx = await systemContract.initialize(
        contracts.RoleManager,
        contracts.PropertyRegistry,
        contracts.TokenFactory,
        contracts.RentDistributor,
        contracts.Marketplace,
        contracts.TokenHolderQuery,
        chainId,
        { gasLimit: 500000 }
      );
      
      logger.info("Transaction sent, waiting for confirmation...");
      await tx.wait();
      logger.info("✅ RealEstateSystem contract references have been updated successfully");
      
    } catch (error) {
      logger.error("Error in traditional approach:", error.message);
      logger.info("\nAttempting alternative method to update references...");
      
      try {
        // 尝试使用低级调用方法修复引用
        logger.info("Deploying a new implementation of RealEstateSystem...");
        const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
        const newImplementation = await RealEstateSystem.deploy();
        await newImplementation.deployed();
        logger.info(`New implementation deployed at: ${newImplementation.address}`);
        
        // 获取管理员地址
        logger.info("Attempting to upgrade using administrative functions...");
        
        // 调用upgradeContract函数
        const upgradeTx = await systemContract.upgradeContract(
          "RealEstateSystem",
          newImplementation.address,
          { gasLimit: 500000 }
        );
        
        await upgradeTx.wait();
        logger.info("Contract implementation upgraded");
        
        // 验证是否修复
        logger.info("Verifying if references were fixed...");
      } catch (altError) {
        logger.error("Alternative method also failed:", altError.message);
        logger.info("\n❌ Could not fix references automatically. Manual intervention required.");
        process.exit(1);
      }
    }
    
    // 验证更新是否成功
    try {
      const updatedContracts = await systemContract.getSystemContracts();
      logger.info("\nVerifying updated contract references:");
      logger.info(`Role Manager: ${updatedContracts[0]}`);
      logger.info(`Fee Manager: ${updatedContracts[1]}`);
      logger.info(`Property Registry: ${updatedContracts[2]}`);
      logger.info(`Token Factory: ${updatedContracts[3]}`);
      logger.info(`Redemption Manager: ${updatedContracts[4]}`);
      logger.info(`Rent Distributor: ${updatedContracts[5]}`);
      logger.info(`Marketplace: ${updatedContracts[6]}`);
      logger.info(`Token Holder Query: ${updatedContracts[7]}`);
      
      // 检查引用是否正确
      let allFixed = true;
      
      if (updatedContracts[0].toLowerCase() !== contracts.RoleManager.toLowerCase()) {
        logger.warn(`Role Manager reference still incorrect. Current: ${updatedContracts[0]}, Expected: ${contracts.RoleManager}`);
        allFixed = false;
      }
      
      if (updatedContracts[1].toLowerCase() !== contracts.FeeManager.toLowerCase()) {
        console.log(`Fee Manager reference still incorrect. Current: ${updatedContracts[1]}, Expected: ${contracts.FeeManager}`);
        allFixed = false;
      }
      
      if (updatedContracts[2].toLowerCase() !== contracts.PropertyRegistry.toLowerCase()) {
        console.log(`Property Registry reference still incorrect. Current: ${updatedContracts[2]}, Expected: ${contracts.PropertyRegistry}`);
        allFixed = false;
      }
      
      if (updatedContracts[3].toLowerCase() !== contracts.TokenFactory.toLowerCase()) {
        console.log(`Token Factory reference still incorrect. Current: ${updatedContracts[3]}, Expected: ${contracts.TokenFactory}`);
        allFixed = false;
      }
      
      if (allFixed) {
        console.log("\n✅ All references have been fixed successfully");
      } else {
        console.log("\n⚠️ Some references could not be fixed. Manual intervention may be required.");
      }
    } catch (verifyError) {
      console.error("Error during verification:", verifyError.message);
      console.log("Cannot verify if references were fixed correctly.");
    }
    
  } catch (error) {
    console.error("❌ Error fixing system references:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 