const { 
  readDeployments, 
  verifyContract 
} = require("../utils/deploy-utils");

async function main() {
  const deployments = readDeployments();

  console.log("开始验证合约...");

  // 验证所有已部署的合约，根据合约名称提供正确的构造函数参数
  try {
    // 验证RealEstateSystem
    await verifyContract(deployments.RealEstateSystem, []);
    
    // 验证RoleManager
    await verifyContract(deployments.RoleManager, []);
    
    // 验证FeeManager
    await verifyContract(deployments.FeeManager, []);
    
    // 验证PropertyRegistry
    await verifyContract(deployments.PropertyRegistry, [deployments.RoleManager]);
    
    // 验证TokenFactory
    await verifyContract(deployments.TokenFactory, [deployments.PropertyRegistry]);
    
    // 验证RedemptionManager
    await verifyContract(deployments.RedemptionManager, [deployments.PropertyRegistry]);
    
    // 验证RentDistributor
    await verifyContract(deployments.RentDistributor, [deployments.TokenFactory]);
    
    // 验证Marketplace
    await verifyContract(deployments.Marketplace, [deployments.TokenFactory]);
    
    // 验证TokenHolderQuery
    await verifyContract(deployments.TokenHolderQuery, [deployments.TokenFactory]);
  } catch (error) {
    console.error("验证过程中出错:", error);
  }

  console.log("合约验证完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });