const { 
  readDeployments, 
  getContract, 
  getRoles,
  getEnv
} = require("../utils/deploy-utils");

async function main() {
  // 读取部署记录
  const deployments = readDeployments();
  
  // 检查所有必要合约是否已部署
  const requiredContracts = [
    "RealEstateSystem", "RoleManager", "FeeManager", 
    "PropertyRegistry", "TokenFactory", "RedemptionManager", 
    "RentDistributor", "Marketplace", "TokenHolderQuery"
  ];
  
  for (const contract of requiredContracts) {
    if (!deployments[contract]) {
      throw new Error(`${contract} 尚未部署，请先完成所有合约部署`);
    }
  }

  console.log("开始初始化系统...");

  // 获取合约实例
  const realEstateSystem = await getContract(
    "RealEstateSystem",
    deployments.RealEstateSystem
  );
  const roleManager = await getContract(
    "RoleManager",
    deployments.RoleManager
  );
  const feeManager = await getContract(
    "FeeManager",
    deployments.FeeManager
  );

  // 设置系统合约地址
  console.log("设置系统合约地址...");
  await realEstateSystem.setSystemContracts(
    deployments.RoleManager,
    deployments.FeeManager,
    deployments.PropertyRegistry,
    deployments.TokenFactory,
    deployments.RedemptionManager,
    deployments.RentDistributor,
    deployments.Marketplace,
    deployments.TokenHolderQuery
  );
  console.log("系统合约地址已设置");

  // 设置初始角色
  console.log("设置初始角色...");
  const roles = getRoles();
  const superAdminAddress = getEnv("SUPER_ADMIN_ADDRESS");
  const propertyManagerAddress = getEnv("PROPERTY_MANAGER_ADDRESS");
  const feeCollectorAddress = getEnv("FEE_COLLECTOR_ADDRESS");
  
  if (superAdminAddress) {
    await roleManager.grantRole(roles.SUPER_ADMIN, superAdminAddress);
    console.log(`超级管理员角色已设置: ${superAdminAddress}`);
  }
  
  if (propertyManagerAddress) {
    await roleManager.grantRole(roles.PROPERTY_MANAGER, propertyManagerAddress);
    console.log(`房产管理员角色已设置: ${propertyManagerAddress}`);
  }
  
  if (feeCollectorAddress) {
    await roleManager.grantRole(roles.FEE_COLLECTOR, feeCollectorAddress);
    console.log(`费用收集者角色已设置: ${feeCollectorAddress}`);
  }

  // 设置初始费用
  console.log("设置初始费用...");
  const tradingFee = parseInt(getEnv("TRADING_FEE", "50"));
  const tokenizationFee = parseInt(getEnv("TOKENIZATION_FEE", "100"));
  const redemptionFee = parseInt(getEnv("REDEMPTION_FEE", "30"));
  const platformFee = parseInt(getEnv("PLATFORM_FEE", "20"));
  
  await feeManager.updateFee("trading", tradingFee);
  await feeManager.updateFee("tokenization", tokenizationFee);
  await feeManager.updateFee("redemption", redemptionFee);
  await feeManager.updateFee("platform", platformFee);
  console.log("系统费用已设置");

  // 激活系统
  console.log("激活系统...");
  await realEstateSystem.setSystemStatus(true);
  console.log("系统已激活");

  console.log("系统初始化完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });