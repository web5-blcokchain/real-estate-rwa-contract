// create-initialize-calldata.js
// 为RealEstateSystem合约生成初始化函数的调用数据
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

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
    
    // 创建RealEstateSystem接口
    const realEstateSystemInterface = new ethers.utils.Interface([
      "function initialize(address _roleManager, address _feeManager, address _propertyRegistry, address _tokenFactory, address _redemptionManager, address _rentDistributor, address _marketplace, address _tokenHolderQuery)",
      "function upgradeContract(string memory contractName, address newImplementation)"
    ]);
    
    // 生成升级函数的调用数据
    const upgradeCalldata = realEstateSystemInterface.encodeFunctionData(
      "upgradeContract", 
      ["RealEstateSystem", verificationData.newImplementation]
    );
    
    // 生成初始化函数的调用数据
    const correctRefs = verificationData.correctReferences;
    const initializeCalldata = realEstateSystemInterface.encodeFunctionData(
      "initialize",
      [
        correctRefs.roleManager,
        correctRefs.feeManager,
        correctRefs.propertyRegistry,
        correctRefs.tokenFactory,
        correctRefs.redemptionManager,
        correctRefs.rentDistributor,
        correctRefs.marketplace,
        correctRefs.tokenHolderQuery
      ]
    );
    
    // 生成结果对象
    const result = {
      timestamp: new Date().toISOString(),
      chainId: chainId,
      targetContract: verificationData.realEstateSystem,
      upgradeTx: {
        to: verificationData.realEstateSystem,
        data: upgradeCalldata,
        description: "升级RealEstateSystem合约到新实现"
      },
      initializeTx: {
        to: verificationData.realEstateSystem,
        data: initializeCalldata,
        description: "使用正确的引用重新初始化RealEstateSystem合约"
      },
      contractAddresses: {
        roleManager: correctRefs.roleManager,
        propertyRegistry: correctRefs.propertyRegistry,
        tokenFactory: correctRefs.tokenFactory,
        rentDistributor: correctRefs.rentDistributor,
        marketplace: correctRefs.marketplace,
        tokenHolderQuery: correctRefs.tokenHolderQuery
      },
      newImplementation: verificationData.newImplementation
    };
    
    // 保存到文件
    const calldataPath = path.join(__dirname, "../calldata");
    if (!fs.existsSync(calldataPath)) {
      fs.mkdirSync(calldataPath);
    }
    
    const calldataFile = path.join(calldataPath, `system-calldata-${chainId}.json`);
    fs.writeFileSync(calldataFile, JSON.stringify(result, null, 2));
    console.log(`Calldata saved to ${calldataFile}`);
    
    // 控制台输出摘要
    console.log("\n========================================================================");
    console.log("TRANSACTION DATA FOR MANUAL EXECUTION");
    console.log("========================================================================");
    console.log(`Contract Address: ${verificationData.realEstateSystem}`);
    console.log("\nSTEP 1: Upgrade Contract Implementation");
    console.log("Function: upgradeContract(string,address)");
    console.log(`Data: ${upgradeCalldata}`);
    console.log("\nSTEP 2: Initialize Contract with Correct References");
    console.log("Function: initialize(address,address,address,address,address,address,address,address)");
    console.log(`Data: ${initializeCalldata}`);
    console.log("\nNOTE: These transactions must be executed by a wallet with SUPER_ADMIN role");
    console.log("========================================================================");
    
  } catch (error) {
    console.error(`❌ Error generating calldata: ${error.message}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 