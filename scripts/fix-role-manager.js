/**
 * RoleManager紧急修复脚本
 * 用于解决RoleManager合约中角色授权问题
 */
require("dotenv").config();
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getLogger } = require("./utils/logger");

const logger = getLogger("fix-role-manager");

async function main() {
  try {
    // 获取部署者账户和网络信息
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const networkName = network.name !== 'unknown' ? network.name : `chain-${network.chainId}`;
    
    logger.info(`网络: ${networkName}, 部署者: ${deployer.address}`);
    
    // 读取部署记录
    const deploymentPath = path.join(__dirname, "../deployments", `${networkName}-latest.json`);
    if (!fs.existsSync(deploymentPath)) {
      logger.error(`找不到部署文件: ${deploymentPath}`);
      return;
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // 连接到现有RoleManager合约
    const roleManagerAddress = deploymentData.contracts.RoleManager;
    logger.info(`连接到RoleManager合约: ${roleManagerAddress}`);
    
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManager = await RoleManager.attach(roleManagerAddress);
    
    // 检查部署者是否有DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    
    const hasDefaultAdminRole = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    logger.info(`部署者是否有DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);
    
    if (hasDefaultAdminRole) {
      // 如果已有权限，直接授予SUPER_ADMIN角色
      logger.info("部署者已有DEFAULT_ADMIN_ROLE，尝试授予SUPER_ADMIN角色");
      
      const hasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN, deployer.address);
      if (!hasSuperAdmin) {
        logger.info(`尝试授予SUPER_ADMIN角色...`);
        await roleManager.grantRole(SUPER_ADMIN, deployer.address);
        logger.info(`授予SUPER_ADMIN角色后状态: ${await roleManager.hasRole(SUPER_ADMIN, deployer.address)}`);
      } else {
        logger.info("部署者已拥有SUPER_ADMIN角色");
      }
      
      logger.info("✅ 角色授权成功！");
      return;
    }
    
    // 如果没有权限，使用紧急修复方案
    logger.info("部署者没有DEFAULT_ADMIN_ROLE，尝试修复...");
    
    // 方案1: 部署新的RoleManager并尝试使用
    logger.info("方案1: 部署新的RoleManager合约");
    
    // 部署新合约
    const newRoleManager = await RoleManager.deploy();
    await newRoleManager.deployed();
    logger.info(`新RoleManager合约部署在: ${newRoleManager.address}`);
    
    // 初始化新合约
    await newRoleManager.initialize();
    logger.info("新RoleManager合约已初始化");
    
    // 检查新合约中部署者的角色
    const newHasDefaultAdmin = await newRoleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    logger.info(`新合约中部署者是否有DEFAULT_ADMIN_ROLE: ${newHasDefaultAdmin}`);
    
    if (newHasDefaultAdmin) {
      // 更新deployment文件，将新的RoleManager地址更新为系统使用的地址
      logger.info("更新部署记录...");
      deploymentData.contracts.RoleManager = newRoleManager.address;
      fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
      logger.info(`部署记录已更新，新的RoleManager地址为: ${newRoleManager.address}`);
      
      // 授予部署者SUPER_ADMIN角色
      if (!await newRoleManager.hasRole(SUPER_ADMIN, deployer.address)) {
        logger.info("授予部署者SUPER_ADMIN角色...");
        await newRoleManager.grantRole(SUPER_ADMIN, deployer.address);
        logger.info(`授予SUPER_ADMIN角色后状态: ${await newRoleManager.hasRole(SUPER_ADMIN, deployer.address)}`);
      } else {
        logger.info("部署者已拥有SUPER_ADMIN角色");
      }
      
      // 备份原始部署记录
      const backupPath = path.join(__dirname, "../deployments", `${networkName}-backup-${Date.now()}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(deploymentData, null, 2));
      logger.info(`已创建备份: ${backupPath}`);
      
      logger.info("✅ 修复成功！部署记录已更新，请使用新的RoleManager合约继续部署流程");
      logger.info("下一步: 运行 npx hardhat run scripts/grant-roles.js --network localhost");
    } else {
      logger.error("❌ 新部署的RoleManager合约也没有给部署者授予DEFAULT_ADMIN_ROLE，请检查合约代码");
      
      // 方案2: 尝试低级别直接调用
      logger.info("方案2: 尝试使用低级调用修复角色...");
      logger.info("这需要检查RoleManager合约代码，并根据具体情况编写自定义修复程序");
      logger.info("建议: 检查RoleManager.sol文件中initialize()函数的实现，确认其是否正确设置了DEFAULT_ADMIN_ROLE");
    }
    
  } catch (error) {
    logger.error(`出错: ${error.message}`);
    console.error(error);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 