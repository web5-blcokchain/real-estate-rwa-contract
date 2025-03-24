// manual-fix-reference.js
// 手动修复RealEstateSystem合约引用的脚本
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 获取最新部署信息
function getLatestDeployment() {
  const deploymentDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentDir)) {
    console.error("Deployment directory does not exist. Run deployment first.");
    process.exit(1);
  }
  
  const deploymentFiles = fs.readdirSync(deploymentDir)
    .filter(file => file.endsWith(".json"))
    .sort((a, b) => {
      const aTime = fs.statSync(path.join(deploymentDir, a)).mtime.getTime();
      const bTime = fs.statSync(path.join(deploymentDir, b)).mtime.getTime();
      return bTime - aTime; // 按时间降序排列
    });
  
  if (deploymentFiles.length === 0) {
    console.error("No deployment files found.");
    process.exit(1);
  }
  
  const latestFile = deploymentFiles[0];
  const deploymentPath = path.join(deploymentDir, latestFile);
  
  console.log(`Loading latest deployment from: ${deploymentPath}`);
  
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Using deployer address: ${deployer.address}`);
  
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
    
    console.log("Found all required contract addresses in deployment file");
    
    // 连接到RealEstateSystem合约
    const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
    const systemContract = await RealEstateSystem.attach(contracts.RealEstateSystem);
    
    // 获取当前系统中的合约地址
    const currentContracts = await systemContract.getSystemContracts();
    
    console.log("Current contract references in RealEstateSystem:");
    console.log(`Role Manager: ${currentContracts[0]}`);
    console.log(`Fee Manager: ${currentContracts[1]}`);
    console.log(`Property Registry: ${currentContracts[2]}`);
    console.log(`Token Factory: ${currentContracts[3]}`);
    console.log(`Redemption Manager: ${currentContracts[4]}`);
    console.log(`Rent Distributor: ${currentContracts[5]}`);
    console.log(`Marketplace: ${currentContracts[6]}`);
    console.log(`Token Holder Query: ${currentContracts[7]}`);
    
    // 检查引用是否需要修复
    let needsFix = false;
    
    const referenceMap = {
      0: "RoleManager",
      1: "FeeManager",
      2: "PropertyRegistry",
      3: "TokenFactory",
      4: "RedemptionManager",
      5: "RentDistributor",
      6: "Marketplace",
      7: "TokenHolderQuery"
    };
    
    const correctReferences = {};
    for (let i = 0; i < 8; i++) {
      const contractKey = referenceMap[i];
      correctReferences[contractKey.charAt(0).toLowerCase() + contractKey.slice(1)] = contracts[contractKey];
      
      if (currentContracts[i].toLowerCase() !== contracts[contractKey].toLowerCase()) {
        console.log(`Mismatch for ${contractKey}:`);
        console.log(`  Expected: ${contracts[contractKey]}`);
        console.log(`  Found:    ${currentContracts[i]}`);
        needsFix = true;
      }
    }
    
    if (!needsFix) {
      console.log("✅ All references are correct. No fix needed.");
      return;
    }
    
    console.log("\n⚠️ References need to be fixed!");
    
    // 部署新的RealEstateSystem实现
    console.log("\nDeploying new RealEstateSystem implementation...");
    const RealEstateSystemImpl = await ethers.getContractFactory("RealEstateSystem");
    const newImplementation = await RealEstateSystemImpl.deploy();
    await newImplementation.deployed();
    console.log(`New implementation deployed at: ${newImplementation.address}`);
    
    // 保存验证信息
    const verificationPath = path.join(__dirname, "../verification");
    if (!fs.existsSync(verificationPath)) {
      fs.mkdirSync(verificationPath, { recursive: true });
    }
    
    const chainId = await deployer.getChainId();
    const verificationFile = path.join(verificationPath, `system-verification-${chainId}.json`);
    
    const verificationData = {
      timestamp: new Date().toISOString(),
      chainId: chainId,
      realEstateSystem: contracts.RealEstateSystem,
      newImplementation: newImplementation.address,
      currentReferences: {
        roleManager: currentContracts[0],
        feeManager: currentContracts[1],
        propertyRegistry: currentContracts[2],
        tokenFactory: currentContracts[3],
        redemptionManager: currentContracts[4],
        rentDistributor: currentContracts[5],
        marketplace: currentContracts[6],
        tokenHolderQuery: currentContracts[7]
      },
      correctReferences: correctReferences
    };
    
    fs.writeFileSync(verificationFile, JSON.stringify(verificationData, null, 2));
    console.log(`Verification data saved to: ${verificationFile}`);
    
    console.log("\n===== MANUAL FIX INSTRUCTIONS =====");
    console.log("To fix the system references, follow these steps:");
    console.log("\n1. Call the upgradeContract function on the RealEstateSystem");
    console.log("   contract to upgrade to the new implementation:");
    console.log(`   Contract: ${contracts.RealEstateSystem}`);
    console.log(`   Function: upgradeContract("RealEstateSystem", "${newImplementation.address}")`);
    console.log("\n2. After upgrading, call the initialize function with the correct references:");
    console.log(`   Contract: ${contracts.RealEstateSystem}`);
    console.log("   Function: initialize(");
    console.log(`     ${contracts.RoleManager}, // _roleManager`);
    console.log(`     ${contracts.FeeManager}, // _feeManager`);
    console.log(`     ${contracts.PropertyRegistry}, // _propertyRegistry`);
    console.log(`     ${contracts.TokenFactory}, // _tokenFactory`);
    console.log(`     ${contracts.RedemptionManager}, // _redemptionManager`);
    console.log(`     ${contracts.RentDistributor}, // _rentDistributor`);
    console.log(`     ${contracts.Marketplace}, // _marketplace`);
    console.log(`     ${contracts.TokenHolderQuery} // _tokenHolderQuery`);
    console.log("   )");
    console.log("\n3. Run the verify-reference-fix.js script to verify the changes:");
    console.log("   npx hardhat run scripts/verify-reference-fix.js --network <network>");
    console.log("\nNOTE: These operations require SUPER_ADMIN role");
    console.log("===================================");
    
  } catch (error) {
    console.error(`Error fixing references: ${error.message}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 