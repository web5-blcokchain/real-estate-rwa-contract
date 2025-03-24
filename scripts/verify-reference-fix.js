// verify-reference-fix.js
// 验证RealEstateSystem合约的引用修复情况
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 简单的字符串格式化函数
function green(text) {
  return `\x1b[32m${text}\x1b[0m`;
}

function red(text) {
  return `\x1b[31m${text}\x1b[0m`;
}

// 获取验证文件数据
function getVerificationData(chainId) {
  const verificationPath = path.join(__dirname, "../verification");
  const verificationFile = path.join(verificationPath, `system-verification-${chainId}.json`);
  
  if (!fs.existsSync(verificationFile)) {
    throw new Error(`Verification file for chain ${chainId} not found. Run manual-fix-reference.js first.`);
  }
  
  return JSON.parse(fs.readFileSync(verificationFile, "utf8"));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Using deployer address: ${deployer.address}`);
  
  try {
    // 获取当前链ID
    const chainId = await deployer.getChainId();
    console.log(`Current chain ID: ${chainId}`);
    
    // 获取验证数据
    const verificationData = getVerificationData(chainId);
    console.log(`Found verification data for chain ${chainId}`);
    
    // 连接到RealEstateSystem合约
    const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
    const systemContract = await RealEstateSystem.attach(verificationData.realEstateSystem);
    
    console.log(`Connecting to RealEstateSystem at ${verificationData.realEstateSystem}`);
    
    // 获取当前系统中的合约地址
    const currentContracts = await systemContract.getSystemContracts();
    
    console.log("\n========== REFERENCE VERIFICATION ==========");
    
    // 检查RoleManager引用
    const roleManagerStatus = currentContracts[0].toLowerCase() === verificationData.correctReferences.roleManager.toLowerCase();
    console.log(
      `Role Manager: ${roleManagerStatus ? green("✓") : red("✗")} ${currentContracts[0]}`
    );
    
    // 检查FeeManager引用
    const feeManagerStatus = currentContracts[1].toLowerCase() === verificationData.correctReferences.feeManager.toLowerCase();
    console.log(
      `Fee Manager: ${feeManagerStatus ? green("✓") : red("✗")} ${currentContracts[1]}`
    );
    
    // 检查PropertyRegistry引用
    const propertyRegistryStatus = currentContracts[2].toLowerCase() === verificationData.correctReferences.propertyRegistry.toLowerCase();
    console.log(
      `Property Registry: ${propertyRegistryStatus ? green("✓") : red("✗")} ${currentContracts[2]}`
    );
    
    // 检查TokenFactory引用
    const tokenFactoryStatus = currentContracts[3].toLowerCase() === verificationData.correctReferences.tokenFactory.toLowerCase();
    console.log(
      `Token Factory: ${tokenFactoryStatus ? green("✓") : red("✗")} ${currentContracts[3]}`
    );
    
    // 检查RedemptionManager引用
    const redemptionManagerStatus = currentContracts[4].toLowerCase() === verificationData.correctReferences.redemptionManager.toLowerCase();
    console.log(
      `Redemption Manager: ${redemptionManagerStatus ? green("✓") : red("✗")} ${currentContracts[4]}`
    );
    
    // 检查RentDistributor引用
    const rentDistributorStatus = currentContracts[5].toLowerCase() === verificationData.correctReferences.rentDistributor.toLowerCase();
    console.log(
      `Rent Distributor: ${rentDistributorStatus ? green("✓") : red("✗")} ${currentContracts[5]}`
    );
    
    // 检查Marketplace引用
    const marketplaceStatus = currentContracts[6].toLowerCase() === verificationData.correctReferences.marketplace.toLowerCase();
    console.log(
      `Marketplace: ${marketplaceStatus ? green("✓") : red("✗")} ${currentContracts[6]}`
    );
    
    // 检查TokenHolderQuery引用
    const tokenHolderQueryStatus = currentContracts[7].toLowerCase() === verificationData.correctReferences.tokenHolderQuery.toLowerCase();
    console.log(
      `Token Holder Query: ${tokenHolderQueryStatus ? green("✓") : red("✗")} ${currentContracts[7]}`
    );
    
    // 总体结果
    const allCorrect = roleManagerStatus && 
                       feeManagerStatus && 
                       propertyRegistryStatus && 
                       tokenFactoryStatus && 
                       redemptionManagerStatus && 
                       rentDistributorStatus && 
                       marketplaceStatus && 
                       tokenHolderQueryStatus;
    
    console.log("\n----------------------------------------");
    if (allCorrect) {
      console.log(green("✅ All references are correct!"));
    } else {
      console.log(red("❌ Some references are still incorrect."));
      console.log("Please check the verification report and fix the remaining issues.");
    }
    console.log("----------------------------------------");
    
    // 记录验证历史
    const now = new Date();
    const historyPath = path.join(__dirname, "../verification/history");
    
    if (!fs.existsSync(historyPath)) {
      fs.mkdirSync(historyPath, { recursive: true });
    }
    
    const historyFile = path.join(historyPath, `verification-${chainId}-${now.toISOString().replace(/:/g, "-")}.json`);
    const historyData = {
      timestamp: now.toISOString(),
      chainId,
      status: allCorrect ? "FIXED" : "PENDING",
      realEstateSystem: verificationData.realEstateSystem,
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
      correctReferences: verificationData.correctReferences,
      referenceStatus: {
        roleManager: roleManagerStatus,
        feeManager: feeManagerStatus,
        propertyRegistry: propertyRegistryStatus,
        tokenFactory: tokenFactoryStatus,
        redemptionManager: redemptionManagerStatus,
        rentDistributor: rentDistributorStatus,
        marketplace: marketplaceStatus,
        tokenHolderQuery: tokenHolderQueryStatus
      }
    };
    
    fs.writeFileSync(historyFile, JSON.stringify(historyData, null, 2));
    console.log(`Verification history saved to: ${historyFile}`);
    
  } catch (error) {
    console.error(`❌ Error verifying references: ${error.message}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 