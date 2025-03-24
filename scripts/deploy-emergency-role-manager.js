// deploy-emergency-role-manager.js
// 升级RoleManager合约到具有紧急恢复功能的新版本
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");

// 设置日志记录器
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] [emergency-deploy] ${message}`;
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
  const roleManagerAddress = deployment.contracts.RoleManager;
  
  logger.info(`当前RoleManager合约地址: ${roleManagerAddress}`);
  
  // 编译新的RoleManager合约
  logger.info("编译RoleManager合约...");
  const RoleManagerFactory = await ethers.getContractFactory("RoleManager");
  
  // 准备升级代理合约
  logger.info("准备升级RoleManager合约...");
  
  try {
    // 升级合约
    const upgradedRoleManager = await upgrades.upgradeProxy(roleManagerAddress, RoleManagerFactory);
    await upgradedRoleManager.deployed();
    
    logger.info(`RoleManager合约已成功升级: ${upgradedRoleManager.address}`);
    
    // 等待一段时间确保交易被确认
    logger.info("等待交易确认...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 检查部署者是否有DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = await upgradedRoleManager.DEFAULT_ADMIN_ROLE();
    const SUPER_ADMIN_ROLE = await upgradedRoleManager.SUPER_ADMIN();
    
    logger.info("检查部署者权限...");
    const hasAdminRole = await upgradedRoleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    logger.info(`部署者是否有DEFAULT_ADMIN_ROLE: ${hasAdminRole}`);
    
    // 如果没有权限，调用紧急恢复函数
    if (!hasAdminRole) {
      logger.info("调用紧急恢复函数...");
      const tx = await upgradedRoleManager.emergencyRecoverAdmin();
      await tx.wait();
      
      // 再次检查权限
      const hasAdminRoleNow = await upgradedRoleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      logger.info(`部署者现在是否有DEFAULT_ADMIN_ROLE: ${hasAdminRoleNow}`);
      
      if (hasAdminRoleNow) {
        logger.info("紧急恢复成功！");
      } else {
        logger.error("紧急恢复失败，请检查合约代码");
      }
    }
    
    // 检查SUPER_ADMIN权限
    const hasSuperAdminRole = await upgradedRoleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
    logger.info(`部署者是否有SUPER_ADMIN角色: ${hasSuperAdminRole}`);
    
    if (!hasSuperAdminRole && hasAdminRole) {
      logger.info("授予部署者SUPER_ADMIN角色...");
      await upgradedRoleManager.grantRole(SUPER_ADMIN_ROLE, deployer.address);
      logger.info("SUPER_ADMIN角色授予成功");
    }
    
    logger.info("RoleManager合约升级和权限恢复完成!");
    
  } catch (error) {
    logger.error(`升级失败: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
    
    // 如果是UUPS升级问题，尝试其他方法
    if (error.message.includes("function selector was not recognized")) {
      logger.info("尝试部署新的RoleManager合约...");
      
      const newRoleManager = await RoleManagerFactory.deploy();
      await newRoleManager.deployed();
      
      logger.info(`新RoleManager合约已部署: ${newRoleManager.address}`);
      logger.info("请手动初始化新合约并更新系统中的引用");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 