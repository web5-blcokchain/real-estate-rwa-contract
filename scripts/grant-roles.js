/**
 * 系统角色授权脚本
 * 用于在RoleManager正确部署和初始化后，为各合约授予适当的角色权限
 */
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getLogger } = require("./utils/logger");

const logger = getLogger("grant-roles");

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
    if (!roleManagerAddress) {
      logger.error("部署记录中没有RoleManager地址");
      return;
    }
    
    logger.info(`连接到RoleManager合约: ${roleManagerAddress}`);
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManager = await RoleManager.attach(roleManagerAddress);
    
    // 获取角色常数
    const DEFAULT_ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    const PROPERTY_MANAGER = await roleManager.PROPERTY_MANAGER();
    const FEE_COLLECTOR = await roleManager.FEE_COLLECTOR();
    
    // 检查部署者的权限
    const hasDefaultAdmin = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    if (!hasDefaultAdmin) {
      logger.error("部署者没有DEFAULT_ADMIN_ROLE权限，请先运行修复脚本");
      logger.error("执行: npx hardhat run scripts/fix-role-manager.js --network localhost");
      return;
    }
    
    logger.info("部署者拥有DEFAULT_ADMIN_ROLE权限，开始授予其他角色...");
    
    // 授予部署者SUPER_ADMIN角色（如果还没有）
    if (!await roleManager.hasRole(SUPER_ADMIN, deployer.address)) {
      logger.info("授予部署者SUPER_ADMIN角色...");
      await roleManager.grantRole(SUPER_ADMIN, deployer.address);
      logger.info(`授予完成，状态: ${await roleManager.hasRole(SUPER_ADMIN, deployer.address)}`);
    } else {
      logger.info("部署者已拥有SUPER_ADMIN角色");
    }
    
    // 授予部署者PROPERTY_MANAGER角色（如果还没有）
    if (!await roleManager.hasRole(PROPERTY_MANAGER, deployer.address)) {
      logger.info("授予部署者PROPERTY_MANAGER角色...");
      await roleManager.grantRole(PROPERTY_MANAGER, deployer.address);
      logger.info(`授予完成，状态: ${await roleManager.hasRole(PROPERTY_MANAGER, deployer.address)}`);
    } else {
      logger.info("部署者已拥有PROPERTY_MANAGER角色");
    }
    
    // 授予部署者FEE_COLLECTOR角色（如果还没有）
    if (!await roleManager.hasRole(FEE_COLLECTOR, deployer.address)) {
      logger.info("授予部署者FEE_COLLECTOR角色...");
      await roleManager.grantRole(FEE_COLLECTOR, deployer.address);
      logger.info(`授予完成，状态: ${await roleManager.hasRole(FEE_COLLECTOR, deployer.address)}`);
    } else {
      logger.info("部署者已拥有FEE_COLLECTOR角色");
    }
    
    // 为各个合约授予所需的角色
    logger.info("为系统合约授予所需角色权限...");
    
    // 为SystemDeployer授予SUPER_ADMIN角色
    if (deploymentData.contracts.SystemDeployer) {
      const systemDeployerAddr = deploymentData.contracts.SystemDeployer;
      logger.info(`为SystemDeployer(${systemDeployerAddr})授予SUPER_ADMIN角色...`);
      
      if (!await roleManager.hasRole(SUPER_ADMIN, systemDeployerAddr)) {
        await roleManager.grantRole(SUPER_ADMIN, systemDeployerAddr);
        logger.info(`授予完成，状态: ${await roleManager.hasRole(SUPER_ADMIN, systemDeployerAddr)}`);
      } else {
        logger.info("SystemDeployer已拥有SUPER_ADMIN角色");
      }
    }
    
    // 为PropertyRegistry授予PROPERTY_MANAGER角色
    if (deploymentData.contracts.PropertyRegistry) {
      const propertyRegistryAddr = deploymentData.contracts.PropertyRegistry;
      logger.info(`为PropertyRegistry(${propertyRegistryAddr})授予PROPERTY_MANAGER角色...`);
      
      if (!await roleManager.hasRole(PROPERTY_MANAGER, propertyRegistryAddr)) {
        await roleManager.grantRole(PROPERTY_MANAGER, propertyRegistryAddr);
        logger.info(`授予完成，状态: ${await roleManager.hasRole(PROPERTY_MANAGER, propertyRegistryAddr)}`);
      } else {
        logger.info("PropertyRegistry已拥有PROPERTY_MANAGER角色");
      }
    }
    
    // 为FeeManager授予FEE_COLLECTOR角色
    if (deploymentData.contracts.FeeManager) {
      const feeManagerAddr = deploymentData.contracts.FeeManager;
      logger.info(`为FeeManager(${feeManagerAddr})授予FEE_COLLECTOR角色...`);
      
      if (!await roleManager.hasRole(FEE_COLLECTOR, feeManagerAddr)) {
        await roleManager.grantRole(FEE_COLLECTOR, feeManagerAddr);
        logger.info(`授予完成，状态: ${await roleManager.hasRole(FEE_COLLECTOR, feeManagerAddr)}`);
      } else {
        logger.info("FeeManager已拥有FEE_COLLECTOR角色");
      }
    }
    
    // 为RealEstateSystem授予SUPER_ADMIN角色
    if (deploymentData.contracts.RealEstateSystem) {
      const realEstateSystemAddr = deploymentData.contracts.RealEstateSystem;
      logger.info(`为RealEstateSystem(${realEstateSystemAddr})授予SUPER_ADMIN角色...`);
      
      if (!await roleManager.hasRole(SUPER_ADMIN, realEstateSystemAddr)) {
        await roleManager.grantRole(SUPER_ADMIN, realEstateSystemAddr);
        logger.info(`授予完成，状态: ${await roleManager.hasRole(SUPER_ADMIN, realEstateSystemAddr)}`);
      } else {
        logger.info("RealEstateSystem已拥有SUPER_ADMIN角色");
      }
    }
    
    logger.info("✅ 所有角色授权完成！");
    logger.info("系统现在可以继续部署其余步骤或进行验证");
    
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