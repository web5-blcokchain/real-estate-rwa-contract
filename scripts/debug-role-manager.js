/**
 * RoleManager合约调试脚本
 * 用于检查RoleManager合约的状态并提供错误原因
 */
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getLogger } = require("./utils/logger");

const logger = getLogger("debug-role-manager");

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
    
    // 连接到RoleManager合约
    const roleManagerAddress = deploymentData.contracts.RoleManager;
    logger.info(`连接到RoleManager合约: ${roleManagerAddress}`);
    
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManager = await RoleManager.attach(roleManagerAddress);
    
    // 打印基本信息
    logger.info("---- RoleManager合约状态 ----");
    
    // 获取角色常数
    const DEFAULT_ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    const PROPERTY_MANAGER = await roleManager.PROPERTY_MANAGER();
    const FEE_COLLECTOR = await roleManager.FEE_COLLECTOR();
    
    logger.info(`DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);
    logger.info(`SUPER_ADMIN: ${SUPER_ADMIN}`);
    logger.info(`PROPERTY_MANAGER: ${PROPERTY_MANAGER}`);
    logger.info(`FEE_COLLECTOR: ${FEE_COLLECTOR}`);
    
    // 检查部署者的角色状态
    logger.info(`部署者 (${deployer.address}) 的角色状态:`);
    logger.info(`- DEFAULT_ADMIN_ROLE: ${await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)}`);
    logger.info(`- SUPER_ADMIN: ${await roleManager.hasRole(SUPER_ADMIN, deployer.address)}`);
    logger.info(`- PROPERTY_MANAGER: ${await roleManager.hasRole(PROPERTY_MANAGER, deployer.address)}`);
    logger.info(`- FEE_COLLECTOR: ${await roleManager.hasRole(FEE_COLLECTOR, deployer.address)}`);
    
    // 检查合约自身的角色状态
    logger.info(`RoleManager合约自身 (${roleManagerAddress}) 的角色状态:`);
    logger.info(`- DEFAULT_ADMIN_ROLE: ${await roleManager.hasRole(DEFAULT_ADMIN_ROLE, roleManagerAddress)}`);
    logger.info(`- SUPER_ADMIN: ${await roleManager.hasRole(SUPER_ADMIN, roleManagerAddress)}`);
    
    // 尝试读取部署日志，看编译时的具体配置
    const deploymentLogs = path.join(__dirname, "../logs");
    if (fs.existsSync(deploymentLogs)) {
      // 尝试读取最新日志
      const logFiles = fs.readdirSync(deploymentLogs).filter(f => f.startsWith('deploy')).sort();
      if (logFiles.length > 0) {
        const latestLog = path.join(deploymentLogs, logFiles[logFiles.length - 1]);
        logger.info(`最新部署日志: ${latestLog}`);
      } else {
        logger.info("未找到部署日志");
      }
    }
    
    // 尝试部署一个全新的RoleManager实例用于测试
    logger.info("部署一个新的RoleManager实例用于测试...");
    const testRoleManager = await RoleManager.deploy();
    await testRoleManager.deployed();
    
    // 初始化测试实例
    await testRoleManager.initialize();
    logger.info(`测试RoleManager部署在: ${testRoleManager.address}`);
    
    // 检查测试实例的状态
    logger.info(`测试实例状态:`);
    logger.info(`- 部署者是否有DEFAULT_ADMIN_ROLE: ${await testRoleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)}`);
    logger.info(`- 部署者是否有SUPER_ADMIN: ${await testRoleManager.hasRole(SUPER_ADMIN, deployer.address)}`);
    
    if (await testRoleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)) {
      logger.info("测试实例中部署者有正确的DEFAULT_ADMIN_ROLE");
      
      // 检查是否可以给部署者授予SUPER_ADMIN角色
      if (!await testRoleManager.hasRole(SUPER_ADMIN, deployer.address)) {
        logger.info("尝试在测试实例中授予SUPER_ADMIN角色");
        await testRoleManager.grantRole(SUPER_ADMIN, deployer.address);
        logger.info(`授予后状态: ${await testRoleManager.hasRole(SUPER_ADMIN, deployer.address)}`);
      }
    }
    
    // 提供完整解决方案
    logger.info("\n---- 问题分析和解决方案 ----");
    logger.info("问题: 部署者在RoleManager合约中没有任何权限，无法授予SUPER_ADMIN角色");
    
    if (await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)) {
      logger.info("解决方案: 部署者拥有所需权限，可以直接授予SUPER_ADMIN角色");
      logger.info("运行: npx hardhat run scripts/grant-roles.js --network localhost");
    } else {
      logger.info("解决方案选项:");
      logger.info("1. 在Hardhat节点上重新部署系统，使用修改后的deploy-unified.js脚本");
      logger.info("2. 为解决这个特定环境上的问题，可以:");
      logger.info("   a. 使用fork修改链状态直接授予权限");
      logger.info("   b. 重新部署RoleManager合约");
      logger.info("   c. 创建一个RoleManagerFix合约，根据现有状态修复权限问题");
      
      logger.info("\n推荐操作: 在本地测试环境重新部署系统，确保初始化正确");
      logger.info("重新部署命令: npx hardhat node (在另一个终端) 然后:");
      logger.info("npx hardhat run scripts/deploy-unified.js --network localhost");
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