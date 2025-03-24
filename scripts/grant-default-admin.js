/**
 * 手动授予DEFAULT_ADMIN_ROLE角色脚本
 * 用于在RoleManager合约中授予DEFAULT_ADMIN_ROLE权限
 */
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getLogger } = require("./utils/logger");

const logger = getLogger("grant-default-admin");

async function main() {
  try {
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info(`使用账户: ${deployer.address}`);
    
    // 读取最新部署信息
    const networkName = (await ethers.provider.getNetwork()).name !== 'unknown' 
      ? (await ethers.provider.getNetwork()).name 
      : `chain-${await deployer.getChainId()}`;
    
    const deploymentPath = path.join(__dirname, "../deployments", `${networkName}-latest.json`);
    
    if (!fs.existsSync(deploymentPath)) {
      logger.error(`找不到部署文件: ${deploymentPath}`);
      logger.info("请先运行部署脚本");
      return;
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    logger.info(`读取部署文件: ${deploymentPath}`);
    
    // 连接到RoleManager合约
    const roleManagerAddress = deploymentData.contracts.RoleManager;
    logger.info(`RoleManager地址: ${roleManagerAddress}`);
    
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManager = await RoleManager.attach(roleManagerAddress);
    
    // 获取当前DEFAULT_ADMIN_ROLE管理员
    const DEFAULT_ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
    logger.info(`DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);
    
    // 获取SUPER_ADMIN角色
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    logger.info(`SUPER_ADMIN角色ID: ${SUPER_ADMIN}`);
    
    // 检查部署者是否已经有DEFAULT_ADMIN_ROLE
    const hasDefaultAdmin = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    logger.info(`部署者是否已有DEFAULT_ADMIN_ROLE: ${hasDefaultAdmin}`);
    
    if (hasDefaultAdmin) {
      logger.info("部署者已经拥有DEFAULT_ADMIN_ROLE");
    } else {
      logger.info("部署者没有DEFAULT_ADMIN_ROLE，尝试直接授予...");
      
      // 尝试直接部署一个新的RoleManager实现来授予角色
      logger.info("部署新的RoleManager实现");
      const newRoleManagerImpl = await RoleManager.deploy();
      await newRoleManagerImpl.deployed();
      logger.info(`新的RoleManager实现地址: ${newRoleManagerImpl.address}`);
      
      // 初始化新实现
      await newRoleManagerImpl.initialize();
      logger.info("新的RoleManager实现已初始化");
      
      // 验证部署者在新实现中有DEFAULT_ADMIN_ROLE
      const hasRoleInNew = await newRoleManagerImpl.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      logger.info(`部署者在新实现中是否有DEFAULT_ADMIN_ROLE: ${hasRoleInNew}`);
      
      if (!hasRoleInNew) {
        logger.error("部署者在新实现中也没有DEFAULT_ADMIN_ROLE，无法继续");
        return;
      }
      
      // 获取RoleManager合约的管理员地址
      // 注意：对于透明代理，我们需要找到管理员地址
      const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
      const proxyAdminAddress = await ethers.provider.getStorageAt(
        roleManagerAddress, 
        "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"
      );
      
      const parsed = ethers.utils.defaultAbiCoder.decode(['address'], proxyAdminAddress);
      const adminAddress = parsed[0];
      
      if (adminAddress === ethers.constants.AddressZero) {
        logger.error("无法获取代理管理员地址");
        return;
      }
      
      logger.info(`代理管理员地址: ${adminAddress}`);
      
      // 检查部署者是否是管理员
      if (adminAddress.toLowerCase() === deployer.address.toLowerCase()) {
        logger.info("部署者是代理管理员，尝试升级代理");
        
        // 直接升级实现
        const ERC1967ProxyInterface = new ethers.utils.Interface([
          "function upgradeTo(address newImplementation)"
        ]);
        
        const upgradeCalldata = ERC1967ProxyInterface.encodeFunctionData(
          "upgradeTo",
          [newRoleManagerImpl.address]
        );
        
        // 发送升级交易
        const upgradeTx = await deployer.sendTransaction({
          to: roleManagerAddress,
          data: upgradeCalldata
        });
        
        await upgradeTx.wait();
        logger.info(`代理升级成功，交易哈希: ${upgradeTx.hash}`);
      } else {
        logger.error("部署者不是代理管理员，无法升级代理");
        logger.info("尝试最后一种方式：直接从管理员授予角色");
        
        // 尝试直接调用grantRole函数
        try {
          const tx = await roleManager.grantRole(DEFAULT_ADMIN_ROLE, deployer.address);
          await tx.wait();
          logger.info(`授予DEFAULT_ADMIN_ROLE成功，交易哈希: ${tx.hash}`);
        } catch (error) {
          logger.error(`授予DEFAULT_ADMIN_ROLE失败: ${error.message}`);
          logger.error("无法授予DEFAULT_ADMIN_ROLE，可能需要修改合约代码或手动访问管理员账户");
          return;
        }
      }
    }
    
    // 再次检查部署者是否有DEFAULT_ADMIN_ROLE
    const hasDefaultAdminAfter = await roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    logger.info(`验证：部署者是否有DEFAULT_ADMIN_ROLE: ${hasDefaultAdminAfter}`);
    
    if (hasDefaultAdminAfter) {
      logger.info("✓ DEFAULT_ADMIN_ROLE授予成功");
      
      // 给SUPER_ADMIN角色
      if (await roleManager.hasRole(SUPER_ADMIN, deployer.address)) {
        logger.info("部署者已经拥有SUPER_ADMIN角色");
      } else {
        logger.info("授予部署者SUPER_ADMIN角色");
        const tx = await roleManager.grantRole(SUPER_ADMIN, deployer.address);
        await tx.wait();
        logger.info(`授予SUPER_ADMIN成功，交易哈希: ${tx.hash}`);
      }
      
      // 验证SUPER_ADMIN
      const hasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN, deployer.address);
      logger.info(`验证：部署者是否有SUPER_ADMIN角色: ${hasSuperAdmin}`);
      
      if (hasSuperAdmin) {
        logger.info("✓ SUPER_ADMIN角色授予成功");
      } else {
        logger.error("✗ SUPER_ADMIN角色授予失败");
      }
    } else {
      logger.error("✗ DEFAULT_ADMIN_ROLE授予失败");
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