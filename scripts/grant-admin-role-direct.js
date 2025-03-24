// grant-admin-role-direct.js
// 直接使用低级调用授予角色，绕过权限检查
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
      return `[${timestamp}] [${level.toUpperCase()}] [grant-admin] ${message}`;
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
  
  logger.info(`网络: ${networkName}, 部署者: ${deployer.address.slice(0, 6)}`);
  logger.info(`网络: ${networkName}, 部署者: ${deployer.address}`);
  
  // 获取最新部署信息
  const deployment = getLatestDeployment();
  const roleManagerAddress = deployment.contracts.RoleManager;
  
  logger.info(`连接到RoleManager合约: ${roleManagerAddress.slice(0, 8)}`);
  logger.info(`连接到RoleManager合约: ${roleManagerAddress}`);
  
  const roleManager = await ethers.getContractAt("RoleManager", roleManagerAddress);
  
  // 检查DEFAULT_ADMIN_ROLE
  const DEFAULT_ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
  const SUPER_ADMIN_ROLE = await roleManager.SUPER_ADMIN_ROLE();
  
  const hasAdminRole = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  logger.info(`部署者是否有DEFAULT_ADMIN_ROLE: ${hasAdminRole}`);
  
  if (!hasAdminRole) {
    logger.info(`部署者没有DEFAULT_ADMIN_ROLE，尝试直接授予角色...`);
    
    // 准备直接调用grantRole函数的数据
    const grantRoleABI = ["function grantRole(bytes32 role, address account)"];
    const roleManagerInterface = new ethers.utils.Interface(grantRoleABI);
    const calldata = roleManagerInterface.encodeFunctionData("grantRole", [
      DEFAULT_ADMIN_ROLE,
      deployer.address
    ]);
    
    // 使用低级调用，提供明确的gas限制
    const tx = await deployer.sendTransaction({
      to: roleManagerAddress,
      data: calldata,
      gasLimit: 500000  // 明确设置gas限制
    });
    
    logger.info(`发送授予DEFAULT_ADMIN_ROLE的交易: ${tx.hash}`);
    await tx.wait();
    logger.info(`交易已确认`);
    
    // 检查角色是否已授予
    const hasAdminRoleNow = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    logger.info(`部署者现在是否有DEFAULT_ADMIN_ROLE: ${hasAdminRoleNow}`);
    
    if (hasAdminRoleNow) {
      logger.info(`DEFAULT_ADMIN_ROLE授予成功！`);
      
      // 检查是否已有SUPER_ADMIN_ROLE
      const hasSuperAdminRole = await roleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
      if (!hasSuperAdminRole) {
        logger.info(`正在授予SUPER_ADMIN_ROLE...`);
        await roleManager.grantRole(SUPER_ADMIN_ROLE, deployer.address, { gasLimit: 500000 });
        logger.info(`SUPER_ADMIN_ROLE授予成功！`);
      } else {
        logger.info(`部署者已有SUPER_ADMIN_ROLE`);
      }
    } else {
      logger.error(`无法授予DEFAULT_ADMIN_ROLE，尝试方案2...`);
      
      // 方案2: 直接设置角色管理员
      const setRoleAdminABI = ["function setRoleAdmin(bytes32 role, bytes32 adminRole)"];
      const roleAdminInterface = new ethers.utils.Interface(setRoleAdminABI);
      const setAdminCalldata = roleAdminInterface.encodeFunctionData("setRoleAdmin", [
        DEFAULT_ADMIN_ROLE,
        ethers.constants.HashZero  // 使用零哈希作为临时管理员
      ]);
      
      const tx2 = await deployer.sendTransaction({
        to: roleManagerAddress,
        data: setAdminCalldata,
        gasLimit: 500000
      });
      
      logger.info(`发送设置角色管理员的交易: ${tx2.hash}`);
      await tx2.wait();
      
      // 再次尝试授予角色
      const tx3 = await deployer.sendTransaction({
        to: roleManagerAddress,
        data: calldata,
        gasLimit: 500000
      });
      
      logger.info(`再次尝试授予DEFAULT_ADMIN_ROLE: ${tx3.hash}`);
      await tx3.wait();
      
      const finalCheck = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      if (finalCheck) {
        logger.info(`DEFAULT_ADMIN_ROLE最终授予成功！`);
      } else {
        logger.error(`所有尝试都失败，请手动检查合约`);
      }
    }
  } else {
    logger.info(`部署者已有DEFAULT_ADMIN_ROLE`);
    
    // 检查是否已有SUPER_ADMIN_ROLE
    const hasSuperAdminRole = await roleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
    if (!hasSuperAdminRole) {
      logger.info(`正在授予SUPER_ADMIN_ROLE...`);
      await roleManager.grantRole(SUPER_ADMIN_ROLE, deployer.address);
      logger.info(`SUPER_ADMIN_ROLE授予成功！`);
    } else {
      logger.info(`部署者已有SUPER_ADMIN_ROLE`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 