const { 
  deployUpgradeable, 
  readDeployments, 
  saveDeployments,
  getEnv
} = require("../utils/deploy-utils");

async function main() {
  // 读取现有部署记录
  const deployments = readDeployments();
  
  // 检查系统合约是否已部署
  if (!deployments.RealEstateSystem) {
    throw new Error("RealEstateSystem 尚未部署，请先运行 01_deploy_system.js");
  }

  // 部署 RoleManager
  const roleManager = await deployUpgradeable("RoleManager");
  deployments.RoleManager = roleManager.address;
  
  // 部署 FeeManager
  const feeManager = await deployUpgradeable("FeeManager");
  deployments.FeeManager = feeManager.address;
  
  // 部署 PropertyRegistry
  const propertyRegistry = await deployUpgradeable(
    "PropertyRegistry", 
    [roleManager.address]
  );
  deployments.PropertyRegistry = propertyRegistry.address;
  
  // 部署 TokenFactory
  const tokenFactory = await deployUpgradeable(
    "TokenFactory", 
    [propertyRegistry.address]
  );
  deployments.TokenFactory = tokenFactory.address;
  
  // 部署 RedemptionManager
  const redemptionManager = await deployUpgradeable(
    "RedemptionManager", 
    [propertyRegistry.address]
  );
  deployments.RedemptionManager = redemptionManager.address;
  
  // 部署 RentDistributor
  const rentDistributor = await deployUpgradeable(
    "RentDistributor", 
    [tokenFactory.address]
  );
  deployments.RentDistributor = rentDistributor.address;
  
  // 部署 Marketplace
  const marketplace = await deployUpgradeable(
    "Marketplace", 
    [tokenFactory.address]
  );
  deployments.Marketplace = marketplace.address;
  
  // 部署 TokenHolderQuery
  const tokenHolderQuery = await deployUpgradeable(
    "TokenHolderQuery", 
    [tokenFactory.address]
  );
  deployments.TokenHolderQuery = tokenHolderQuery.address;
  
  // 保存部署记录
  saveDeployments(deployments);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });