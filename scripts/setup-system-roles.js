// setup-system-roles.js
// 在恢复RoleManager权限后配置系统各组件的角色
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");

// 设置日志记录器
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] [setup-roles] ${message}`;
    })
  ),
  transports: [new transports.Console()],
});

// 获取最新部署信息
function getLatestDeployment() {
  const deploymentsPath = path.join(__dirname, "../deployments");
  const files = fs.readdirSync(deploymentsPath);
  
  // 按时间排序，选择最新的部署文件
  const deploymentFiles = files.filter(file => file.startsWith("deployment-") && file.endsWith(".json"));
  if (deploymentFiles.length === 0) {
    throw new Error("找不到部署文件");
  }
  
  deploymentFiles.sort((a, b) => {
    const timeA = new Date(a.replace("deployment-", "").replace(".json", ""));
    const timeB = new Date(b.replace("deployment-", "").replace(".json", ""));
    return timeB - timeA;
  });
  
  const latestDeploymentPath = path.join(deploymentsPath, deploymentFiles[0]);
  logger.info(`读取最新部署文件: ${latestDeploymentPath}`);
  
  return JSON.parse(fs.readFileSync(latestDeploymentPath, "utf8"));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = await deployer.getChainId();
  const networkName = `chain-${chainId}`;
  
  logger.info(`网络: ${networkName}, 部署者: ${deployer.address}`);
  
  // 获取最新部署信息
  const deployment = getLatestDeployment();
  const contracts = deployment.contracts;
  
  // 获取各个合约地址
  const roleManagerAddress = contracts.RoleManager;
  const propertyRegistryAddress = contracts.PropertyRegistry;
  const feeManagerAddress = contracts.FeeManager;
  const marketplaceAddress = contracts.Marketplace;
  const redemptionManagerAddress = contracts.RedemptionManager;
  const rentDistributorAddress = contracts.RentDistributor;
  const tokenFactoryAddress = contracts.TokenFactory;
  
  logger.info(`RoleManager地址: ${roleManagerAddress}`);
  
  // 连接RoleManager合约
  const roleManager = await ethers.getContractAt("RoleManager", roleManagerAddress);
  
  // 获取角色常量
  const DEFAULT_ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
  const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
  const PROPERTY_MANAGER = await roleManager.PROPERTY_MANAGER();
  const TOKEN_MANAGER = await roleManager.TOKEN_MANAGER();
  const MARKETPLACE_MANAGER = await roleManager.MARKETPLACE_MANAGER();
  const FEE_MANAGER = await roleManager.FEE_MANAGER();
  const REDEMPTION_MANAGER = await roleManager.REDEMPTION_MANAGER();
  
  // 检查部署者权限
  const hasAdminRole = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  logger.info(`部署者是否有DEFAULT_ADMIN_ROLE: ${hasAdminRole}`);
  
  const hasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN, deployer.address);
  logger.info(`部署者是否有SUPER_ADMIN: ${hasSuperAdmin}`);
  
  if (!hasAdminRole || !hasSuperAdmin) {
    logger.error("部署者权限不足，无法设置系统角色，请先运行deploy-emergency-role-manager.js恢复权限");
    return;
  }
  
  logger.info("开始设置系统角色...");
  
  // 授予PropertyRegistry对应角色
  logger.info(`为PropertyRegistry(${propertyRegistryAddress})授予PROPERTY_MANAGER角色...`);
  if (!(await roleManager.hasRole(PROPERTY_MANAGER, propertyRegistryAddress))) {
    const tx1 = await roleManager.grantRole(PROPERTY_MANAGER, propertyRegistryAddress);
    await tx1.wait();
    logger.info("PropertyRegistry角色授予成功");
  } else {
    logger.info("PropertyRegistry已有PROPERTY_MANAGER角色");
  }
  
  // 授予Marketplace对应角色
  logger.info(`为Marketplace(${marketplaceAddress})授予MARKETPLACE_MANAGER角色...`);
  if (!(await roleManager.hasRole(MARKETPLACE_MANAGER, marketplaceAddress))) {
    const tx2 = await roleManager.grantRole(MARKETPLACE_MANAGER, marketplaceAddress);
    await tx2.wait();
    logger.info("Marketplace角色授予成功");
  } else {
    logger.info("Marketplace已有MARKETPLACE_MANAGER角色");
  }
  
  // 授予RedemptionManager对应角色
  logger.info(`为RedemptionManager(${redemptionManagerAddress})授予REDEMPTION_MANAGER角色...`);
  if (!(await roleManager.hasRole(REDEMPTION_MANAGER, redemptionManagerAddress))) {
    const tx3 = await roleManager.grantRole(REDEMPTION_MANAGER, redemptionManagerAddress);
    await tx3.wait();
    logger.info("RedemptionManager角色授予成功");
  } else {
    logger.info("RedemptionManager已有REDEMPTION_MANAGER角色");
  }
  
  // 授予FeeManager对应角色
  logger.info(`为FeeManager(${feeManagerAddress})授予FEE_MANAGER角色...`);
  if (!(await roleManager.hasRole(FEE_MANAGER, feeManagerAddress))) {
    const tx4 = await roleManager.grantRole(FEE_MANAGER, feeManagerAddress);
    await tx4.wait();
    logger.info("FeeManager角色授予成功");
  } else {
    logger.info("FeeManager已有FEE_MANAGER角色");
  }
  
  // 授予TokenFactory对应角色
  logger.info(`为TokenFactory(${tokenFactoryAddress})授予TOKEN_MANAGER角色...`);
  if (!(await roleManager.hasRole(TOKEN_MANAGER, tokenFactoryAddress))) {
    const tx5 = await roleManager.grantRole(TOKEN_MANAGER, tokenFactoryAddress);
    await tx5.wait();
    logger.info("TokenFactory角色授予成功");
  } else {
    logger.info("TokenFactory已有TOKEN_MANAGER角色");
  }
  
  // 授予RentDistributor对应角色
  logger.info(`为RentDistributor(${rentDistributorAddress})授予PROPERTY_MANAGER角色...`);
  if (!(await roleManager.hasRole(PROPERTY_MANAGER, rentDistributorAddress))) {
    const tx6 = await roleManager.grantRole(PROPERTY_MANAGER, rentDistributorAddress);
    await tx6.wait();
    logger.info("RentDistributor角色授予成功");
  } else {
    logger.info("RentDistributor已有PROPERTY_MANAGER角色");
  }
  
  logger.info("系统角色设置完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 